package com.erppos.util

import android.Manifest
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat

object BluetoothHelper {
    fun enableIntent(): Intent = Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE)

    fun isEnabled(context: Context): Boolean {
        val adapter = context.getSystemService(BluetoothManager::class.java)?.adapter ?: return false
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_CONNECT)
                != PackageManager.PERMISSION_GRANTED
            ) {
                return false
            }
        }
        return adapter.isEnabled
    }
}
