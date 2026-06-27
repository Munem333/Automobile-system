package com.erppos

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.animation.AlphaAnimation
import android.view.animation.Animation
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.DefaultItemAnimator
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.erppos.data.AppDatabase
import com.erppos.data.ReceivedEntry
import com.erppos.databinding.FragmentHistoryBinding
import com.erppos.databinding.ItemHistoryBinding
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class HistoryFragment : Fragment(R.layout.fragment_history) {
    private var _binding: FragmentHistoryBinding? = null
    private val binding get() = _binding!!
    private val adapter = HistoryAdapter()

    private val refreshReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            loadHistory(showShimmer = false)
        }
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        _binding = FragmentHistoryBinding.bind(view)

        binding.recyclerHistory.layoutManager = LinearLayoutManager(requireContext())
        binding.recyclerHistory.adapter = adapter
        binding.recyclerHistory.itemAnimator = DefaultItemAnimator()

        loadHistory(showShimmer = true)
    }

    override fun onStart() {
        super.onStart()
        val filter = IntentFilter(MainActivity.ACTION_REFRESH_UI)
        ContextCompat.registerReceiver(requireContext(), refreshReceiver, filter, ContextCompat.RECEIVER_NOT_EXPORTED)
    }

    override fun onStop() {
        requireContext().unregisterReceiver(refreshReceiver)
        super.onStop()
    }

    private fun loadHistory(showShimmer: Boolean) {
        if (showShimmer) {
            binding.shimmerOverlay.visibility = View.VISIBLE
            startShimmer(binding.shimmerOverlay)
        }
        lifecycleScope.launch {
            if (showShimmer) delay(600)
            val entries = withContext(Dispatchers.IO) {
                AppDatabase.get(requireContext()).entryDao().getAll()
            }
            adapter.submit(entries)
            binding.shimmerOverlay.clearAnimation()
            binding.shimmerOverlay.visibility = View.GONE
            binding.textEmpty.visibility = if (entries.isEmpty()) View.VISIBLE else View.GONE
        }
    }

    private fun startShimmer(view: View) {
        val anim = AlphaAnimation(0.3f, 1f).apply {
            duration = 700
            repeatMode = Animation.REVERSE
            repeatCount = Animation.INFINITE
        }
        view.startAnimation(anim)
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}

private class HistoryAdapter : RecyclerView.Adapter<HistoryAdapter.VH>() {
    private val items = mutableListOf<ReceivedEntry>()
    private val timeFmt = SimpleDateFormat("dd MMM, HH:mm", Locale.getDefault())

    fun submit(list: List<ReceivedEntry>) {
        items.clear()
        items.addAll(list)
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
        val binding = ItemHistoryBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return VH(binding)
    }

    override fun onBindViewHolder(holder: VH, position: Int) {
        holder.bind(items[position])
    }

    override fun getItemCount(): Int = items.size

    inner class VH(private val binding: ItemHistoryBinding) : RecyclerView.ViewHolder(binding.root) {
        fun bind(entry: ReceivedEntry) {
            binding.textAmount.text = "৳${"%.2f".format(entry.amount)}"
            binding.textMeta.text = "${entry.source} · ${timeFmt.format(Date(entry.receivedAt))}"
            binding.textOrderId.text = "Order ${entry.orderId.take(8)}…"
        }
    }
}
