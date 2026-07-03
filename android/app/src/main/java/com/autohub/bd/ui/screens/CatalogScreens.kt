package com.autohub.bd.ui.screens

import android.content.Context
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.autohub.bd.data.*
import com.autohub.bd.ui.theme.Primary
import com.autohub.bd.ui.theme.cardContainerColor
import com.autohub.bd.ui.theme.mutedTextColor
import kotlinx.coroutines.launch

@Composable
fun HomeScreen(
    context: android.content.Context,
    api: ApiService,
    cartRepo: CartRepository,
    onNavigate: (String) -> Unit,
) {
    val apiBaseUrl = remember { ApiConfig.getBaseUrl(context) }
    var featuredCars by remember { mutableStateOf<List<ProductDto>>(emptyList()) }
    var evCars by remember { mutableStateOf<List<ProductDto>>(emptyList()) }
    var brands by remember { mutableStateOf<List<BrandDto>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        try {
            brands = api.getBrands().data ?: emptyList()

            var cars = api.getFeatured(type = "CAR", limit = 6).data
                ?.filter { it.type == "CAR" }
                .orEmpty()
            if (cars.isEmpty()) {
                cars = api.getCars(pageSize = 6).data?.items.orEmpty()
            }
            featuredCars = cars

            evCars = api.getCars(fuelType = "ELECTRIC", pageSize = 4).data?.items.orEmpty()
        } catch (e: Exception) {
            error = "Could not connect to $apiBaseUrl. Make sure the API is running and your phone is on the same Wi‑Fi."
        } finally {
            loading = false
        }
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            Text("AutoHub BD", style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.ExtraBold)
            Text("Drive Your Dream Today", color = Primary, style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = { onNavigate("cars") }) { Text("Browse Cars") }
                OutlinedButton(onClick = { onNavigate("parts") }) { Text("Shop Parts") }
            }
        }

        if (loading) item { CircularProgressIndicator(color = Primary) }
        error?.let { msg -> item { Text(msg, color = MaterialTheme.colorScheme.error) } }

        if (brands.isNotEmpty()) {
            item {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Brands", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    TextButton(onClick = { onNavigate("brands") }) { Text("View all") }
                }
            }
            item {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    items(brands.take(4)) { brand ->
                        Card(
                            modifier = Modifier
                                .width(140.dp)
                                .clickable { onNavigate("cars/${brand.slug}") },
                            colors = CardDefaults.cardColors(containerColor = cardContainerColor()),
                        ) {
                            AsyncImage(
                                model = ImageUtils.brandImage(brand, apiBaseUrl),
                                contentDescription = brand.name,
                                modifier = Modifier.fillMaxWidth().height(80.dp),
                                contentScale = ContentScale.Crop,
                            )
                            Text(
                                brand.name,
                                modifier = Modifier.padding(8.dp),
                                fontWeight = FontWeight.SemiBold,
                                style = MaterialTheme.typography.bodyMedium,
                            )
                        }
                    }
                }
            }
        }

        item {
            Text("Featured Cars", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        }

        item {
            if (featuredCars.isEmpty() && !loading) {
                Text("No featured cars right now.", color = mutedTextColor())
            } else {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    items(featuredCars) { product ->
                        ProductCard(product, apiBaseUrl, onClick = { onNavigate("product/${product.slug}") }) {
                            scope.launch { cartRepo.add(product) }
                        }
                    }
                }
            }
        }

        if (evCars.isNotEmpty()) {
            item {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("EV Electric ⚡", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    TextButton(onClick = { onNavigate("ev") }) { Text("View all") }
                }
            }
            item {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    items(evCars) { product ->
                        ProductCard(product, apiBaseUrl, onClick = { onNavigate("product/${product.slug}") }) {
                            scope.launch { cartRepo.add(product) }
                        }
                    }
                }
            }
        }

        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                QuickCard("Book Service", Modifier.weight(1f)) { onNavigate("service") }
                QuickCard("Live Chat", Modifier.weight(1f)) { onNavigate("chat") }
            }
        }
        item {
            QuickCard("Help & Support", Modifier.fillMaxWidth()) { onNavigate("support") }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CarsScreen(
    api: ApiService,
    cartRepo: CartRepository,
    initialBrand: String?,
    apiBaseUrl: String,
    onProductClick: (String) -> Unit,
) {
    var products by remember { mutableStateOf<List<ProductDto>>(emptyList()) }
    var brands by remember { mutableStateOf<List<BrandDto>>(emptyList()) }
    var selectedBrand by remember { mutableStateOf(initialBrand) }
    var search by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        try { brands = api.getBrands().data ?: emptyList() } catch (_: Exception) {}
    }

    LaunchedEffect(selectedBrand, search) {
        loading = true
        error = null
        try {
            products = api.getCars(
                brand = selectedBrand,
                search = search.trim().ifBlank { null },
            ).data?.items ?: emptyList()
        } catch (e: Exception) {
            error = e.message ?: "Could not load cars. Pull to refresh or try again."
        } finally {
            loading = false
        }
    }

    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Text("Cars", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(
            value = search,
            onValueChange = { search = it },
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text("Search cars…") },
            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
            singleLine = true,
        )
        Spacer(Modifier.height(8.dp))
        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            item {
                FilterChip(
                    selected = selectedBrand == null,
                    onClick = { selectedBrand = null },
                    label = { Text("All") },
                )
            }
            items(brands) { brand ->
                FilterChip(
                    selected = selectedBrand == brand.slug,
                    onClick = { selectedBrand = brand.slug },
                    label = { Text(brand.name) },
                )
            }
        }
        Spacer(Modifier.height(12.dp))
        if (loading) CircularProgressIndicator(color = Primary)
        error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            items(products) { product ->
                ProductRow(product, apiBaseUrl, onClick = { onProductClick(product.slug) }) {
                    scope.launch { cartRepo.add(product) }
                }
            }
            if (!loading && products.isEmpty()) {
                item { Text("No cars found. Try a different search or brand.", color = mutedTextColor()) }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PartsScreen(
    api: ApiService,
    cartRepo: CartRepository,
    apiBaseUrl: String,
    onProductClick: (String) -> Unit,
) {
    var products by remember { mutableStateOf<List<ProductDto>>(emptyList()) }
    var categories by remember { mutableStateOf<List<PartCategoryDto>>(emptyList()) }
    var selectedCategory by remember { mutableStateOf<String?>(null) }
    var search by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        try { categories = api.getPartCategories().data ?: emptyList() } catch (_: Exception) {}
    }

    LaunchedEffect(selectedCategory, search) {
        loading = true
        error = null
        try {
            products = api.getParts(
                category = selectedCategory,
                search = search.trim().ifBlank { null },
            ).data?.items ?: emptyList()
        } catch (e: Exception) {
            error = e.message ?: "Could not load parts. Please try again."
        } finally {
            loading = false
        }
    }

    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Text("Parts & Accessories", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(
            value = search,
            onValueChange = { search = it },
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text("Search parts…") },
            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
            singleLine = true,
        )
        Spacer(Modifier.height(8.dp))
        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            item {
                FilterChip(
                    selected = selectedCategory == null,
                    onClick = { selectedCategory = null },
                    label = { Text("All") },
                )
            }
            items(categories) { cat ->
                FilterChip(
                    selected = selectedCategory == cat.slug,
                    onClick = { selectedCategory = cat.slug },
                    label = { Text(cat.name) },
                )
            }
        }
        Spacer(Modifier.height(12.dp))
        if (loading) CircularProgressIndicator(color = Primary)
        error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            items(products) { product ->
                ProductRow(product, apiBaseUrl, onClick = { onProductClick(product.slug) }) {
                    scope.launch { cartRepo.add(product) }
                }
            }
            if (!loading && products.isEmpty()) {
                item { Text("No parts found. Try another category or search.", color = mutedTextColor()) }
            }
        }
    }
}

