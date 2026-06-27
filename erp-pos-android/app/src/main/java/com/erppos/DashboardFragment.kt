package com.erppos

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Bundle
import android.view.View
import android.view.animation.AnimationUtils
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.findNavController
import com.erppos.data.AppDatabase
import com.erppos.databinding.FragmentDashboardBinding
import com.erppos.databinding.ViewReceiptCardBinding
import com.erppos.util.AmountConverter
import com.erppos.util.JsonParser
import com.erppos.util.ReceiptDisplay
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class DashboardFragment : Fragment(R.layout.fragment_dashboard) {
    private var _binding: FragmentDashboardBinding? = null
    private val binding get() = _binding!!

    private val refreshReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            loadLatestReceipt(animate = true)
        }
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        _binding = FragmentDashboardBinding.bind(view)

        binding.btnStartStop.setOnClickListener {
            val activity = requireActivity() as MainActivity
            if (activity.isReceiving()) {
                activity.stopReceiving()
            } else {
                activity.startReceiving()
            }
            updateReceivingUi()
        }

        binding.btnScanQr.setOnClickListener {
            findNavController().navigate(R.id.qrScannerFragment)
        }

        updateReceivingUi()
        loadLatestReceipt(animate = false)
    }

    override fun onStart() {
        super.onStart()
        val filter = IntentFilter(MainActivity.ACTION_REFRESH_UI)
        ContextCompat.registerReceiver(requireContext(), refreshReceiver, filter, ContextCompat.RECEIVER_NOT_EXPORTED)
        updateReceivingUi()
        loadLatestReceipt(animate = false)
    }

    override fun onStop() {
        requireContext().unregisterReceiver(refreshReceiver)
        super.onStop()
    }

    private fun updateReceivingUi() {
        val activity = requireActivity() as MainActivity
        val active = activity.isReceiving()
        binding.btnStartStop.text = if (active) "Stop Receiving" else "Start Receiving"
        binding.textBleStatus.text = if (active) {
            "BLE advertising active — notification should say BLE Ready"
        } else {
            "Tap Start Receiving to advertise for the web POS"
        }
    }

    private fun loadLatestReceipt(animate: Boolean) {
        lifecycleScope.launch {
            val dao = AppDatabase.get(requireContext()).entryDao()
            val count = withContext(Dispatchers.IO) { dao.count() }
            val total = withContext(Dispatchers.IO) { dao.totalAmount() ?: 0.0 }
            val latest = withContext(Dispatchers.IO) { dao.getLatest() }

            binding.textOrderCount.text = getString(R.string.dashboard_orders_count, count)
            binding.textTotalAmount.text = "৳${"%.2f".format(total)}"
            binding.textAmountWords.text = AmountConverter.toWords(total)

            if (latest == null) {
                binding.textLastAmount.text = "৳0.00"
                binding.dashboardReceipt.root.visibility = View.GONE
                binding.textReceiptWaiting.visibility = View.VISIBLE
                return@launch
            }

            binding.textLastAmount.text = "৳${"%.2f".format(latest.amount)}"
            binding.textReceiptWaiting.visibility = View.GONE
            binding.dashboardReceipt.root.visibility = View.VISIBLE
            val order = JsonParser.parse(latest.payloadJson) ?: return@launch
            val cardBinding = ViewReceiptCardBinding.bind(binding.dashboardReceipt.root)
            ReceiptDisplay.bind(cardBinding, order, latest.source, animate = animate)
            if (animate) {
                binding.dashboardReceipt.root.startAnimation(
                    AnimationUtils.loadAnimation(requireContext(), R.anim.receipt_fade_in),
                )
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
