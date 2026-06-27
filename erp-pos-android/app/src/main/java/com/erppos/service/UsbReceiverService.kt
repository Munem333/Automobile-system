package com.erppos.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.hardware.usb.UsbConstants
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbDeviceConnection
import android.hardware.usb.UsbEndpoint
import android.hardware.usb.UsbManager
import android.os.Build
import android.os.IBinder
import com.erppos.MainActivity
import com.erppos.data.AppDatabase
import com.erppos.data.ReceivedEntry
import com.erppos.util.JsonParser
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import java.util.concurrent.atomic.AtomicBoolean

class UsbReceiverService : Service() {
    private val running = AtomicBoolean(false)
    private var readJob: Job? = null
    private var connection: UsbDeviceConnection? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForeground(NOTIF_ID, buildNotification("USB listening for POS orders"))
        val device = intent?.getParcelableExtra<UsbDevice>(EXTRA_DEVICE)
        if (device != null) {
            openAndRead(device)
        }
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        running.set(false)
        readJob?.cancel()
        connection?.close()
        super.onDestroy()
    }

    private fun openAndRead(device: UsbDevice) {
        val usbManager = getSystemService(Context.USB_SERVICE) as UsbManager
        if (!usbManager.hasPermission(device)) {
            updateNotification("USB permission required — tap Allow on your phone")
            return
        }

        val conn = usbManager.openDevice(device) ?: run {
            updateNotification("Could not open USB device")
            return
        }
        connection?.close()
        connection = conn

        val endpoint = findBulkInEndpoint(device) ?: run {
            updateNotification("USB device has no readable serial endpoint")
            conn.close()
            return
        }

        running.set(true)
        readJob = CoroutineScope(Dispatchers.IO).launch {
            readLoop(conn, endpoint)
        }
        updateNotification("USB Ready — waiting for POS")
    }

    private fun findBulkInEndpoint(device: UsbDevice): UsbEndpoint? {
        val conn = connection ?: return null
        for (i in 0 until device.interfaceCount) {
            val iface = device.getInterface(i)
            for (j in 0 until iface.endpointCount) {
                val ep = iface.getEndpoint(j)
                if (ep.direction == UsbConstants.USB_DIR_IN &&
                    ep.type == UsbConstants.USB_ENDPOINT_XFER_BULK &&
                    conn.claimInterface(iface, true)
                ) {
                    return ep
                }
            }
        }
        return null
    }

    private fun readLoop(conn: UsbDeviceConnection, endpoint: UsbEndpoint) {
        val buffer = ByteArray(4096)
        val sb = StringBuilder()
        while (running.get()) {
            val len = conn.bulkTransfer(endpoint, buffer, buffer.size, 1000)
            if (len > 0) {
                sb.append(String(buffer, 0, len, Charsets.UTF_8))
                var newlineIndex = sb.indexOf("\n")
                while (newlineIndex >= 0) {
                    val message = sb.substring(0, newlineIndex).trim()
                    sb.delete(0, newlineIndex + 1)
                    if (message.isNotEmpty()) {
                        parseAndSave(message)
                    }
                    newlineIndex = sb.indexOf("\n")
                }
            }
        }
    }

    private fun parseAndSave(json: String) {
        val parsed = JsonParser.parse(json) ?: return
        CoroutineScope(Dispatchers.IO).launch {
            AppDatabase.get(this@UsbReceiverService).entryDao().insert(
                ReceivedEntry(
                    orderId = parsed.id,
                    amount = parsed.total,
                    currency = parsed.currency,
                    source = "USB",
                    payloadJson = parsed.rawJson,
                ),
            )
            sendBroadcast(
                Intent(com.erppos.Constants.ACTION_ENTRY_RECEIVED).apply {
                    putExtra(com.erppos.Constants.EXTRA_SOURCE, "USB")
                },
            )
        }
    }

    private fun buildNotification(text: String): Notification {
        val channelId = "erp_pos_usb"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(channelId, "ERP POS USB", NotificationManager.IMPORTANCE_LOW)
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
        val pending = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        return Notification.Builder(this, channelId)
            .setContentTitle("ERP POS USB")
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
        private const val NOTIF_ID = 1002
        const val EXTRA_DEVICE = "usb_device"

        fun start(context: Context, device: UsbDevice? = null) {
            val intent = Intent(context, UsbReceiverService::class.java)
            device?.let { intent.putExtra(EXTRA_DEVICE, it) }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }
    }
}
