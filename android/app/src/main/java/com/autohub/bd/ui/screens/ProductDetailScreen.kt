package com.autohub.bd.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AddShoppingCart
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.autohub.bd.data.ApiService
import com.autohub.bd.data.CartRepository
import com.autohub.bd.data.ImageUtils
import com.autohub.bd.data.dataOrThrow
import com.autohub.bd.ui.theme.Primary
import com.autohub.bd.ui.theme.mutedTextColor
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductDetailScreen(
    slug: String,
    api: ApiService,
    cartRepo: CartRepository,
    apiBaseUrl: String,
    onBack: () -> Unit,
) {
    var product by remember { mutableStateOf<com.autohub.bd.data.ProductDto?>(null) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var added by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(slug) {
        loading = true
        error = null
        try {
            product = api.getProduct(slug).dataOrThrow()
        } catch (e: Exception) {
            error = e.message ?: "Could not load this product. Please try again."
        } finally {
            loading = false
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(product?.name ?: "Product") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
            )
        },
    ) { padding ->
        when {
            loading -> Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Primary)
            }
            error != null -> Box(Modifier.fillMaxSize().padding(padding).padding(16.dp)) {
                Text(error!!, color = MaterialTheme.colorScheme.error)
            }
            product != null -> {
                val p = product!!
                val images = (if (p.images.isNotEmpty()) p.images else listOfNotNull(p.thumbnailUrl))
                    .map { ImageUtils.resolve(it, apiBaseUrl) }
                LazyColumn(
                    Modifier.fillMaxSize().padding(padding),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    item {
                        AsyncImage(
                            model = images.firstOrNull() ?: ImageUtils.productImage(p, apiBaseUrl),
                            contentDescription = p.name,
                            modifier = Modifier.fillMaxWidth().height(220.dp).clip(RoundedCornerShape(12.dp)),
                            contentScale = ContentScale.Crop,
                        )
                    }
                    item {
                        Text(p.name, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                        p.carModel?.brand?.name?.let {
                            Text(it, color = mutedTextColor(), style = MaterialTheme.typography.bodyMedium)
                        }
                        p.part?.category?.name?.let {
                            Text(it, color = mutedTextColor(), style = MaterialTheme.typography.bodyMedium)
                        }
                        p.carModel?.description?.let {
                            Spacer(Modifier.height(8.dp))
                            Text(it, color = mutedTextColor(), style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                    item {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            Text(
                                "৳${"%,.0f".format(p.price)}",
                                style = MaterialTheme.typography.headlineMedium,
                                color = Primary,
                                fontWeight = FontWeight.Bold,
                            )
                            p.compareAtPrice?.takeIf { it > p.price }?.let { compare ->
                                Text(
                                    "৳${"%,.0f".format(compare)}",
                                    style = MaterialTheme.typography.bodyLarge,
                                    color = mutedTextColor(),
                                    textDecoration = TextDecoration.LineThrough,
                                )
                            }
                        }
                        Text("SKU: ${p.sku}", color = mutedTextColor(), style = MaterialTheme.typography.bodySmall)
                        Text(
                            if (p.stock > 0) "In stock (${p.stock})" else "Out of stock",
                            color = if (p.stock > 0) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }
                    if (images.size > 1) {
                        item {
                            Text("Gallery", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                items(images) { url ->
                                    AsyncImage(
                                        model = url,
                                        contentDescription = null,
                                        modifier = Modifier.size(80.dp).clip(RoundedCornerShape(8.dp)),
                                        contentScale = ContentScale.Crop,
                                    )
                                }
                            }
                        }
                    }
                    item {
                        val specs = buildList {
                            p.carModel?.bodyType?.let { add("Body: $it") }
                            p.carModel?.fuelType?.let { add("Fuel: $it") }
                            p.part?.partNumber?.let { add("Part #: $it") }
                        }
                        if (specs.isNotEmpty()) {
                            Text("Details", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                            specs.forEach { Text("• $it", color = mutedTextColor()) }
                        }
                    }
                    item {
                        Button(
                            onClick = {
                                scope.launch {
                                    cartRepo.add(p)
                                    added = true
                                }
                            },
                            modifier = Modifier.fillMaxWidth(),
                            enabled = p.stock > 0,
                        ) {
                            Icon(Icons.Default.AddShoppingCart, contentDescription = null)
                            Spacer(Modifier.width(8.dp))
                            Text(if (added) "Added to Cart" else "Add to Cart")
                        }
                    }
                }
            }
        }
    }
}
