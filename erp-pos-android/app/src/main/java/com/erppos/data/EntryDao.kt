package com.erppos.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query

@Dao
interface EntryDao {
    @Insert
    suspend fun insert(entry: ReceivedEntry): Long

    @Query("SELECT * FROM received_entries ORDER BY receivedAt DESC")
    suspend fun getAll(): List<ReceivedEntry>

    @Query("DELETE FROM received_entries")
    suspend fun deleteAll()

    @Query("SELECT COUNT(*) FROM received_entries")
    suspend fun count(): Int

    @Query("SELECT SUM(amount) FROM received_entries")
    suspend fun totalAmount(): Double?

    @Query("SELECT * FROM received_entries ORDER BY receivedAt DESC LIMIT 1")
    suspend fun getLatest(): ReceivedEntry?
}
