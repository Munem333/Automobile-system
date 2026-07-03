package com.autohub.bd.data

import io.socket.client.IO
import io.socket.client.Socket
import org.json.JSONObject

class ChatSocket(private val baseUrl: String, private val token: String?) {
    private var socket: Socket? = null

    fun connect(
        onMessage: (ChatMessageDto) -> Unit,
        onConnected: () -> Unit,
        onError: (String) -> Unit,
    ) {
        if (socket?.connected() == true) {
            onConnected()
            return
        }

        try {
            val opts = IO.Options().apply {
                forceNew = true
                reconnection = true
                auth = mapOf("token" to (token ?: ""))
            }
            socket = IO.socket(baseUrl, opts)

            socket?.on(Socket.EVENT_CONNECT) { onConnected() }
            socket?.on(Socket.EVENT_CONNECT_ERROR) { args ->
                val msg = args.firstOrNull()?.toString() ?: "Could not connect to chat"
                onError(msg)
            }
            socket?.on("chat:message") { args ->
                val json = args.firstOrNull() as? JSONObject ?: return@on
                onMessage(json.toChatMessage())
            }
            socket?.connect()
        } catch (e: Exception) {
            onError(e.message ?: "Could not start live chat")
        }
    }

    fun join(sessionId: String) {
        socket?.emit("chat:join", sessionId)
    }

    fun send(sessionId: String, content: String, senderName: String) {
        val payload = JSONObject()
            .put("sessionId", sessionId)
            .put("content", content)
            .put("senderName", senderName)
        socket?.emit("chat:message", payload)
    }

    fun disconnect() {
        socket?.off()
        socket?.disconnect()
        socket = null
    }

    private fun JSONObject.toChatMessage(): ChatMessageDto = ChatMessageDto(
        id = optString("id"),
        sessionId = optString("sessionId"),
        senderType = optString("senderType"),
        senderName = optString("senderName"),
        content = optString("content"),
        createdAt = optString("createdAt"),
    )
}
