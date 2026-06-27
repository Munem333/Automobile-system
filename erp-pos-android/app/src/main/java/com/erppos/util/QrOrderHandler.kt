package com.erppos.util

import android.content.Context
import com.erppos.Constants

object QrOrderHandler {
    suspend fun processRaw(
        context: Context,
        raw: String,
        source: String = Constants.SOURCE_QR,
    ): ParsedOrder? {
        val json = JsonParser.extractOrderJson(raw) ?: return null
        val order = JsonParser.parse(json) ?: return null
        if (!EntryNotifier.saveAndNotify(context, json, source)) return null
        return order
    }
}
