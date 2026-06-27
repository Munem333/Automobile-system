package com.erppos.service

import android.content.Context
import com.erppos.Constants
import com.erppos.util.EntryNotifier
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.util.ArrayDeque

class BleChunkAssembler(private val context: Context) {
    private val buffer = StringBuilder()
    private val recentIds = ArrayDeque<String>(10)
    private var expectedTotal = -1
    private var expectedSeq = 0

    fun onChunk(data: ByteArray) {
        if (data.size < 2) return

        if (data[0].toInt() and 0xFF == 0xFF && data[1].toInt() and 0xFF == 0xFF) {
            flush()
            resetChunkState()
            return
        }

        val seq = data[0].toInt() and 0xFF
        val total = data[1].toInt() and 0xFF
        if (total == 0 || seq >= total) {
            resetChunkState()
            return
        }

        if (seq == 0) {
            buffer.clear()
            expectedTotal = total
            expectedSeq = 0
        } else if (expectedTotal < 0 || seq != expectedSeq) {
            resetChunkState()
            return
        }

        expectedSeq = seq + 1
        val end = minOf(data.size, Constants.MTU_CHUNK_SIZE)
        val payload = data.copyOfRange(2, end)
        val len = payload.indexOfFirst { it == 0.toByte() }.let { if (it < 0) payload.size else it }
        buffer.append(String(payload, 0, len, Charsets.UTF_8))
    }

    private fun resetChunkState() {
        buffer.clear()
        expectedTotal = -1
        expectedSeq = 0
    }

    private fun flush() {
        if (buffer.isEmpty()) return
        if (expectedTotal > 0 && expectedSeq != expectedTotal) {
            resetChunkState()
            return
        }
        val json = buffer.toString()
        resetChunkState()

        val id = try {
            JSONObject(json).getString("id")
        } catch (_: Exception) {
            deliver(json)
            return
        }

        if (recentIds.contains(id)) return
        if (recentIds.size >= 10) recentIds.removeFirst()
        recentIds.addLast(id)
        deliver(json)
    }

    private fun deliver(json: String) {
        CoroutineScope(Dispatchers.IO).launch {
            EntryNotifier.saveAndNotify(context, json, "Bluetooth")
        }
    }
}
