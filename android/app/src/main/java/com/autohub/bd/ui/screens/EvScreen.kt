package com.autohub.bd.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.autohub.bd.data.ApiService
import com.autohub.bd.data.CartRepository
import com.autohub.bd.data.ProductDto
import com.autohub.bd.ui.theme.Primary
import com.autohub.bd.ui.theme.mutedTextColor
import kotlinx.coroutines.launch

private val EvGreen = Color(0xFF059669)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EvScreen(
    api: ApiService,
    cartRepo: CartRepository,
    apiBaseUrl: String,
    onBack: () -> Unit,
    onProductClick: (String) -> Unit,
) {
    var evCars by remember { mutableStateOf<List<ProductDto>>(emptyList()) }
    var evParts by remember { mutableStateOf<List<ProductDto>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        try {
            evCars = api.getCars(fuelType = "ELECTRIC").data?.items ?: emptyList()
            evParts = api.getParts(category = "ev").data?.items ?: emptyList()
        } catch (e: Exception) {
            error = e.message ?: "Could not load EV catalog."
        } finally {
            loading = false
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("EV Electric") },
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
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            item {
                Text("Drive Electric", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                Text(
                    "BAW electric vehicles and genuine EV parts — zero emissions, lower running costs.",
                    color = mutedTextColor(),
                )
            }
            if (loading) item { CircularProgressIndicator(color = EvGreen) }
            error?.let { item { Text(it, color = MaterialTheme.colorScheme.error) } }

            item {
                Text("BAW EV Cars", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = EvGreen)
            }
            if (evCars.isEmpty() && !loading) {
                item { Text("No electric vehicles listed yet.", color = mutedTextColor()) }
            }
            items(evCars) { product ->
                ProductRow(product, apiBaseUrl, onClick = { onProductClick(product.slug) }) {
                    scope.launch { cartRepo.add(product) }
                }
            }

            item {
                Spacer(Modifier.height(8.dp))
                Text("EV Parts", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = EvGreen)
            }
            if (evParts.isEmpty() && !loading) {
                item { Text("EV parts coming soon.", color = mutedTextColor()) }
            }
            items(evParts) { product ->
                ProductRow(product, apiBaseUrl, onClick = { onProductClick(product.slug) }) {
                    scope.launch { cartRepo.add(product) }
                }
            }
        }
    }
}
