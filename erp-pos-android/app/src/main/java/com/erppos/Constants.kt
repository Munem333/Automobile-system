package com.erppos

object Constants {
    const val SERVICE_UUID = "12345678-1234-1234-1234-123456789abc"
    const val CHAR_UUID = "87654321-4321-4321-4321-cba987654321"
    const val MTU_CHUNK_SIZE = 20
    const val BLE_DEVICE_NAME = "ERP-POS-001"
    const val ADB_TCP_PORT = 8765

    const val ACTION_ENTRY_RECEIVED = "com.erppos.ENTRY_RECEIVED"
    const val ACTION_BLE_STATUS = "com.erppos.BLE_STATUS"
    const val EXTRA_STATUS = "status"
    const val EXTRA_SOURCE = "source"
    const val EXTRA_PAYLOAD_JSON = "payload_json"
}
