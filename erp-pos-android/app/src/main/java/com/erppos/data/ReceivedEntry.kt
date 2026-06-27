package com.erppos.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "received_entries")
data class ReceivedEntry(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val orderId: String,
    val amount: Double,
    val currency: String,
    val source: String,
    val payloadJson: String,
    val receivedAt: Long = System.currentTimeMillis(),
)
