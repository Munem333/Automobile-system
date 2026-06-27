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
import android.os.IBinder
import com.erppos.MainActivity
import com.erppos.util.EntryNotifier
import kotlinx.coroutines.runBlocking
import java.util.concurrent.atomic.AtomicBoolean

class AdbTcpReceiverService : Service() {
    private val running = AtomicBoolean(false)
    private var serverSocket: LocalServerSocket? = null
    private var acceptThread: Thread? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForegroundCompat(getString(com.erppos.R.string.adb_notification_starting))
        if (acceptThread?.isAlive == true && serverSocket != null) {
            updateNotification(getString(com.erppos.R.string.adb_notification_ready))
            return START_STICKY
        }
        stopListener()
        running.set(true)
        acceptThread = Thread({ acceptLoop() }, "erppos-adb-accept").also { it.start() }
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
    }

    private fun acceptLoop() {
        try {
            val socket = LocalServerSocket(ADB_SOCKET_NAME)
            serverSocket = socket
            updateNotification(getString(com.erppos.R.string.adb_notification_ready))
            while (running.get()) {
                try {
                    val client = socket.accept()
                    handleClient(client)
                } catch (_: Exception) {
                    if (!running.get()) break
                }
            }
        } catch (e: Exception) {
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
        try {
            client.soTimeout = 30000
            val payload = readPayload(client)
            if (payload.isEmpty() || payload == "ping") {
                writeResponse(client, true)
                return
            }
            val saved = runBlocking {
                EntryNotifier.saveAndNotify(this@AdbTcpReceiverService, payload, "ADB")
            }
            writeResponse(client, saved)
        } catch (_: Exception) {
            writeResponse(client, false)
        } finally {
            try {
                client.close()
            } catch (_: Exception) {
                // ignore
            }
        }
    }

    private fun writeResponse(client: LocalSocket, ok: Boolean) {
        val response = (if (ok) "OK" else "ERR") + "\n"
        client.outputStream.write(response.toByteArray(Charsets.UTF_8))
        client.outputStream.flush()
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
                ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC,
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

    private fun updateNotification(text: String) {
        getSystemService(NotificationManager::class.java)
            .notify(NOTIF_ID, buildNotification(text))
    }

    companion object {
        private const val NOTIF_ID = 1003
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
