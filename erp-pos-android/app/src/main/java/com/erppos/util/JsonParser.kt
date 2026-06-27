package com.erppos.util

import org.json.JSONObject

data class ParsedOrder(
    val id: String,
    val total: Double,
    val currency: String,
    val rawJson: String,
)

object JsonParser {
    fun parse(payload: String): ParsedOrder? {
        return try {
            val json = JSONObject(payload.trim())
            ParsedOrder(
                id = json.optString("id", System.currentTimeMillis().toString()),
                total = json.optDouble("total", 0.0),
                currency = json.optString("currency", "BDT"),
                rawJson = payload.trim(),
            )
        } catch (_: Exception) {
            null
        }
    }
}
