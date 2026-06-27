package com.erppos

import android.app.PendingIntent
import android.bluetooth.BluetoothAdapter
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbManager
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.NavHostFragment
import androidx.navigation.ui.setupWithNavController
import com.erppos.databinding.ActivityMainBinding
import com.erppos.service.AdbTcpReceiverService
import com.erppos.service.BleAdvertiseService
import com.erppos.service.UsbReceiverService
import com.erppos.ui.ReceiptOverlayController
import com.erppos.util.BluetoothHelper
import com.erppos.util.JsonParser
import com.erppos.util.PermissionHelper
import com.erppos.util.QrOrderHandler
import com.erppos.util.ThemeHelper
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity() {
    private lateinit var binding: ActivityMainBinding
    private lateinit var receiptOverlay: ReceiptOverlayController
    private var receiving = false
    private var pendingStartReceiving = false

    private val enableBluetoothLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult(),
    ) {
        pendingStartReceiving = false
        if (BluetoothHelper.isEnabled(this) && receiving) {
            BleAdvertiseService.start(this)
            Toast.makeText(
                this,
                getString(R.string.receiving_started_ble),
                Toast.LENGTH_SHORT,
            ).show()
        }
    }

    private val entryReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action != Constants.ACTION_ENTRY_RECEIVED) return
            val json = intent.getStringExtra(Constants.EXTRA_PAYLOAD_JSON) ?: return
            val source = intent.getStringExtra(Constants.EXTRA_SOURCE)
            Log.i(TAG, "order received via $source (${json.length} chars)")
            sendBroadcast(Intent(ACTION_REFRESH_UI).setPackage(packageName))
            val order = JsonParser.parse(json) ?: return
            receiptOverlay.show(order, source)
        }
    }

    private val usbPermissionReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action != Constants.ACTION_USB_PERMISSION) return
            val device = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                intent.getParcelableExtra(UsbManager.EXTRA_DEVICE, UsbDevice::class.java)
            } else {
                @Suppress("DEPRECATION")
                intent.getParcelableExtra(UsbManager.EXTRA_DEVICE)
            } ?: return
            if (intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)) {
                Log.i(TAG, "USB permission granted for ${device.deviceName}")
                UsbReceiverService.start(this@MainActivity, device)
            } else {
                Log.w(TAG, "USB permission denied for ${device.deviceName}")
                Toast.makeText(
                    this@MainActivity,
                    getString(R.string.usb_permission_denied),
                    Toast.LENGTH_LONG,
                ).show()
            }
        }
    }

    private val usbDeviceReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            when (intent?.action) {
                UsbManager.ACTION_USB_DEVICE_ATTACHED -> {
                    val device = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        intent.getParcelableExtra(UsbManager.EXTRA_DEVICE, UsbDevice::class.java)
                    } else {
                        @Suppress("DEPRECATION")
                        intent.getParcelableExtra(UsbManager.EXTRA_DEVICE)
                    } ?: return
                    Log.i(TAG, "USB device attached: ${device.deviceName}")
                    attachUsbDevice(device)
                }
                UsbManager.ACTION_USB_DEVICE_DETACHED -> {
                    val device = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        intent.getParcelableExtra(UsbManager.EXTRA_DEVICE, UsbDevice::class.java)
                    } else {
                        @Suppress("DEPRECATION")
                        intent.getParcelableExtra(UsbManager.EXTRA_DEVICE)
                    }
                    Log.i(TAG, "USB device detached: ${device?.deviceName ?: "unknown"}")
                }
            }
        }
    }

    private val bluetoothStateReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action != BluetoothAdapter.ACTION_STATE_CHANGED) return
            val state = intent.getIntExtra(BluetoothAdapter.EXTRA_STATE, BluetoothAdapter.ERROR)
            if (state == BluetoothAdapter.STATE_OFF || state == BluetoothAdapter.STATE_TURNING_OFF) {
                onPhoneBluetoothOff()
            } else if (state == BluetoothAdapter.STATE_ON && receiving) {
                BleAdvertiseService.start(this@MainActivity)
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        ThemeHelper.apply(this)
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)
        receiptOverlay = ReceiptOverlayController(binding.receiptOverlay)

        val navHost = supportFragmentManager
            .findFragmentById(R.id.nav_host_fragment) as NavHostFragment
        val navController = navHost.navController
        binding.bottomNav.setupWithNavController(navController)

        PermissionHelper.request(this)
        PermissionHelper.requestNotifications(this)
        AdbTcpReceiverService.start(this)

        val filter = IntentFilter(Constants.ACTION_ENTRY_RECEIVED)
        ContextCompat.registerReceiver(this, entryReceiver, filter, ContextCompat.RECEIVER_NOT_EXPORTED)

        ContextCompat.registerReceiver(
            this,
            usbPermissionReceiver,
            IntentFilter(Constants.ACTION_USB_PERMISSION),
            ContextCompat.RECEIVER_NOT_EXPORTED,
        )

        val usbFilter = IntentFilter().apply {
            addAction(UsbManager.ACTION_USB_DEVICE_ATTACHED)
            addAction(UsbManager.ACTION_USB_DEVICE_DETACHED)
        }
        ContextCompat.registerReceiver(this, usbDeviceReceiver, usbFilter, ContextCompat.RECEIVER_NOT_EXPORTED)

        val btFilter = IntentFilter(BluetoothAdapter.ACTION_STATE_CHANGED)
        ContextCompat.registerReceiver(this, bluetoothStateReceiver, btFilter, ContextCompat.RECEIVER_NOT_EXPORTED)

        handleUsbIntent(intent)
        handleQrDeepLink(intent)
    }

    override fun onResume() {
        super.onResume()
        AdbTcpReceiverService.start(this)
        ensureBleReceiving()
    }

    private fun ensureBleReceiving() {
        if (receiving) return
        if (!PermissionHelper.hasAll(this)) return
        receiving = true
        if (BluetoothHelper.isEnabled(this)) {
            BleAdvertiseService.start(this)
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleUsbIntent(intent)
        handleQrDeepLink(intent)
    }

    private fun handleQrDeepLink(intent: Intent?) {
        if (intent?.action != Intent.ACTION_VIEW) return
        val uri = intent.data ?: return
        if (uri.scheme?.lowercase() != Constants.QR_DEEP_LINK_SCHEME) return

        lifecycleScope.launch {
            val order = QrOrderHandler.processRaw(this@MainActivity, uri.toString())
            if (order == null) {
                Toast.makeText(
                    this@MainActivity,
                    getString(R.string.qr_invalid_code),
                    Toast.LENGTH_LONG,
                ).show()
            }
        }
    }

    private fun handleUsbIntent(intent: Intent?) {
        if (intent?.action != UsbManager.ACTION_USB_DEVICE_ATTACHED) return
        val device = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            intent.getParcelableExtra(UsbManager.EXTRA_DEVICE, UsbDevice::class.java)
        } else {
            @Suppress("DEPRECATION")
            intent.getParcelableExtra(UsbManager.EXTRA_DEVICE)
        } ?: return
        attachUsbDevice(device)
    }

    private fun attachUsbDevice(device: UsbDevice) {
        val usbManager = getSystemService(UsbManager::class.java)
        Log.d(
            TAG,
            "attachUsbDevice: ${device.deviceName} vid=${device.vendorId} pid=${device.productId} hasPermission=${usbManager.hasPermission(device)}",
        )
        if (usbManager.hasPermission(device)) {
            UsbReceiverService.start(this, device)
            return
        }
        val permissionIntent = PendingIntent.getBroadcast(
            this,
            0,
            Intent(Constants.ACTION_USB_PERMISSION),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        Log.d(TAG, "attachUsbDevice: requesting USB permission")
        usbManager.requestPermission(device, permissionIntent)
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray,
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode != PermissionHelper.REQUEST_CODE) return

        if (!PermissionHelper.hasAll(this)) {
            pendingStartReceiving = false
            Toast.makeText(
                this,
                getString(R.string.permissions_required),
                Toast.LENGTH_LONG,
            ).show()
            return
        }

        if (pendingStartReceiving) {
            startReceiving()
        }
    }

    fun isReceiving(): Boolean = receiving

    fun startReceiving() {
        if (!PermissionHelper.hasAll(this)) {
            pendingStartReceiving = true
            PermissionHelper.request(this)
            Toast.makeText(
                this,
                getString(R.string.permissions_then_start),
                Toast.LENGTH_LONG,
            ).show()
            return
        }

        doStartReceiving()

        if (!BluetoothHelper.isEnabled(this)) {
            enableBluetoothLauncher.launch(BluetoothHelper.enableIntent())
        }
    }

    private fun doStartReceiving() {
        pendingStartReceiving = false
        receiving = true
        AdbTcpReceiverService.start(this)

        if (BluetoothHelper.isEnabled(this)) {
            BleAdvertiseService.start(this)
            Toast.makeText(this, getString(R.string.receiving_started_ble), Toast.LENGTH_SHORT).show()
        } else {
            Toast.makeText(this, getString(R.string.receiving_started_usb_only), Toast.LENGTH_LONG).show()
        }

        sendBroadcast(Intent(ACTION_RECEIVING_CHANGED).putExtra(EXTRA_RECEIVING, true))
    }

    private fun onPhoneBluetoothOff() {
        BleAdvertiseService.stop(this)
        AdbTcpReceiverService.start(this)
        Toast.makeText(
            this,
            getString(R.string.bluetooth_turned_off_usb_still_active),
            Toast.LENGTH_LONG,
        ).show()
    }

    fun stopReceiving() {
        receiving = false
        BleAdvertiseService.stop(this)
        AdbTcpReceiverService.start(this)
        sendBroadcast(Intent(ACTION_RECEIVING_CHANGED).putExtra(EXTRA_RECEIVING, false))
    }

    override fun onDestroy() {
        unregisterReceiver(entryReceiver)
        unregisterReceiver(usbPermissionReceiver)
        unregisterReceiver(usbDeviceReceiver)
        unregisterReceiver(bluetoothStateReceiver)
        super.onDestroy()
    }

    companion object {
        private const val TAG = "ErpPosUsb"
        const val ACTION_REFRESH_UI = "com.erppos.REFRESH_UI"
        const val ACTION_RECEIVING_CHANGED = "com.erppos.RECEIVING_CHANGED"
        const val EXTRA_RECEIVING = "receiving"
    }
}