@Composable
fun ProductCard(product: ProductDto, apiBaseUrl: String, onClick: () -> Unit, onAddCart: () -> Unit) {
    val brand = product.carModel?.brand?.name ?: product.part?.category?.name.orEmpty()
    Card(
        modifier = Modifier.width(200.dp).clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = cardContainerColor()),
    ) {
        AsyncImage(
            model = ImageUtils.productImage(product, apiBaseUrl),
            contentDescription = product.name,
            modifier = Modifier.fillMaxWidth().height(120.dp),
            contentScale = ContentScale.Crop,
        )
        Column(Modifier.padding(12.dp)) {
            if (brand.isNotBlank()) {
                Text(brand, color = mutedTextColor(), style = MaterialTheme.typography.labelSmall)
            }
            Text(product.name, maxLines = 2, style = MaterialTheme.typography.bodyMedium)
            Text("৳${"%,.0f".format(product.price)}", color = Primary, fontWeight = FontWeight.Bold)
            if (product.stock == 0) {
                Text("Out of stock", color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.labelSmall)
            }
            TextButton(onClick = onAddCart, enabled = product.stock > 0) { Text("Add to Cart") }
        }
    }
}

@Composable
fun ProductRow(product: ProductDto, apiBaseUrl: String, onClick: () -> Unit, onAddCart: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = cardContainerColor()),
    ) {
        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            AsyncImage(
                model = ImageUtils.productImage(product, apiBaseUrl),
                contentDescription = null,
                modifier = Modifier.size(72.dp).clip(RoundedCornerShape(8.dp)),
                contentScale = ContentScale.Crop,
            )
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(product.name, maxLines = 2)
                Text("৳${"%,.0f".format(product.price)}", color = Primary, fontWeight = FontWeight.Bold)
            }
            IconButton(onClick = onAddCart, enabled = product.stock > 0) {
                Icon(Icons.Default.AddShoppingCart, null, tint = Primary)
            }
        }
    }
}

