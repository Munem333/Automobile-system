package com.autohub.bd

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.collectAsState
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.autohub.bd.data.ApiClient
import com.autohub.bd.data.ApiConfig
import com.autohub.bd.data.CartRepository
import com.autohub.bd.data.ThemeMode
import com.autohub.bd.data.ThemePreferences
import com.autohub.bd.ui.screens.*
import com.autohub.bd.ui.theme.AutoHubTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val api = ApiClient.create(this)
        val cartRepo = CartRepository(this)

        setContent {
            val context = LocalContext.current
            var themeMode by remember { mutableStateOf(ThemePreferences.get(context)) }

            AutoHubTheme(themeMode = themeMode) {
                val navController = rememberNavController()
                val navBackStackEntry by navController.currentBackStackEntryAsState()
                val currentRoute = navBackStackEntry?.destination?.route
                val cartCount by cartRepo.countFlow.collectAsState()
                val apiBaseUrl = remember { ApiConfig.getBaseUrl(context) }

                val mainRoutes = setOf("home", "cars", "parts", "cart", "account")
                val showBottomBar = currentRoute in mainRoutes ||
                    currentRoute?.startsWith("cars/") == true

                Scaffold(
                    bottomBar = {
                        if (showBottomBar) {
                            NavigationBar {
                                listOf(
                                    Triple("home", Icons.Default.Home, "Home"),
                                    Triple("cars", Icons.Default.DirectionsCar, "Cars"),
                                    Triple("parts", Icons.Default.Build, "Parts"),
                                    Triple("cart", Icons.Default.ShoppingCart, "Cart"),
                                    Triple("account", Icons.Default.Person, "Account"),
                                ).forEach { (route, icon, label) ->
                                    NavigationBarItem(
                                        icon = {
                                            if (route == "cart" && cartCount > 0) {
                                                BadgedBox(badge = { Badge { Text("$cartCount") } }) {
                                                    Icon(icon, contentDescription = label)
                                                }
                                            } else {
                                                Icon(icon, contentDescription = label)
                                            }
                                        },
                                        label = { Text(label) },
                                        selected = currentRoute == route || (route == "cars" && currentRoute?.startsWith("cars") == true),
                                        onClick = {
                                            navController.navigate(route) {
                                                popUpTo("home") { saveState = true }
                                                launchSingleTop = true
                                                restoreState = true
                                            }
                                        },
                                    )
                                }
                            }
                        }
                    },
                ) { padding ->
                    NavHost(
                        navController = navController,
                        startDestination = "home",
                        modifier = Modifier.padding(padding),
                    ) {
                        composable("home") {
                            HomeScreen(context, api, cartRepo) { route ->
                                navController.navigate(route)
                            }
                        }
                        composable("cars") {
                            CarsScreen(api, cartRepo, initialBrand = null, apiBaseUrl = apiBaseUrl) { slug ->
                                navController.navigate("product/$slug")
                            }
                        }
                        composable(
                            route = "cars/{brand}",
                            arguments = listOf(navArgument("brand") { type = NavType.StringType }),
                        ) { entry ->
                            CarsScreen(
                                api,
                                cartRepo,
                                initialBrand = entry.arguments?.getString("brand"),
                                apiBaseUrl = apiBaseUrl,
                            ) { slug -> navController.navigate("product/$slug") }
                        }
                        composable("parts") {
                            PartsScreen(api, cartRepo, apiBaseUrl = apiBaseUrl) { slug ->
                                navController.navigate("product/$slug")
                            }
                        }
                        composable("cart") { CartScreen(cartRepo, apiBaseUrl) }
                        composable("account") {
                            AccountScreen(
                                context = context,
                                api = api,
                                themeMode = themeMode,
                                onThemeChange = { mode ->
                                    themeMode = mode
                                    ThemePreferences.set(context, mode)
                                },
                            )
                        }
                        composable("service") {
                            ServiceScreen(api) { navController.popBackStack() }
                        }
                        composable("chat") {
                            ChatScreen(context, api) { navController.popBackStack() }
                        }
                        composable("support") {
                            SupportScreen(api) { navController.popBackStack() }
                        }
                        composable("ev") {
                            EvScreen(
                                api = api,
                                cartRepo = cartRepo,
                                apiBaseUrl = apiBaseUrl,
                                onBack = { navController.popBackStack() },
                                onProductClick = { slug -> navController.navigate("product/$slug") },
                            )
                        }
                        composable("brands") {
                            BrandsScreen(
                                api = api,
                                apiBaseUrl = apiBaseUrl,
                                onBack = { navController.popBackStack() },
                                onBrandCars = { slug ->
                                    navController.navigate("cars/$slug") {
                                        popUpTo("home")
                                    }
                                },
                            )
                        }
                        composable(
                            route = "product/{slug}",
                            arguments = listOf(navArgument("slug") { type = NavType.StringType }),
                        ) { entry ->
                            ProductDetailScreen(
                                slug = entry.arguments?.getString("slug") ?: "",
                                api = api,
                                cartRepo = cartRepo,
                                apiBaseUrl = apiBaseUrl,
                                onBack = { navController.popBackStack() },
                            )
                        }
                    }
                }
            }
        }
    }
}
