package com.erppos.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.hardware.usb.UsbConstants
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbDeviceConnection
import android.hardware.usb.UsbEndpoint
import android.hardware.usb.UsbInterface
import android.hardware.usb.UsbManager
import android.os.Build
import android.os.IBinder
import android.util.Log
import com.erppos.Constants
import com.erppos.MainActivity
import com.erppos.util.EntryNotifier
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import java.util.concurrent.atomic.AtomicBoolean

class UsbReceiverService : Service() {
    private val running = AtomicBoolean(false)
    private var readJob: Job? = null
    private var connection: UsbDeviceConnection? = null
    private var claimedInterface: UsbInterface? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForegroundCompat(getString(com.erppos.R.string.usb_notification_starting))
        val device = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            intent?.getParcelableExtra(EXTRA_DEVICE, UsbDevice::class.java)
        } else {
            @Suppress("DEPRECATION")
            intent?.getParcelableExtra(EXTRA_DEVICE)
        }
        if (device == null) {
            Log.w(TAG, "onStartCommand: no USB device extra — waiting for attach")
            updateNotification(getString(com.erppos.R.string.usb_notification_waiting))
            return START_STICKY
        }
        Log.i(TAG, "onStartCommand: device ${device.deviceName} vid=${device.vendorId} pid=${device.productId}")
        openAndRead(device)
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        Log.d(TAG, "onDestroy: closing USB connection")
        running.set(false)
        readJob?.cancel()
        releaseInterface()
        connection?.close()
        connection = null
        super.onDestroy()
    }

    private fun openAndRead(device: UsbDevice) {
        val usbManager = getSystemService(Context.USB_SERVICE) as UsbManager
        if (!usbManager.hasPermission(device)) {
            Log.w(TAG, "openAndRead: permission missing for ${device.deviceName}")
            updateNotification(getString(com.erppos.R.string.usb_notification_permission))
            return
        }

        Log.d(TAG, "openAndRead: opening device ${device.deviceName}")
        val conn = usbManager.openDevice(device) ?: run {
            Log.e(TAG, "openAndRead: UsbManager.openDevice returned null")
            updateNotification(getString(com.erppos.R.string.usb_notification_open_failed))
            return
        }

        releaseInterface()
        connection?.close()
        connection = conn

        val endpointPair = findBulkInEndpoint(device, conn) ?: run {
            Log.e(TAG, "openAndRead: no bulk IN endpoint found")
            updateNotification(getString(com.erppos.R.string.usb_notification_no_endpoint))
            conn.close()
            connection = null
            return
        }

        val iface = endpointPair.first
        val endpoint = endpointPair.second
        if (!conn.claimInterface(iface, true)) {
            Log.e(TAG, "openAndRead: claimInterface failed for interface ${iface.id}")
            updateNotification(getString(com.erppos.R.string.usb_notification_claim_failed))
            conn.close()
            connection = null
            return
        }
        claimedInterface = iface
        Log.i(TAG, "openAndRead: claimed interface ${iface.id}, endpoint ${endpoint.address}")

        running.set(true)
        readJob = CoroutineScope(Dispatchers.IO).launch {
            readLoop(conn, endpoint)
        }
        updateNotification(getString(com.erppos.R.string.usb_notification_ready))
    }

    private fun findBulkInEndpoint(device: UsbDevice, conn: UsbDeviceConnection): Pair<UsbInterface, UsbEndpoint>? {
        for (i in 0 until device.interfaceCount) {
            val iface = device.getInterface(i)
            for (j in 0 until iface.endpointCount) {
                val ep = iface.getEndpoint(j)
                if (ep.direction == UsbConstants.USB_DIR_IN &&
                    ep.type == UsbConstants.USB_ENDPOINT_XFER_BULK
                ) {
                    Log.d(TAG, "findBulkInEndpoint: interface=${iface.id} endpoint=${ep.address}")
                    return iface to ep
                }
            }
        }
        return null
    }

    private fun readLoop(conn: UsbDeviceConnection, endpoint: UsbEndpoint) {
        val buffer = ByteArray(4096)
        val sb = StringBuilder()
        Log.d(TAG, "readLoop: started")
        while (running.get()) {
            val len = conn.bulkTransfer(endpoint, buffer, buffer.size, 1000)
            if (len > 0) {
                sb.append(String(buffer, 0, len, Charsets.UTF_8))
                var newlineIndex = sb.indexOf("\n")
                while (newlineIndex >= 0) {
                    val message = sb.substring(0, newlineIndex).trim()
                    sb.delete(0, newlineIndex + 1)
                    if (message.isNotEmpty()) {
                        handleMessage(message)
                    }
                    newlineIndex = sb.indexOf("\n")
                }
            } else if (len < 0) {
                Log.w(TAG, "readLoop: bulkTransfer returned $len")
            }
        }
        Log.d(TAG, "readLoop: stopped")
    }

    private fun handleMessage(message: String) {
        if (message.equals("PING", ignoreCase = true)) {
            Log.d(TAG, "handleMessage: PING ignored on OTG path")
            return
        }
        Log.d(TAG, "handleMessage: saving order (${message.length} chars)")
        val saved = runBlocking(Dispatchers.IO) {
            EntryNotifier.saveAndNotify(this@UsbReceiverService, message, Constants.SOURCE_USB)
        }
        if (saved) {
            Log.i(TAG, "handleMessage: order saved")
        } else {
            Log.w(TAG, "handleMessage: save failed")
        }
    }

    private fun releaseInterface() {
        val conn = connection
        val iface = claimedInterface
        if (conn != null && iface != null) {
            try {
                conn.releaseInterface(iface)
                Log.d(TAG, "releaseInterface: released interface ${iface.id}")
            } catch (e: Exception) {
                Log.w(TAG, "releaseInterface: ${e.message}")
            }
        }
        claimedInterface = null
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
            .setContentTitle(getString(com.erppos.R.string.usb_notification_title))
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
        private const val TAG = "ErpPosUsb"
        private const val NOTIF_ID = 1002
        const val EXTRA_DEVICE = "usb_device"

        fun start(context: Context, device: UsbDevice) {
            val intent = Intent(context, UsbReceiverService::class.java)
            intent.putExtra(EXTRA_DEVICE, device)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }
    }
}
