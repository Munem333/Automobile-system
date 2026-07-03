package com.autohub.bd.data

import android.content.Context
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

data class CartItem(
    val productId: String,
    val name: String,
    val price: Double,
    val thumbnailUrl: String?,
    var quantity: Int,
)

class CartRepository(context: Context) {
    private val prefs = context.getSharedPreferences("autohub_cart", Context.MODE_PRIVATE)
    private val gson = Gson()
    private val _count = MutableStateFlow(0)
    val countFlow: StateFlow<Int> = _count.asStateFlow()

    init {
        refreshCount()
    }

    fun getItems(): List<CartItem> {
        val json = prefs.getString("items", "[]") ?: "[]"
        val type = object : TypeToken<List<CartItem>>() {}.type
        return gson.fromJson(json, type)
    }

    private fun saveItems(items: List<CartItem>) {
        prefs.edit().putString("items", gson.toJson(items)).apply()
        refreshCount()
    }

    private fun refreshCount() {
        _count.value = getItems().sumOf { it.quantity }
    }

    fun add(product: ProductDto, qty: Int = 1) {
        val items = getItems().toMutableList()
        val existing = items.find { it.productId == product.id }
        if (existing != null) {
            existing.quantity += qty
        } else {
            items.add(
                CartItem(
                    productId = product.id,
                    name = product.name,
                    price = product.price,
                    thumbnailUrl = product.thumbnailUrl ?: product.images.firstOrNull(),
                    quantity = qty,
                )
            )
        }
        saveItems(items)
    }

    fun updateQuantity(productId: String, quantity: Int) {
        if (quantity <= 0) {
            remove(productId)
            return
        }
        val items = getItems().toMutableList()
        items.find { it.productId == productId }?.quantity = quantity
        saveItems(items)
    }

    fun remove(productId: String) {
        saveItems(getItems().filter { it.productId != productId })
    }

    fun total(): Double = getItems().sumOf { it.price * it.quantity }

    fun count(): Int = getItems().sumOf { it.quantity }
}
