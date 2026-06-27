package com.erppos.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattDescriptor
import android.bluetooth.BluetoothGattService
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothProfile
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseSettings
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.ParcelUuid
import androidx.core.content.ContextCompat
import com.erppos.Constants
import com.erppos.util.BluetoothHelper
import java.util.UUID

class BleAdvertiseService : Service() {
    private var gattServer: android.bluetooth.BluetoothGattServer? = null
    private lateinit var chunkAssembler: BleChunkAssembler
    private val mainHandler = Handler(Looper.getMainLooper())
    private var advertiseCallback: AdvertiseCallback? = null
    private var bluetoothStateReceiver: BroadcastReceiver? = null

    override fun onCreate() {
        super.onCreate()
        chunkAssembler = BleChunkAssembler(this)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        registerBluetoothStateReceiver()

        if (!BluetoothHelper.isEnabled(this)) {
            startForeground(NOTIF_ID, buildNotification(getString(com.erppos.R.string.ble_notification_off)))
            broadcastStatus("bluetooth_off")
            teardownBleLink()
            return START_STICKY
        }

        startForeground(NOTIF_ID, buildNotification(getString(com.erppos.R.string.ble_notification_starting)))
        broadcastStatus("advertising")
        setAdapterName()
        startGattServer()
        startAdvertising()
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        unregisterBluetoothStateReceiver()
        teardownBleLink()
        super.onDestroy()
    }

