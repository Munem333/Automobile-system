package com.autohub.bd.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.autohub.bd.data.*
import com.autohub.bd.ui.theme.Primary
import com.autohub.bd.ui.theme.cardContainerColor
import com.autohub.bd.ui.theme.mutedTextColor
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SupportScreen(api: ApiService, onBack: () -> Unit) {
    var tab by remember { mutableIntStateOf(0) }
    val tabs = listOf("FAQ", "Contact", "Track Order")

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Support") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
            )
        },
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            TabRow(selectedTabIndex = tab) {
                tabs.forEachIndexed { index, label ->
                    Tab(selected = tab == index, onClick = { tab = index }, text = { Text(label) })
                }
            }
            when (tab) {
                0 -> FaqTab(api)
                1 -> ContactTab(api)
                2 -> TrackOrderTab(api)
            }
        }
    }
}

@Composable
private fun FaqTab(api: ApiService) {
    var categories by remember { mutableStateOf<List<FaqCategoryDto>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        try {
            categories = api.getFaq().dataOrThrow()
        } catch (e: Exception) {
            error = e.message ?: "Could not load FAQ."
        } finally {
            loading = false
        }
    }

    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        if (loading) item { CircularProgressIndicator(color = Primary) }
        error?.let { msg -> item { Text(msg, color = MaterialTheme.colorScheme.error) } }
        categories.forEach { category ->
            item {
                Text(category.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            }
            items(category.items) { item ->
                var expanded by remember { mutableStateOf(false) }
                Card(
                    onClick = { expanded = !expanded },
                    colors = CardDefaults.cardColors(containerColor = cardContainerColor()),
                ) {
                    Column(Modifier.padding(16.dp)) {
                        Text(item.question, fontWeight = FontWeight.SemiBold)
                        if (expanded) {
                            Spacer(Modifier.height(8.dp))
                            Text(item.answer, color = mutedTextColor())
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ContactTab(api: ApiService) {
    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var subject by remember { mutableStateOf("") }
    var message by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var success by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    LazyColumn(
        Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Text(
                "Send us a message and we will respond within 24 hours.",
                color = mutedTextColor(),
            )
        }
        item { OutlinedTextField(name, { name = it }, label = { Text("Your Name") }, modifier = Modifier.fillMaxWidth()) }
        item { OutlinedTextField(email, { email = it }, label = { Text("Email") }, modifier = Modifier.fillMaxWidth()) }
        item { OutlinedTextField(phone, { phone = it }, label = { Text("Phone (optional)") }, modifier = Modifier.fillMaxWidth()) }
        item { OutlinedTextField(subject, { subject = it }, label = { Text("Subject") }, modifier = Modifier.fillMaxWidth()) }
        item {
            OutlinedTextField(
                message,
                { message = it },
                label = { Text("Message (min 20 characters)") },
                modifier = Modifier.fillMaxWidth(),
                minLines = 4,
            )
        }
        error?.let { item { Text(it, color = MaterialTheme.colorScheme.error) } }
        success?.let { item { Text(it, color = Primary) } }
        item {
            Button(
                onClick = {
                    scope.launch {
                        error = null
                        success = null
                        try {
                            val res = api.createTicket(
                                SupportTicketRequest(
                                    name = name.trim(),
                                    email = email.trim(),
                                    phone = phone.trim().ifBlank { null },
                                    subject = subject.trim(),
                                    message = message.trim(),
                                ),
                            )
                            val data = res.dataOrThrow()
                            success = res.message ?: "Ticket submitted (#${data.id.take(8)})."
                            subject = ""
                            message = ""
                        } catch (e: Exception) {
                            error = e.message
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth(),
            ) { Text("Submit Ticket") }
        }
    }
}

@Composable
private fun TrackOrderTab(api: ApiService) {
    var orderNumber by remember { mutableStateOf("") }
    var contact by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var order by remember { mutableStateOf<OrderLookupDto?>(null) }
    val scope = rememberCoroutineScope()

    LazyColumn(
        Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Text(
                "Enter your order number and the email or phone used at checkout.",
                color = mutedTextColor(),
            )
        }
        item { OutlinedTextField(orderNumber, { orderNumber = it }, label = { Text("Order Number") }, modifier = Modifier.fillMaxWidth()) }
        item { OutlinedTextField(contact, { contact = it }, label = { Text("Email or Phone") }, modifier = Modifier.fillMaxWidth()) }
        error?.let { item { Text(it, color = MaterialTheme.colorScheme.error) } }
        item {
            Button(
                onClick = {
                    scope.launch {
                        error = null
                        order = null
                        try {
                            order = api.orderLookup(
                                OrderLookupRequest(orderNumber.trim(), contact.trim()),
                            ).dataOrThrow()
                        } catch (e: Exception) {
                            error = e.message ?: "Order not found. Check your order number and contact details."
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth(),
            ) { Text("Track Order") }
        }
        order?.let { o ->
            item {
                Card(colors = CardDefaults.cardColors(containerColor = cardContainerColor())) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Order ${o.orderNumber}", fontWeight = FontWeight.Bold)
                        Text("Status: ${o.status}")
                        Text("Total: ৳${"%,.0f".format(o.total)} ${o.currency}")
                        o.items.forEach { item ->
                            Text("• ${item.productName} × ${item.quantity} — ৳${"%,.0f".format(item.totalPrice)}", color = mutedTextColor())
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BrandsScreen(api: ApiService, apiBaseUrl: String, onBack: () -> Unit, onBrandCars: (String) -> Unit) {
    var brands by remember { mutableStateOf<List<BrandDto>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        try {
            brands = api.getBrands().dataOrThrow()
        } catch (e: Exception) {
            error = e.message
        } finally {
            loading = false
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Brands") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
            )
        },
    ) { padding ->
        LazyColumn(Modifier.fillMaxSize().padding(padding).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            if (loading) item { CircularProgressIndicator(color = Primary) }
            error?.let { item { Text(it, color = MaterialTheme.colorScheme.error) } }
            items(brands) { brand ->
                Card(
                    onClick = { onBrandCars(brand.slug) },
                    colors = CardDefaults.cardColors(containerColor = cardContainerColor()),
                ) {
                    AsyncImage(
                        model = ImageUtils.brandImage(brand, apiBaseUrl),
                        contentDescription = brand.name,
                        modifier = Modifier.fillMaxWidth().height(120.dp),
                        contentScale = ContentScale.Crop,
                    )
                    Column(Modifier.padding(16.dp)) {
                        Text(brand.name, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                        brand.description?.let { Text(it, color = mutedTextColor(), maxLines = 2) }
                    }
                }
            }
        }
    }
}
