package com.erppos.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.net.LocalServerSocket
import android.net.LocalSocket
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import com.erppos.Constants
import com.erppos.MainActivity
import com.erppos.util.EntryNotifier
import com.erppos.util.JsonParser
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Web POS Connect USB → bridge-server → adb forward tcp:8765 → localabstract:erppos_adb
 * Protocol: "PING\\n" → "OK\\n" | JSON order + "\\n" → "OK\\n" | invalid → "ERR\\n"
 */
class AdbTcpReceiverService : Service() {
    private val running = AtomicBoolean(false)
    private var serverSocket: LocalServerSocket? = null
    private var acceptThread: Thread? = null
    private val mainHandler = Handler(Looper.getMainLooper())

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForegroundCompat(getString(com.erppos.R.string.adb_notification_starting))
        synchronized(this) {
            if (running.get() && acceptThread?.isAlive == true) {
                updateNotification(getString(com.erppos.R.string.adb_notification_ready))
                Log.d(TAG, "onStartCommand: listener already active on $ADB_SOCKET_NAME")
                return START_STICKY
            }
            running.set(true)
            acceptThread = Thread({ acceptLoop() }, "erppos-adb-accept").also { it.start() }
            Log.d(TAG, "onStartCommand: starting listener")
        }
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        stopListener()
        super.onDestroy()
    }

    private fun stopListener() {
        running.set(false)
        try {
            serverSocket?.close()
        } catch (_: Exception) {
            // already closed
        }
        serverSocket = null
        acceptThread?.interrupt()
        acceptThread = null
        Log.d(TAG, "stopListener: stopped")
    }

    private fun acceptLoop() {
        try {
            val socket = LocalServerSocket(ADB_SOCKET_NAME)
            serverSocket = socket
            updateNotification(getString(com.erppos.R.string.adb_notification_ready))
            Log.i(TAG, "acceptLoop: listening localabstract:$ADB_SOCKET_NAME")
            while (running.get()) {
                try {
                    handleClient(socket.accept())
                } catch (_: Exception) {
                    if (!running.get()) break
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "acceptLoop failed: ${e.message}", e)
            updateNotification(
                getString(com.erppos.R.string.adb_notification_failed, e.message ?: "unknown error"),
            )
        } finally {
            try {
                serverSocket?.close()
            } catch (_: Exception) {
                // ignore
            }
            serverSocket = null
        }
    }

    private fun handleClient(client: LocalSocket) {
        Thread {
            try {
                client.use { socket ->
                    val payload = readPayload(socket)
                    Log.d(TAG, "handleClient: ${payload.length} chars")
                    val response = when {
                        payload.isEmpty() || payload.equals("PING", ignoreCase = true) -> {
                            Log.d(TAG, "handleClient: PING -> OK")
                            "OK\n"
                        }
                        runBlocking(Dispatchers.IO) {
                            EntryNotifier.saveAndNotify(
                                this@AdbTcpReceiverService,
                                payload,
                                Constants.SOURCE_ADB,
                            )
                        } -> {
                            Log.i(TAG, "handleClient: order saved -> OK")
                            mainHandler.post { showOrderArrived(payload) }
                            "OK\n"
                        }
                        else -> {
                            Log.w(TAG, "handleClient: save failed -> ERR")
                            "ERR\n"
                        }
                    }
                    socket.outputStream.write(response.toByteArray(Charsets.UTF_8))
                    socket.outputStream.flush()
                }
            } catch (e: Exception) {
                Log.e(TAG, "handleClient error: ${e.message}", e)
                try {
                    client.outputStream.write("ERR\n".toByteArray(Charsets.UTF_8))
                    client.outputStream.flush()
                    client.close()
                } catch (_: Exception) {
                    // ignore
                }
            }
        }.start()
    }

    private fun readPayload(socket: LocalSocket): String {
        val input = socket.inputStream
        val buffer = StringBuilder()
        val data = ByteArray(4096)
        while (true) {
            val count = input.read(data)
            if (count <= 0) break
            buffer.append(String(data, 0, count, Charsets.UTF_8))
            if (buffer.indexOf('\n') >= 0) break
        }
        return buffer.toString().trim()
    }

    private fun startForegroundCompat(text: String) {
        val notification = buildNotification(text)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIF_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE,
            )
        } else {
            startForeground(NOTIF_ID, notification)
        }
    }

    private fun buildNotification(text: String): Notification {
        val channelId = "erp_pos_adb"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(channelId, "ERP POS ADB", NotificationManager.IMPORTANCE_LOW)
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
        val pending = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        return Notification.Builder(this, channelId)
            .setContentTitle("ERP POS ADB")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.stat_sys_download_done)
            .setContentIntent(pending)
            .setOngoing(true)
            .build()
    }

    private fun showOrderArrived(payload: String) {
        val order = JsonParser.parse(payload) ?: return
        val amountText = "৳${"%.2f".format(order.grandTotal)}"
        val channelId = "erp_pos_adb"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "ERP POS Orders",
                NotificationManager.IMPORTANCE_HIGH,
            )
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
        val openApp = PendingIntent.getActivity(
            this,
            1,
            Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val notification = Notification.Builder(this, channelId)
            .setContentTitle(getString(com.erppos.R.string.receipt_new_order))
            .setContentText(getString(com.erppos.R.string.adb_order_received, amountText))
            .setSmallIcon(android.R.drawable.stat_sys_download_done)
            .setContentIntent(openApp)
            .setAutoCancel(true)
            .build()
        getSystemService(NotificationManager::class.java).notify(ORDER_NOTIF_ID, notification)
    }

    private fun updateNotification(text: String) {
        getSystemService(NotificationManager::class.java)
            .notify(NOTIF_ID, buildNotification(text))
    }

    companion object {
        private const val TAG = "ErpPosUsb"
        private const val NOTIF_ID = 1003
        private const val ORDER_NOTIF_ID = 1004
        const val ADB_SOCKET_NAME = "erppos_adb"

        fun start(context: Context) {
            val intent = Intent(context, AdbTcpReceiverService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            context.stopService(Intent(context, AdbTcpReceiverService::class.java))
        }
    }
}