    private fun registerBluetoothStateReceiver() {
        if (bluetoothStateReceiver != null) return
        bluetoothStateReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                if (intent?.action != BluetoothAdapter.ACTION_STATE_CHANGED) return
                when (intent.getIntExtra(BluetoothAdapter.EXTRA_STATE, BluetoothAdapter.ERROR)) {
                    BluetoothAdapter.STATE_OFF, BluetoothAdapter.STATE_TURNING_OFF -> {
                        updateNotification(getString(com.erppos.R.string.ble_notification_off))
                        broadcastStatus("bluetooth_off")
                        teardownBleLink()
                    }
                    BluetoothAdapter.STATE_ON -> {
                        if (BluetoothHelper.isEnabled(this@BleAdvertiseService)) {
                            setAdapterName()
                            startGattServer()
                            startAdvertising()
                        }
                    }
                }
            }
        }
        ContextCompat.registerReceiver(
            this,
            bluetoothStateReceiver,
            IntentFilter(BluetoothAdapter.ACTION_STATE_CHANGED),
            ContextCompat.RECEIVER_NOT_EXPORTED,
        )
    }

    private fun unregisterBluetoothStateReceiver() {
        bluetoothStateReceiver?.let {
            try {
                unregisterReceiver(it)
            } catch (_: IllegalArgumentException) {
                // already unregistered
            }
        }
        bluetoothStateReceiver = null
    }

    private fun teardownBleLink() {
        stopAdvertising()
        chunkAssembler.reset()
        try {
            gattServer?.close()
        } catch (_: Exception) {
            // already closed
        }
        gattServer = null
    }

    private fun setAdapterName() {
        val adapter = getSystemService(BluetoothManager::class.java)?.adapter ?: return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.BLUETOOTH_CONNECT)
                != PackageManager.PERMISSION_GRANTED
            ) {
                return
            }
        }
        try {
            adapter.name = Constants.BLE_DEVICE_NAME
        } catch (_: SecurityException) {
            // optional
        }
    }

    private fun startGattServer() {
        if (!BluetoothHelper.isEnabled(this)) return
        if (gattServer != null) return

        val manager = getSystemService(BluetoothManager::class.java) ?: return
        val adapter = manager.adapter ?: return

        gattServer = manager.openGattServer(this, object : android.bluetooth.BluetoothGattServerCallback() {
            override fun onConnectionStateChange(device: BluetoothDevice?, status: Int, newState: Int) {
                if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                    broadcastStatus("disconnected")
                } else if (newState == BluetoothProfile.STATE_CONNECTED) {
                    broadcastStatus("connected")
                }
            }

            override fun onCharacteristicWriteRequest(
                device: BluetoothDevice?,
                requestId: Int,
                characteristic: BluetoothGattCharacteristic?,
                preparedWrite: Boolean,
                responseNeeded: Boolean,
                offset: Int,
                value: ByteArray?,
            ) {
                if (!BluetoothHelper.isEnabled(this@BleAdvertiseService)) {
                    if (responseNeeded) {
                        gattServer?.sendResponse(
                            device,
                            requestId,
                            BluetoothGatt.GATT_FAILURE,
                            offset,
                            null,
                        )
                    }
                    return
                }

                if (value != null) {
                    mainHandler.post { chunkAssembler.onChunk(value) }
                }
                if (responseNeeded) {
                    gattServer?.sendResponse(
                        device,
                        requestId,
                        BluetoothGatt.GATT_SUCCESS,
                        offset,
                        value,
                    )
                }
            }
        })

        val service = BluetoothGattService(
            UUID.fromString(Constants.SERVICE_UUID),
            BluetoothGattService.SERVICE_TYPE_PRIMARY,
        )
        val characteristic = BluetoothGattCharacteristic(
            UUID.fromString(Constants.CHAR_UUID),
            BluetoothGattCharacteristic.PROPERTY_WRITE or BluetoothGattCharacteristic.PROPERTY_WRITE_NO_RESPONSE,
            BluetoothGattCharacteristic.PERMISSION_WRITE,
        )
        val cccd = BluetoothGattDescriptor(
            UUID.fromString("00002902-0000-1000-8000-00805f9b34fb"),
            BluetoothGattDescriptor.PERMISSION_READ or BluetoothGattDescriptor.PERMISSION_WRITE,
        )
        characteristic.addDescriptor(cccd)
        service.addCharacteristic(characteristic)
        gattServer?.addService(service)
    }

    private fun startAdvertising() {
        if (!BluetoothHelper.isEnabled(this)) {
            broadcastStatus("bluetooth_off")
            return
        }

        val adapter = getSystemService(BluetoothManager::class.java)?.adapter ?: return
        val advertiser = adapter.bluetoothLeAdvertiser
        if (advertiser == null) {
            updateNotification(getString(com.erppos.R.string.ble_notification_unsupported))
            broadcastStatus("unsupported")
            return
        }

        stopAdvertising()

        val settings = AdvertiseSettings.Builder()
            .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
            .setConnectable(true)
            .setTimeout(0)
            .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
            .build()

        val advertiseData = AdvertiseData.Builder()
            .setIncludeDeviceName(false)
            .addServiceUuid(ParcelUuid(UUID.fromString(Constants.SERVICE_UUID)))
            .build()

        val scanResponse = AdvertiseData.Builder()
            .setIncludeDeviceName(true)
            .build()

        advertiseCallback = object : AdvertiseCallback() {
            override fun onStartSuccess(settingsInEffect: AdvertiseSettings?) {
                updateNotification(getString(com.erppos.R.string.ble_notification_ready))
                broadcastStatus("ready")
            }

            override fun onStartFailure(errorCode: Int) {
                val reason = when (errorCode) {
                    ADVERTISE_FAILED_DATA_TOO_LARGE -> "data too large"
                    ADVERTISE_FAILED_ALREADY_STARTED -> "already started"
                    ADVERTISE_FAILED_FEATURE_UNSUPPORTED -> "not supported"
                    ADVERTISE_FAILED_INTERNAL_ERROR -> "internal error"
                    ADVERTISE_FAILED_TOO_MANY_ADVERTISERS -> "too many advertisers"
                    else -> "error $errorCode"
                }
                updateNotification(getString(com.erppos.R.string.ble_notification_failed, reason))
                broadcastStatus("failed")
            }
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.BLUETOOTH_ADVERTISE)
                != PackageManager.PERMISSION_GRANTED
            ) {
                updateNotification(getString(com.erppos.R.string.ble_notification_permission))
                broadcastStatus("failed")
                return
            }
        }

        advertiser.startAdvertising(settings, advertiseData, scanResponse, advertiseCallback)
    }

    private fun stopAdvertising() {
        val adapter = getSystemService(BluetoothManager::class.java)?.adapter ?: return
        advertiseCallback?.let { adapter.bluetoothLeAdvertiser?.stopAdvertising(it) }
        advertiseCallback = null
    }

    private fun broadcastStatus(status: String) {
        sendBroadcast(Intent(Constants.ACTION_BLE_STATUS).apply {
            putExtra(Constants.EXTRA_STATUS, status)
        })
    }

    private fun buildNotification(text: String): Notification {
        val channelId = "erp_pos_ble"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(channelId, "ERP POS Bluetooth", NotificationManager.IMPORTANCE_LOW)
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
        return Notification.Builder(this, channelId)
            .setContentTitle("ERP POS")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.stat_sys_data_bluetooth)
            .setOngoing(true)
            .build()
    }

    private fun updateNotification(text: String) {
        getSystemService(NotificationManager::class.java)
            .notify(NOTIF_ID, buildNotification(text))
    }

    companion object {
        private const val NOTIF_ID = 1001

        fun start(context: Context) {
            if (!BluetoothHelper.isEnabled(context)) return
            val intent = Intent(context, BleAdvertiseService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            context.stopService(Intent(context, BleAdvertiseService::class.java))
        }
    }
}
