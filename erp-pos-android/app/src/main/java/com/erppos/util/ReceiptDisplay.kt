package com.erppos.util

import android.animation.ValueAnimator
import android.view.LayoutInflater
import android.view.View
import android.view.animation.AccelerateDecelerateInterpolator
import android.view.animation.AnimationUtils
import android.view.animation.OvershootInterpolator
import android.widget.LinearLayout
import android.widget.TextView
import com.erppos.R
import com.erppos.databinding.ViewReceiptCardBinding
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

object ReceiptDisplay {
    private val dateFmt = SimpleDateFormat("dd MMM yyyy · HH:mm:ss", Locale.getDefault())
    private val currencyFmt = java.text.NumberFormat.getNumberInstance(Locale("en", "BD")).apply {
        minimumFractionDigits = 2
        maximumFractionDigits = 2
    }

    fun bind(
        binding: ViewReceiptCardBinding,
        order: ParsedOrder,
        source: String?,
        animate: Boolean,
    ) {
        binding.textReceiptDatetime.text = dateFmt.format(Date(order.timestamp))
        binding.textReceiptOrderId.text = "Order #${order.id.take(8).uppercase()}"
        binding.textReceiptSource.text = source?.let { "Via $it" } ?: ""
        binding.textReceiptWords.text = AmountConverter.toWords(order.grandTotal)

        populateItems(binding.receiptItemsContainer, order.items, animate)

        if (animate) {
            animateAmount(binding.textReceiptSubtotal, order.subtotal, order.currency)
            animateAmount(binding.textReceiptGrandTotal, order.grandTotal, order.currency, delayMs = 120, pulse = true)
            binding.receiptTotalsSection.alpha = 0f
            binding.receiptTotalsSection.animate()
                .alpha(1f)
                .setStartDelay(180)
                .setDuration(320)
                .start()
        } else {
            binding.textReceiptSubtotal.text = formatMoney(order.subtotal, order.currency)
            binding.textReceiptGrandTotal.text = formatMoney(order.grandTotal, order.currency)
            binding.receiptTotalsSection.alpha = 1f
        }
    }

    private fun populateItems(
        container: LinearLayout,
        items: List<OrderLineItem>,
        animate: Boolean,
    ) {
        container.removeAllViews()
        val inflater = LayoutInflater.from(container.context)
        if (items.isEmpty()) {
            val empty = TextView(container.context).apply {
                text = container.context.getString(R.string.receipt_no_items)
                setTextColor(container.context.getColor(R.color.receipt_text_muted))
                textSize = 13f
                setPadding(0, 8, 0, 8)
            }
            container.addView(empty)
            return
        }
        items.forEachIndexed { index, item ->
            val row = inflater.inflate(R.layout.item_receipt_row, container, false)
            row.findViewById<TextView>(R.id.text_item_name).text = item.name
            row.findViewById<TextView>(R.id.text_item_qty).text =
                "${item.qty} × ৳${currencyFmt.format(item.price)}"
            row.findViewById<TextView>(R.id.text_item_total).text =
                "৳${currencyFmt.format(item.lineTotal)}"
            if (animate) {
                row.alpha = 0f
                row.translationY = 24f
            }
            container.addView(row)
            if (animate) {
                row.animate()
                    .alpha(1f)
                    .translationY(0f)
                    .setStartDelay((index * 90L))
                    .setDuration(320)
                    .setInterpolator(OvershootInterpolator(0.8f))
                    .start()
            }
        }
    }

    private fun animateAmount(
        view: TextView,
        target: Double,
        currency: String,
        delayMs: Long = 0,
        pulse: Boolean = false,
    ) {
        view.text = formatMoney(0.0, currency)
        val animator = ValueAnimator.ofFloat(0f, target.toFloat())
        animator.duration = 700
        animator.startDelay = delayMs
        animator.interpolator = AccelerateDecelerateInterpolator()
        animator.addUpdateListener {
            val v = it.animatedValue as Float
            view.text = formatMoney(v.toDouble(), currency)
        }
        animator.start()
        if (pulse) {
            view.postDelayed({
                val pulseAnim = AnimationUtils.loadAnimation(view.context, R.anim.pulse_scale)
                view.startAnimation(pulseAnim)
            }, delayMs + 720)
        }
    }

    fun formatMoney(amount: Double, currency: String): String {
        return if (currency.equals("BDT", ignoreCase = true)) {
            "৳${currencyFmt.format(amount)}"
        } else {
            "$currency ${currencyFmt.format(amount)}"
        }
    }
}