@Composable
fun QuickCard(title: String, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Card(
        modifier = modifier.clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = cardContainerColor()),
    ) {
        Column(Modifier.padding(16.dp)) {
            Text(title, fontWeight = FontWeight.Bold)
            Text("Tap to open →", color = mutedTextColor(), style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
fun CartScreen(cartRepo: CartRepository, apiBaseUrl: String) {
    var items by remember { mutableStateOf(cartRepo.getItems()) }

    fun refresh() {
        items = cartRepo.getItems()
    }

    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        item { Text("Your Cart", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold) }
        if (items.isEmpty()) {
            item { Text("Your cart is empty. Browse cars or parts to add items.", color = mutedTextColor()) }
        }
        items(items) { item ->
            Card(colors = CardDefaults.cardColors(containerColor = cardContainerColor())) {
                Row(Modifier.padding(12.dp).fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    AsyncImage(
                        model = ImageUtils.resolve(item.thumbnailUrl, apiBaseUrl),
                        contentDescription = null,
                        modifier = Modifier.size(56.dp).clip(RoundedCornerShape(8.dp)),
                        contentScale = ContentScale.Crop,
                    )
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text(item.name, maxLines = 2)
                        Text("৳${"%,.0f".format(item.price)}", color = Primary)
                    }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconButton(onClick = {
                            cartRepo.updateQuantity(item.productId, item.quantity - 1)
                            refresh()
                        }) { Icon(Icons.Default.Remove, null) }
                        Text("${item.quantity}")
                        IconButton(onClick = {
                            cartRepo.updateQuantity(item.productId, item.quantity + 1)
                            refresh()
                        }) { Icon(Icons.Default.Add, null) }
                        IconButton(onClick = {
                            cartRepo.remove(item.productId)
                            refresh()
                        }) { Icon(Icons.Default.Delete, null) }
                    }
                }
            }
        }
        if (items.isNotEmpty()) {
            item {
                val total = items.sumOf { it.price * it.quantity }
                Text(
                    "Total: ৳${"%,.0f".format(total)}",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = Primary,
                )
                Button(onClick = {}, modifier = Modifier.fillMaxWidth().padding(top = 8.dp), enabled = false) {
                    Text("Checkout (coming soon)")
                }
            }
        }
    }
}

