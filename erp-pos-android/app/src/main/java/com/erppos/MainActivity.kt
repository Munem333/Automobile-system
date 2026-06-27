package com.erppos

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbManager
import android.os.Build
import android.os.Bundle
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.navigation.fragment.NavHostFragment
import androidx.navigation.ui.setupWithNavController
import com.erppos.databinding.ActivityMainBinding
import com.erppos.service.AdbTcpReceiverService
import com.erppos.service.BleAdvertiseService
import com.erppos.service.UsbReceiverService
import com.erppos.util.BluetoothHelper
import com.erppos.util.PermissionHelper
import com.erppos.util.ThemeHelper

class MainActivity : AppCompatActivity() {
    private lateinit var binding: ActivityMainBinding
    private var receiving = false
    private var pendingStartReceiving = false

    private val enableBluetoothLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult(),
    ) {
        if (BluetoothHelper.isEnabled(this)) {
            doStartReceiving()
        } else {
            pendingStartReceiving = false
            Toast.makeText(
                this,
                getString(R.string.bluetooth_enable_declined),
                Toast.LENGTH_LONG,
            ).show()
        }
    }

    private val entryReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == Constants.ACTION_ENTRY_RECEIVED) {
                sendBroadcast(Intent(ACTION_REFRESH_UI).setPackage(packageName))
            }
        }
    }

    private val usbAttachReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            val device = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                intent?.getParcelableExtra(UsbManager.EXTRA_DEVICE, UsbDevice::class.java)
            } else {
                @Suppress("DEPRECATION")
                intent?.getParcelableExtra(UsbManager.EXTRA_DEVICE)
            } ?: return
            UsbReceiverService.start(this@MainActivity, device)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        ThemeHelper.apply(this)
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val navHost = supportFragmentManager
            .findFragmentById(R.id.nav_host_fragment) as NavHostFragment
        val navController = navHost.navController
        binding.bottomNav.setupWithNavController(navController)

        PermissionHelper.request(this)
        PermissionHelper.requestNotifications(this)
        AdbTcpReceiverService.start(this)

        val filter = IntentFilter(Constants.ACTION_ENTRY_RECEIVED)
        ContextCompat.registerReceiver(this, entryReceiver, filter, ContextCompat.RECEIVER_NOT_EXPORTED)

        val usbFilter = IntentFilter(UsbManager.ACTION_USB_DEVICE_ATTACHED)
        ContextCompat.registerReceiver(this, usbAttachReceiver, usbFilter, ContextCompat.RECEIVER_NOT_EXPORTED)

        handleUsbIntent(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleUsbIntent(intent)
    }

    private fun handleUsbIntent(intent: Intent?) {
        if (intent?.action != UsbManager.ACTION_USB_DEVICE_ATTACHED) return
        val device = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            intent.getParcelableExtra(UsbManager.EXTRA_DEVICE, UsbDevice::class.java)
        } else {
            @Suppress("DEPRECATION")
            intent.getParcelableExtra(UsbManager.EXTRA_DEVICE)
        } ?: return
        UsbReceiverService.start(this, device)
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

        if (!BluetoothHelper.isEnabled(this)) {
            pendingStartReceiving = true
            enableBluetoothLauncher.launch(BluetoothHelper.enableIntent())
            return
        }

        doStartReceiving()
    }

    private fun doStartReceiving() {
        pendingStartReceiving = false
        receiving = true
        BleAdvertiseService.start(this)
        UsbReceiverService.start(this)
        AdbTcpReceiverService.start(this)
        sendBroadcast(Intent(ACTION_RECEIVING_CHANGED).putExtra(EXTRA_RECEIVING, true))
        Toast.makeText(this, "Receiving started — wait for BLE Ready notification", Toast.LENGTH_SHORT).show()
    }

    fun stopReceiving() {
        receiving = false
        BleAdvertiseService.stop(this)
        sendBroadcast(Intent(ACTION_RECEIVING_CHANGED).putExtra(EXTRA_RECEIVING, false))
    }

    override fun onDestroy() {
        unregisterReceiver(entryReceiver)
        unregisterReceiver(usbAttachReceiver)
        super.onDestroy()
    }

    companion object {
        const val ACTION_REFRESH_UI = "com.erppos.REFRESH_UI"
        const val ACTION_RECEIVING_CHANGED = "com.erppos.RECEIVING_CHANGED"
        const val EXTRA_RECEIVING = "receiving"
    }
}
