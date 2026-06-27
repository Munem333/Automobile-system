package com.erppos

import android.bluetooth.BluetoothManager
import android.bluetooth.le.BluetoothLeScanner
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanResult
import android.content.pm.PackageManager
import android.hardware.usb.UsbManager
import android.os.Build
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.erppos.databinding.FragmentDevicesBinding
import com.erppos.databinding.ItemDeviceBinding

class DevicesFragment : Fragment(R.layout.fragment_devices) {
    private var _binding: FragmentDevicesBinding? = null
    private val binding get() = _binding!!
    private val adapter = DeviceAdapter()
    private var scanner: BluetoothLeScanner? = null
    private var scanning = false

    private val scanCallback = object : ScanCallback() {
        override fun onScanResult(callbackType: Int, result: ScanResult) {
            val name = result.device.name ?: result.scanRecord?.deviceName ?: "Unknown"
            val rssi = result.rssi
            activity?.runOnUiThread {
                adapter.upsert(DeviceItem(name, rssi, "Bluetooth"))
            }
        }
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        _binding = FragmentDevicesBinding.bind(view)
        binding.recyclerDevices.layoutManager = LinearLayoutManager(requireContext())
        binding.recyclerDevices.adapter = adapter

        binding.btnRescan.setOnClickListener {
            startScan()
            loadUsbDevices()
        }

        loadUsbDevices()
        startScan()
    }

    override fun onPause() {
        stopScan()
        super.onPause()
    }

    private fun startScan() {
        if (scanning) return
        val manager = requireContext().getSystemService(BluetoothManager::class.java)
        val adapter = manager?.adapter
        if (adapter == null || !adapter.isEnabled) {
            binding.textScanStatus.text = "Turn on Bluetooth to scan nearby devices"
            return
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (ContextCompat.checkSelfPermission(requireContext(), android.Manifest.permission.BLUETOOTH_SCAN)
                != PackageManager.PERMISSION_GRANTED
            ) {
                binding.textScanStatus.text = "Grant Bluetooth Scan permission to list devices"
                return
            }
        }
        scanner = adapter.bluetoothLeScanner
        scanner?.startScan(scanCallback)
        scanning = true
        binding.textScanStatus.text = "Scanning for nearby BLE devices…"
    }

    private fun stopScan() {
        if (!scanning) return
        scanner?.stopScan(scanCallback)
        scanning = false
    }

    private fun loadUsbDevices() {
        val usbManager = requireContext().getSystemService(UsbManager::class.java)
        usbManager.deviceList.values.forEach { device ->
            adapter.upsert(
                DeviceItem(
                    name = device.productName ?: "USB ${device.deviceName}",
                    rssi = -50,
                    type = "USB",
                ),
            )
        }
    }

    override fun onDestroyView() {
        stopScan()
        super.onDestroyView()
        _binding = null
    }
}

private data class DeviceItem(val name: String, val rssi: Int, val type: String)

private class DeviceAdapter : RecyclerView.Adapter<DeviceAdapter.VH>() {
    private val items = linkedMapOf<String, DeviceItem>()

    fun upsert(item: DeviceItem) {
        items["${item.type}:${item.name}"] = item
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
        val binding = ItemDeviceBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return VH(binding)
    }

    override fun onBindViewHolder(holder: VH, position: Int) {
        holder.bind(items.values.elementAt(position))
    }

    override fun getItemCount(): Int = items.size

    inner class VH(private val binding: ItemDeviceBinding) : RecyclerView.ViewHolder(binding.root) {
        fun bind(item: DeviceItem) {
            binding.textDeviceName.text = item.name
            binding.textDeviceType.text = item.type
            setSignalBars(binding.signalBars, item.rssi)
        }

        private fun setSignalBars(container: ViewGroup, rssi: Int) {
            container.removeAllViews()
            val level = when {
                rssi >= -50 -> 4
                rssi >= -65 -> 3
                rssi >= -80 -> 2
                rssi >= -90 -> 1
                else -> 0
            }
            val colors = intArrayOf(
                0xFF4B5563.toInt(),
                0xFFEF4444.toInt(),
                0xFFF59E0B.toInt(),
                0xFF84CC16.toInt(),
                0xFF22C55E.toInt(),
            )
            for (i in 1..4) {
                val bar = View(container.context)
                val lp = ViewGroup.LayoutParams(8, 8 + i * 6)
                bar.layoutParams = lp
                bar.setBackgroundColor(if (i <= level) colors[level] else colors[0])
                container.addView(bar)
            }
        }
    }
}
