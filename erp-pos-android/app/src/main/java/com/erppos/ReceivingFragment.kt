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
import com.erppos.data.AppDatabase
import com.erppos.databinding.FragmentReceivingBinding
import com.erppos.util.AmountConverter
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class ReceivingFragment : Fragment(R.layout.fragment_receiving) {
    private var _binding: FragmentReceivingBinding? = null
    private val binding get() = _binding!!

    private val receivers = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            when (intent?.action) {
                Constants.ACTION_BLE_STATUS -> {
                    val status = intent.getStringExtra(Constants.EXTRA_STATUS) ?: ""
                    binding.textStatus.text = when (status) {
                        "ready" -> "BLE Ready — waiting for POS"
                        "advertising" -> "Starting BLE advertising…"
                        "bluetooth_off" -> "Turn on Bluetooth on this phone"
                        "disconnected" -> "POS disconnected — Bluetooth link lost"
                        "connected" -> "POS connected over Bluetooth"
                        "failed" -> "BLE advertising failed — tap Start Receiving again"
                        else -> status
                    }
                }
                Constants.ACTION_ENTRY_RECEIVED, MainActivity.ACTION_REFRESH_UI -> loadLatest()
                MainActivity.ACTION_RECEIVING_CHANGED -> updateRing()
            }
        }
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        _binding = FragmentReceivingBinding.bind(view)

        binding.btnStartReceiving.setOnClickListener {
            (requireActivity() as MainActivity).startReceiving()
            updateRing()
        }

        val pulse = AnimationUtils.loadAnimation(requireContext(), R.anim.pulse_scale)
        binding.pulseRingOuter.startAnimation(pulse)
        binding.pulseRingInner.startAnimation(pulse)

        updateRing()
        loadLatest()
    }

    override fun onStart() {
        super.onStart()
        val filter = IntentFilter().apply {
            addAction(Constants.ACTION_BLE_STATUS)
            addAction(Constants.ACTION_ENTRY_RECEIVED)
            addAction(MainActivity.ACTION_REFRESH_UI)
            addAction(MainActivity.ACTION_RECEIVING_CHANGED)
        }
        ContextCompat.registerReceiver(requireContext(), receivers, filter, ContextCompat.RECEIVER_NOT_EXPORTED)
    }

    override fun onStop() {
        requireContext().unregisterReceiver(receivers)
        super.onStop()
    }

    private fun updateRing() {
        val active = (requireActivity() as MainActivity).isReceiving()
        binding.pulseRingOuter.visibility = if (active) View.VISIBLE else View.INVISIBLE
        binding.pulseRingInner.visibility = if (active) View.VISIBLE else View.INVISIBLE
        binding.textStatus.text = if (active) {
            "Advertising ERP POS service — open web POS and connect"
        } else {
            "Not receiving — tap Start Receiving on Dashboard"
        }
    }

    private fun loadLatest() {
        lifecycleScope.launch {
            val entries = withContext(Dispatchers.IO) {
                AppDatabase.get(requireContext()).entryDao().getAll()
            }
            val latest = entries.firstOrNull()
            if (latest != null) {
                binding.textLatestAmount.text = "৳${"%.2f".format(latest.amount)}"
                binding.textLatestWords.text = AmountConverter.toWords(latest.amount)
                binding.textLatestSource.text = "Via ${latest.source}"
            } else {
                binding.textLatestAmount.text = "৳0.00"
                binding.textLatestWords.text = "Waiting for first order…"
                binding.textLatestSource.text = ""
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