@Composable
fun AccountScreen(
    context: Context,
    api: ApiService,
    themeMode: ThemeMode,
    onThemeChange: (ThemeMode) -> Unit,
) {
    var tab by remember { mutableIntStateOf(0) }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var fullName by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var user by remember { mutableStateOf<UserDto?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var success by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        AuthStore.getToken(context)?.let { token ->
            ApiClient.setToken(token)
            try { user = api.getMe().data } catch (_: Exception) {}
        }
    }

    LazyColumn(
        Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item { Text("Account", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold) }

        item {
            Text("Appearance", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                ThemeMode.entries.forEach { mode ->
                    FilterChip(
                        selected = themeMode == mode,
                        onClick = { onThemeChange(mode) },
                        label = { Text(mode.name.lowercase().replaceFirstChar { it.uppercase() }) },
                    )
                }
            }
        }

        item {
            var apiUrl by remember { mutableStateOf(ApiConfig.getBaseUrl(context)) }
            Text("Server", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
            Text("Current: $apiUrl", color = mutedTextColor(), style = MaterialTheme.typography.bodySmall)
            OutlinedTextField(
                value = apiUrl,
                onValueChange = { apiUrl = it },
                label = { Text("API URL") },
                placeholder = { Text("http://192.168.0.221:4000") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = {
                    ApiConfig.setBaseUrl(context, apiUrl)
                    ApiClient.invalidate()
                    success = "Server URL saved. Close and reopen the app to reload data."
                    error = null
                }) { Text("Save URL") }
                OutlinedButton(onClick = {
                    ApiConfig.clearCustomUrl(context)
                    apiUrl = com.autohub.bd.BuildConfig.API_BASE_URL.trimEnd('/')
                    ApiClient.invalidate()
                    success = "Reset to default. Close and reopen the app."
                }) { Text("Reset") }
            }
        }

        if (user != null) {
            item {
                Text("Hello, ${user!!.fullName}")
                Text(user!!.email, color = mutedTextColor())
                user!!.phone?.let { Text(it, color = mutedTextColor()) }
                user!!.role?.let { role ->
                    val roleLabel = when (role) {
                        "super_admin" -> "Super Admin"
                        "moderator" -> "Moderator"
                        "staff" -> "Staff"
                        else -> role.replace('_', ' ').replaceFirstChar { it.uppercase() }
                    }
                    Text("Role: $roleLabel", color = Primary, fontWeight = FontWeight.SemiBold)
                }
            }
            if (user!!.role != null) {
                item {
                    Card(colors = CardDefaults.cardColors(containerColor = cardContainerColor())) {
                        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text("Admin access", fontWeight = FontWeight.SemiBold)
                            Text(
                                when (user!!.role) {
                                    "moderator" -> "Open admin.html in a browser to add and edit products."
                                    "super_admin" -> "Full admin panel is available on the website (admin.html)."
                                    else -> "Limited admin tools are available on the website."
                                },
                                color = mutedTextColor(),
                                style = MaterialTheme.typography.bodySmall,
                            )
                        }
                    }
                }
            }
            if (user!!.mustChangePassword == true) {
                item {
                    Text(
                        "You must change your password on first login via the website.",
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
            }
            item {
                Button(onClick = {
                    AuthStore.clear(context)
                    ApiClient.setToken(null)
                    user = null
                }) { Text("Sign Out") }
            }
        } else {
            item {
                TabRow(selectedTabIndex = tab) {
                    Tab(selected = tab == 0, onClick = { tab = 0 }, text = { Text("Sign In") })
                    Tab(selected = tab == 1, onClick = { tab = 1 }, text = { Text("Register") })
                }
            }
            item { OutlinedTextField(email, { email = it }, label = { Text("Email") }, modifier = Modifier.fillMaxWidth()) }
            item { OutlinedTextField(password, { password = it }, label = { Text("Password") }, modifier = Modifier.fillMaxWidth()) }
            if (tab == 1) {
                item { OutlinedTextField(fullName, { fullName = it }, label = { Text("Full Name") }, modifier = Modifier.fillMaxWidth()) }
                item { OutlinedTextField(phone, { phone = it }, label = { Text("Phone (optional)") }, modifier = Modifier.fillMaxWidth()) }
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
                                if (tab == 0) {
                                    val res = api.login(LoginRequest(email.trim(), password))
                                    val data = res.dataOrThrow()
                                    AuthStore.saveSession(context, data.accessToken, data.refreshToken)
                                    user = data.user
                                } else {
                                    if (fullName.trim().length < 2) {
                                        error = "Please enter your full name."
                                        return@launch
                                    }
                                    val res = api.register(
                                        RegisterRequest(
                                            email = email.trim(),
                                            password = password,
                                            fullName = fullName.trim(),
                                            phone = phone.trim().ifBlank { null },
                                        ),
                                    )
                                    val data = res.dataOrThrow()
                                    AuthStore.saveSession(context, data.accessToken, data.refreshToken)
                                    user = data.user
                                    success = "Account created successfully."
                                }
                            } catch (e: Exception) {
                                error = e.message
                            }
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                ) { Text(if (tab == 0) "Sign In" else "Create Account") }
            }
        }
    }
}
