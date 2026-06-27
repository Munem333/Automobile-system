package com.erppos.util

import kotlin.math.floor

object AmountConverter {
    private val ones = arrayOf(
        "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
        "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
        "Seventeen", "Eighteen", "Nineteen",
    )
    private val tens = arrayOf(
        "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
    )

    fun toWords(amount: Double): String {
        val whole = floor(amount).toLong()
        if (whole == 0L) return "Zero Taka Only"
        return "${convert(whole)} Taka Only"
    }

    private fun convert(n: Long): String {
        if (n < 20) return ones[n.toInt()]
        if (n < 100) {
            val t = tens[(n / 10).toInt()]
            val o = ones[(n % 10).toInt()]
            return if (o.isEmpty()) t else "$t $o"
        }
        if (n < 1000) {
            val h = ones[(n / 100).toInt()]
            val rest = convert(n % 100)
            return if (rest.isEmpty()) "$h Hundred" else "$h Hundred $rest"
        }
        if (n < 100000) {
            val th = convert(n / 1000)
            val rest = convert(n % 1000)
            return if (rest.isEmpty()) "$th Thousand" else "$th Thousand $rest"
        }
        if (n < 10000000) {
            val lk = convert(n / 100000)
            val rest = convert(n % 100000)
            return if (rest.isEmpty()) "$lk Lakh" else "$lk Lakh $rest"
        }
        val cr = convert(n / 10000000)
        val rest = convert(n % 10000000)
        return if (rest.isEmpty()) "$cr Crore" else "$cr Crore $rest"
    }
}
