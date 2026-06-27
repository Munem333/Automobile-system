package com.erppos.util

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
    fun parse(payload: String): ParsedOrder? {
        return try {
            val json = JSONObject(payload.trim())
            val items = parseItems(json.optJSONArray("items"))
            ParsedOrder(
                id = json.optString("id", System.currentTimeMillis().toString()),
                total = json.optDouble("total", 0.0),
                currency = json.optString("currency", "BDT"),
                rawJson = payload.trim(),
                items = items,
                timestamp = json.optLong("timestamp", System.currentTimeMillis()),
            )
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
