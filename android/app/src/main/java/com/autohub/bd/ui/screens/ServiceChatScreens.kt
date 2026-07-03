package com.autohub.bd.ui.screens

import android.content.Context
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.autohub.bd.data.*
import com.autohub.bd.ui.theme.Primary
import com.autohub.bd.ui.theme.cardContainerColor
import com.autohub.bd.ui.theme.mutedTextColor
import kotlinx.coroutines.launch
import java.time.LocalDate

private val SERVICE_TYPES = listOf(
    "CHECKUP" to "General Checkup",
    "OIL_CHANGE" to "Oil Change",
    "REPAIR" to "Repair",
    "PART_INSTALLATION" to "Part Installation",
    "TIRE_SERVICE" to "Tire Service",
    "AC_SERVICE" to "AC Service",
    "BODY_WORK" to "Body Work",
)

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun ServiceScreen(api: ApiService, onBack: () -> Unit) {
    var centers by remember { mutableStateOf<List<ServiceCenterDto>>(emptyList()) }
    var slots by remember { mutableStateOf<List<SlotDto>>(emptyList()) }
    var selectedCenter by remember { mutableStateOf("") }
    var selectedDate by remember { mutableStateOf(LocalDate.now().plusDays(1).toString()) }
    var selectedTime by remember { mutableStateOf("") }
    var carBrand by remember { mutableStateOf("") }
    var carModel by remember { mutableStateOf("") }
    var contactName by remember { mutableStateOf("") }
    var contactPhone by remember { mutableStateOf("") }
    var contactEmail by remember { mutableStateOf("") }
    var issue by remember { mutableStateOf("") }
    var serviceType by remember { mutableStateOf("CHECKUP") }
    var message by remember { mutableStateOf<String?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        try {
            centers = api.getServiceCenters().dataOrThrow()
        } catch (e: Exception) {
            error = e.message ?: "Could not load service centers."
        }
    }

    LaunchedEffect(selectedCenter, selectedDate) {
        if (selectedCenter.isNotBlank()) {
            try {
                slots = api.getSlots(selectedCenter, selectedDate).data ?: emptyList()
            } catch (_: Exception) {
                slots = emptyList()
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Book Service") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
            )
        },
    ) { padding ->
        LazyColumn(
            Modifier.fillMaxSize().padding(padding).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            message?.let { item { Text(it, color = Primary) } }
            error?.let { item { Text(it, color = MaterialTheme.colorScheme.error) } }

            item {
                var expanded by remember { mutableStateOf(false) }
                ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = it }) {
                    OutlinedTextField(
                        value = centers.find { it.id == selectedCenter }?.name ?: "Select service center",
                        onValueChange = {},
                        readOnly = true,
                        modifier = Modifier.fillMaxWidth().menuAnchor(),
                        label = { Text("Service Center") },
                    )
                    ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                        centers.forEach { c ->
                            DropdownMenuItem(
                                text = { Text("${c.name} — ${c.city}") },
                                onClick = { selectedCenter = c.id; expanded = false },
                            )
                        }
                    }
                }
            }

            item {
                var expanded by remember { mutableStateOf(false) }
                ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = it }) {
                    OutlinedTextField(
                        value = SERVICE_TYPES.find { it.first == serviceType }?.second ?: "Service type",
                        onValueChange = {},
                        readOnly = true,
                        modifier = Modifier.fillMaxWidth().menuAnchor(),
                        label = { Text("Service Type") },
                    )
                    ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                        SERVICE_TYPES.forEach { (value, label) ->
                            DropdownMenuItem(
                                text = { Text(label) },
                                onClick = { serviceType = value; expanded = false },
                            )
                        }
                    }
                }
            }

            item { OutlinedTextField(selectedDate, { selectedDate = it }, label = { Text("Date (YYYY-MM-DD)") }, modifier = Modifier.fillMaxWidth()) }
            item { OutlinedTextField(carBrand, { carBrand = it }, label = { Text("Car Brand") }, modifier = Modifier.fillMaxWidth()) }
            item { OutlinedTextField(carModel, { carModel = it }, label = { Text("Car Model") }, modifier = Modifier.fillMaxWidth()) }
            item { OutlinedTextField(contactName, { contactName = it }, label = { Text("Your Name") }, modifier = Modifier.fillMaxWidth()) }
            item { OutlinedTextField(contactPhone, { contactPhone = it }, label = { Text("Phone (01XXXXXXXXX)") }, modifier = Modifier.fillMaxWidth()) }
            item { OutlinedTextField(contactEmail, { contactEmail = it }, label = { Text("Email (optional)") }, modifier = Modifier.fillMaxWidth()) }
            item { OutlinedTextField(issue, { issue = it }, label = { Text("Describe the issue") }, modifier = Modifier.fillMaxWidth(), minLines = 2) }

            item {
                Text("Available Slots", color = mutedTextColor())
                if (slots.isEmpty() && selectedCenter.isNotBlank()) {
                    Text("No slots for this date. Try another date.", color = mutedTextColor(), style = MaterialTheme.typography.bodySmall)
                }
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    slots.filter { it.available }.forEach { slot ->
                        FilterChip(
                            selected = selectedTime == slot.time,
                            onClick = { selectedTime = slot.time },
                            label = { Text(slot.time) },
                        )
                    }
                }
            }

            item {
                Button(
                    onClick = {
                        scope.launch {
                            error = null
                            message = null
                            if (carBrand.isBlank() || carModel.isBlank()) {
                                error = "Please enter your car brand and model."
                                return@launch
                            }
                            if (contactName.trim().length < 2) {
                                error = "Please enter your name."
                                return@launch
                            }
                            try {
                                val res = api.bookAppointment(
                                    BookAppointmentRequest(
                                        serviceCenterId = selectedCenter,
                                        serviceType = serviceType,
                                        carBrand = carBrand.trim(),
                                        carModel = carModel.trim(),
                                        issueDescription = issue.trim().ifBlank { null },
                                        preferredDate = selectedDate,
                                        preferredTime = selectedTime,
                                        contactName = contactName.trim(),
                                        contactPhone = contactPhone.trim(),
                                        contactEmail = contactEmail.trim().ifBlank { null },
                                    ),
                                )
                                if (res.success) {
                                    message = res.message ?: "Appointment booked successfully!"
                                } else {
                                    error = res.error ?: "Could not book appointment. Please try another slot."
                                }
                            } catch (e: Exception) {
                                error = e.message ?: "Could not book appointment."
                            }
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = selectedCenter.isNotBlank() && selectedTime.isNotBlank(),
                ) { Text("Book Appointment") }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun ChatScreen(context: Context, api: ApiService, onBack: () -> Unit) {
    val prefs = context.getSharedPreferences("autohub", Context.MODE_PRIVATE)
    var sessionId by remember { mutableStateOf(prefs.getString("chatSessionId", null)) }
    var messages by remember { mutableStateOf<List<ChatMessageDto>>(emptyList()) }
    var guestName by remember { mutableStateOf("") }
    var guestPhone by remember { mutableStateOf("") }
    var input by remember { mutableStateOf("") }
    var started by remember { mutableStateOf(sessionId != null) }
    var error by remember { mutableStateOf<String?>(null) }
    var quickReplies by remember { mutableStateOf<List<String>>(emptyList()) }
    val listState = rememberLazyListState()
    val scope = rememberCoroutineScope()
    val chatSocket = remember { ChatSocket(ApiConfig.getBaseUrl(context), AuthStore.getToken(context)) }

    DisposableEffect(Unit) {
        onDispose { chatSocket.disconnect() }
    }

    fun connectSocket(sid: String) {
        chatSocket.connect(
            onMessage = { msg ->
                if (msg.sessionId == sid && messages.none { it.id == msg.id }) {
                    messages = messages + msg
                }
            },
            onConnected = { chatSocket.join(sid) },
            onError = { err -> error = err },
        )
    }

    LaunchedEffect(sessionId) {
        if (sessionId != null) {
            try {
                messages = api.getChatMessages(sessionId!!).data ?: emptyList()
                started = true
                connectSocket(sessionId!!)
                val replies = api.getQuickReplies().data ?: emptyList()
                quickReplies = replies.map { it.title }.ifEmpty {
                    listOf("Browse cars", "Shop parts", "Book service", "Track my order")
                }
            } catch (_: Exception) {
                sessionId = null
                prefs.edit().remove("chatSessionId").apply()
            }
        }
    }

    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) listState.animateScrollToItem(messages.size - 1)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Live Chat") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
            )
        },
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).padding(16.dp)) {
            if (!started) {
                Text("AutoHub Assistant", fontWeight = FontWeight.Bold)
                Text("Ask about cars, parts, or service.", color = mutedTextColor())
                Spacer(Modifier.height(12.dp))
                OutlinedTextField(guestName, { guestName = it }, label = { Text("Your Name (optional)") }, modifier = Modifier.fillMaxWidth())
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(guestPhone, { guestPhone = it }, label = { Text("Phone (optional)") }, modifier = Modifier.fillMaxWidth())
                error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                Spacer(Modifier.height(12.dp))
                Button(
                    onClick = {
                        scope.launch {
                            error = null
                            try {
                                val res = api.startChat(
                                    StartChatRequest(
                                        guestName = guestName.trim().ifBlank { null },
                                        guestPhone = guestPhone.trim().ifBlank { null },
                                    ),
                                )
                                val data = res.dataOrThrow()
                                sessionId = data.session.id
                                prefs.edit().putString("chatSessionId", sessionId).apply()
                                messages = data.messages
                                started = true
                                connectSocket(data.session.id)
                            } catch (e: Exception) {
                                error = e.message ?: "Could not start chat. Please try again."
                            }
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                ) { Text("Start Chat") }
            } else {
                LazyColumn(
                    Modifier.weight(1f),
                    state = listState,
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    items(messages) { msg ->
                        val isUser = msg.senderType == "CUSTOMER"
                        Row(
                            Modifier.fillMaxWidth(),
                            horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start,
                        ) {
                            Card(
                                colors = CardDefaults.cardColors(
                                    containerColor = if (isUser) Primary.copy(alpha = 0.15f) else cardContainerColor(),
                                ),
                            ) {
                                Column(Modifier.padding(12.dp)) {
                                    Text(msg.senderName, style = MaterialTheme.typography.labelSmall, color = mutedTextColor())
                                    Text(msg.content)
                                }
                            }
                        }
                    }
                }
                if (quickReplies.isNotEmpty()) {
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(vertical = 8.dp)) {
                        quickReplies.take(4).forEach { prompt ->
                            SuggestionChip(onClick = { input = prompt }, label = { Text(prompt) })
                        }
                    }
                }
                error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        input,
                        { input = it },
                        modifier = Modifier.weight(1f),
                        placeholder = { Text("Type a message…") },
                        singleLine = true,
                    )
                    IconButton(
                        onClick = {
                            val content = input.trim()
                            val sid = sessionId ?: return@IconButton
                            if (content.isBlank()) return@IconButton
                            val name = guestName.trim().ifBlank { "Visitor" }
                            chatSocket.send(sid, content, name)
                            input = ""
                        },
                    ) {
                        Icon(Icons.AutoMirrored.Filled.Send, contentDescription = "Send", tint = Primary)
                    }
                }
            }
        }
    }
}
