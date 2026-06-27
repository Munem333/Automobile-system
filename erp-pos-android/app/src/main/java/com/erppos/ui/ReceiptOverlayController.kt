package com.erppos.ui

import android.os.Handler
import android.os.Looper
import android.view.View
import android.view.animation.AnimationUtils
import com.erppos.R
import com.erppos.databinding.ViewReceiptCardBinding
import com.erppos.databinding.ViewReceiptOverlayBinding
import com.erppos.util.ParsedOrder
import com.erppos.util.ReceiptDisplay

class ReceiptOverlayController(
    private val binding: ViewReceiptOverlayBinding,
) {
    private val handler = Handler(Looper.getMainLooper())
    private var dismissRunnable: Runnable? = null
    private val cardBinding: ViewReceiptCardBinding
        get() = ViewReceiptCardBinding.bind(binding.receiptCardInclude.root)

    init {
        binding.receiptOverlayRoot.setOnClickListener { hide() }
        binding.btnReceiptDismiss.setOnClickListener { hide() }
        binding.receiptCardInclude.root.setOnClickListener { /* consume */ }
    }

    fun show(order: ParsedOrder, source: String?) {
        cancelAutoDismiss()
        ReceiptDisplay.bind(cardBinding, order, source, animate = true)

        binding.receiptOverlayRoot.visibility = View.VISIBLE
        binding.receiptScrim.animate().alpha(1f).setDuration(280).start()
        binding.receiptCardInclude.root.startAnimation(
            AnimationUtils.loadAnimation(binding.receiptOverlayRoot.context, R.anim.receipt_slide_up),
        )
        binding.textReceiptBadge.visibility = View.VISIBLE
        binding.textReceiptBadge.alpha = 0f
        binding.textReceiptBadge.animate()
            .alpha(1f)
            .setStartDelay(200)
            .setDuration(300)
            .start()

        dismissRunnable = Runnable { hide() }
        handler.postDelayed(dismissRunnable!!, AUTO_DISMISS_MS)
    }

    fun hide() {
        cancelAutoDismiss()
        binding.receiptScrim.animate().alpha(0f).setDuration(200).start()
        binding.receiptCardInclude.root.animate()
            .translationY(120f)
            .alpha(0f)
            .setDuration(260)
            .withEndAction {
                binding.receiptOverlayRoot.visibility = View.GONE
                binding.receiptCardInclude.root.translationY = 0f
                binding.receiptCardInclude.root.alpha = 1f
                binding.textReceiptBadge.visibility = View.INVISIBLE
            }
            .start()
    }

    private fun cancelAutoDismiss() {
        dismissRunnable?.let { handler.removeCallbacks(it) }
        dismissRunnable = null
    }

    companion object {
        private const val AUTO_DISMISS_MS = 18_000L
    }
}
