package com.erppos

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Bundle
import android.view.View
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.erppos.data.AppDatabase
import com.erppos.databinding.FragmentDashboardBinding
import com.erppos.util.AmountConverter
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class DashboardFragment : Fragment(R.layout.fragment_dashboard) {
    private var _binding: FragmentDashboardBinding? = null
    private val binding get() = _binding!!

    private val refreshReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            loadStats()
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

        updateReceivingUi()
        loadStats()
    }

    override fun onStart() {
        super.onStart()
        val filter = IntentFilter(MainActivity.ACTION_REFRESH_UI)
        ContextCompat.registerReceiver(requireContext(), refreshReceiver, filter, ContextCompat.RECEIVER_NOT_EXPORTED)
        updateReceivingUi()
        loadStats()
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

    private fun loadStats() {
        lifecycleScope.launch {
            val dao = AppDatabase.get(requireContext()).entryDao()
            val count = withContext(Dispatchers.IO) { dao.count() }
            val total = withContext(Dispatchers.IO) { dao.totalAmount() ?: 0.0 }
            binding.textOrderCount.text = "$count orders"
            binding.textTotalAmount.text = "৳${"%.2f".format(total)}"
            binding.textAmountWords.text = AmountConverter.toWords(total)
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
