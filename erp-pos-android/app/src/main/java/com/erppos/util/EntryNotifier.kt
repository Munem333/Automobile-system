package com.erppos.util

import android.content.Context
import android.content.Intent
import com.erppos.Constants
import com.erppos.MainActivity
import com.erppos.data.AppDatabase
import com.erppos.data.ReceivedEntry

object EntryNotifier {
    suspend fun saveAndNotify(context: Context, json: String, source: String): Boolean {
        return try {
            val parsed = JsonParser.parse(json) ?: return false
            AppDatabase.get(context).entryDao().insert(
                ReceivedEntry(
                    orderId = parsed.id,
                    amount = parsed.total,
                    currency = parsed.currency,
                    source = source,
                    payloadJson = parsed.rawJson,
                ),
            )
            val pkg = context.packageName
            context.sendBroadcast(
                Intent(Constants.ACTION_ENTRY_RECEIVED).apply {
                    setPackage(pkg)
                    putExtra(Constants.EXTRA_SOURCE, source)
                    putExtra(Constants.EXTRA_PAYLOAD_JSON, json)
                },
            )
            context.sendBroadcast(
                Intent(MainActivity.ACTION_REFRESH_UI).apply {
                    setPackage(pkg)
                },
            )
            true
        } catch (_: Exception) {
            false
        }
    }
}
