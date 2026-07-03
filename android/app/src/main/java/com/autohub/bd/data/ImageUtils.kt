package com.autohub.bd.data

private const val DEFAULT_CAR_IMAGE =
    "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&h=600&fit=crop&q=85"

object ImageUtils {
    fun resolve(url: String?, baseUrl: String): String {
        val value = url?.trim().orEmpty()
        if (value.isEmpty()) return DEFAULT_CAR_IMAGE
        if (
            value.startsWith("http://") ||
            value.startsWith("https://") ||
            value.startsWith("data:")
        ) {
            return value
        }
        if (value.startsWith("/")) {
            return baseUrl.trimEnd('/') + value
        }
        return value
    }

    fun productImage(product: ProductDto, baseUrl: String): String =
        resolve(product.thumbnailUrl ?: product.images.firstOrNull(), baseUrl)

    fun brandImage(brand: BrandDto, baseUrl: String): String {
        val mapped = BRAND_HERO_IMAGES[brand.slug]
        return resolve(brand.logoUrl ?: mapped, baseUrl)
    }

    private val BRAND_HERO_IMAGES = mapOf(
        "toyota" to "https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800&h=450&fit=crop&q=85",
        "hyundai" to "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&h=450&fit=crop&q=85",
        "nissan" to "https://images.unsplash.com/photo-1618843479313-40f8afb5110d?w=800&h=450&fit=crop&q=85",
        "baw" to "https://images.pexels.com/photos/9190737/pexels-photo-9190737.jpeg?auto=compress&cs=tinysrgb&w=800&h=450&fit=crop&q=85",
    )
}
