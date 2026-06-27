package com.erppos.util

import android.content.Context
import android.content.Intent
import android.util.Log
import com.erppos.Constants
import com.erppos.MainActivity
import com.erppos.data.AppDatabase
import com.erppos.data.ReceivedEntry

object EntryNotifier {
    private const val TAG = "ErpPosUsb"

    suspend fun saveAndNotify(context: Context, json: String, source: String): Boolean {
        return try {
            val normalized = JsonParser.normalizePayload(json)
            val parsed = JsonParser.parse(normalized) ?: run {
                Log.w(TAG, "saveAndNotify: invalid order JSON from $source (${json.length} chars)")
                return false
            }
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
                    putExtra(Constants.EXTRA_PAYLOAD_JSON, parsed.rawJson)
                },
            )
            context.sendBroadcast(
                Intent(MainActivity.ACTION_REFRESH_UI).apply {
                    setPackage(pkg)
                },
            )
            Log.i(TAG, "saveAndNotify: order ${parsed.id} saved from $source total=${parsed.total}")
            true
        } catch (e: Exception) {
            Log.e(TAG, "saveAndNotify failed from $source: ${e.message}", e)
            false
        }
    }
}
