package com.erppos.util

import android.net.Uri
import android.util.Base64
import com.erppos.Constants
import org.json.JSONArray
import org.json.JSONObject

data class OrderLineItem(
    val name: String,
    val qty: Int,
    val price: Double,
) {
    val lineTotal: Double get() = qty * price
}

data class ParsedOrder(
    val id: String,
    val total: Double,
    val currency: String,
    val rawJson: String,
    val items: List<OrderLineItem>,
    val timestamp: Long,
) {
    val subtotal: Double
        get() = if (items.isNotEmpty()) items.sumOf { it.lineTotal } else total

    val grandTotal: Double get() = total
}

object JsonParser {
    fun extractOrderJson(raw: String): String? {
        val trimmed = raw.trim()
        if (trimmed.lowercase().startsWith("${Constants.QR_DEEP_LINK_SCHEME}://")) {
            return decodeDeepLink(trimmed)
        }
        if (trimmed.startsWith(Constants.QR_PREFIX)) {
            return trimmed.removePrefix(Constants.QR_PREFIX)
        }
        if (trimmed.startsWith("{")) {
            return trimmed
        }
        return null
    }

    fun normalizePayload(raw: String): String {
        return extractOrderJson(raw) ?: raw.trim()
    }

    fun parse(payload: String): ParsedOrder? {
        return try {
            val jsonStr = extractOrderJson(payload) ?: return null
            val json = JSONObject(jsonStr)
            val items = parseItems(json.optJSONArray("items"))
            ParsedOrder(
                id = json.optString("id", System.currentTimeMillis().toString()),
                total = json.optDouble("total", 0.0),
                currency = json.optString("currency", "BDT"),
                rawJson = jsonStr,
                items = items,
                timestamp = json.optLong("timestamp", System.currentTimeMillis()),
            )
        } catch (_: Exception) {
            null
        }
    }

    private fun decodeDeepLink(url: String): String? {
        return try {
            val uri = Uri.parse(url)
            if (uri.scheme?.lowercase() != Constants.QR_DEEP_LINK_SCHEME) return null
            if (uri.host?.lowercase() != Constants.QR_DEEP_LINK_HOST) return null
            val encoded = uri.getQueryParameter(Constants.QR_DEEP_LINK_PARAM) ?: return null
            val flags = Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING
            String(Base64.decode(encoded, flags), Charsets.UTF_8)
        } catch (_: Exception) {
            null
        }
    }

    private fun parseItems(array: JSONArray?): List<OrderLineItem> {
        if (array == null) return emptyList()
        val list = mutableListOf<OrderLineItem>()
        for (i in 0 until array.length()) {
            val obj = array.optJSONObject(i) ?: continue
            list.add(
                OrderLineItem(
                    name = obj.optString("name", "Item"),
                    qty = obj.optInt("qty", 1).coerceAtLeast(1),
                    price = obj.optDouble("price", 0.0),
                ),
            )
        }
        return list
    }
}
