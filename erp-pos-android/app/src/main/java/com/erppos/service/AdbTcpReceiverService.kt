package com.erppos.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.net.LocalServerSocket
import android.net.LocalSocket
import android.os.Build
import android.os.IBinder
import com.erppos.MainActivity
import com.erppos.util.EntryNotifier
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import java.util.concurrent.atomic.AtomicBoolean

class AdbTcpReceiverService : Service() {
    private val running = AtomicBoolean(false)
    private var serverJob: Job? = null
    private var serverSocket: LocalServerSocket? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForeground(NOTIF_ID, buildNotification("Starting ADB bridge listener…"))
        if (serverJob?.isActive == true && serverSocket != null) {
            updateNotification("ADB Ready — connect USB in web POS")
            return START_STICKY
        }
        running.set(true)
        serverJob?.cancel()
        serverJob = CoroutineScope(Dispatchers.IO).launch { acceptLoop() }
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        running.set(false)
        serverJob?.cancel()
        try {
            serverSocket?.close()
        } catch (_: Exception) {
            // already closed
        }
        serverSocket = null
        super.onDestroy()
    }

    private fun acceptLoop() {
        try {
            val socket = LocalServerSocket(ADB_SOCKET_NAME)
            serverSocket = socket
            updateNotification("ADB Ready — connect USB in web POS")
            while (running.get()) {
                try {
                    handleClient(socket.accept())
                } catch (_: Exception) {
                    if (!running.get()) break
                }
            }
        } catch (e: Exception) {
            updateNotification("ADB listener failed: ${e.message ?: "unknown error"}")
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
                    val saved = payload.isNotEmpty() && runBlocking {
                        EntryNotifier.saveAndNotify(this@AdbTcpReceiverService, payload, "ADB")
                    }
                    val response = if (saved) "OK\n" else "ERR\n"
                    socket.outputStream.write(response.toByteArray(Charsets.UTF_8))
                    socket.outputStream.flush()
                }
            } catch (_: Exception) {
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
