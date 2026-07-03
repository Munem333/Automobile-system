package com.autohub.bd.data

data class ApiResponse<T>(
    val success: Boolean,
    val data: T? = null,
    val error: String? = null,
    val message: String? = null,
)

class ApiException(message: String) : Exception(message)

fun <T> ApiResponse<T>.dataOrThrow(): T {
    if (!success || data == null) {
        throw ApiException(error ?: message ?: "Something went wrong. Please try again.")
    }
    return data
}

data class ProductDto(
    val id: String,
    val type: String,
    val name: String,
    val slug: String,
    val price: Double,
    val compareAtPrice: Double? = null,
    val stock: Int,
    val sku: String,
    val thumbnailUrl: String? = null,
    val images: List<String> = emptyList(),
    val isFeatured: Boolean = false,
    val carModel: CarModelDto? = null,
    val part: PartDto? = null,
)

data class CarModelDto(
    val id: String,
    val name: String,
    val slug: String,
    val bodyType: String? = null,
    val fuelType: String? = null,
    val brand: BrandDto? = null,
    val heroImageUrl: String? = null,
    val model3dUrl: String? = null,
    val description: String? = null,
)

data class PartDto(
    val id: String,
    val name: String,
    val slug: String,
    val partNumber: String? = null,
    val category: PartCategoryDto? = null,
)

data class BrandDto(
    val id: String,
    val name: String,
    val slug: String,
    val logoUrl: String? = null,
    val description: String? = null,
)

data class PartCategoryDto(
    val id: String,
    val name: String,
    val slug: String,
)

data class PaginatedProducts(
    val items: List<ProductDto>,
    val total: Int,
    val page: Int,
    val pageSize: Int,
    val totalPages: Int = 1,
)

data class LoginRequest(val email: String, val password: String)

data class RegisterRequest(
    val email: String,
    val password: String,
    val fullName: String,
    val phone: String? = null,
)

data class AuthData(
    val user: UserDto,
    val accessToken: String,
    val refreshToken: String,
)

data class UserDto(
    val id: String,
    val email: String,
    val fullName: String,
    val phone: String? = null,
    val role: String? = null,
    val permissions: List<String>? = null,
    val mustChangePassword: Boolean? = null,
)

data class RefreshRequest(val refreshToken: String)

data class RefreshData(
    val accessToken: String,
    val refreshToken: String,
)

data class ServiceCenterDto(
    val id: String,
    val name: String,
    val address: String,
    val city: String,
    val phone: String,
)

data class SlotDto(val time: String, val available: Boolean)

data class BookAppointmentRequest(
    val serviceCenterId: String,
    val serviceType: String,
    val carBrand: String,
    val carModel: String,
    val carYear: Int? = null,
    val issueDescription: String? = null,
    val preferredDate: String,
    val preferredTime: String,
    val contactName: String,
    val contactPhone: String,
    val contactEmail: String? = null,
)

data class AppointmentDto(
    val id: String,
    val serviceType: String,
    val carBrand: String,
    val carModel: String,
    val preferredDate: String,
    val preferredTime: String,
    val status: String,
    val serviceCenter: ServiceCenterDto? = null,
)

data class ChatSessionData(
    val session: ChatSessionDto,
    val messages: List<ChatMessageDto>,
)

data class ChatSessionDto(val id: String, val guestName: String?, val isActive: Boolean)

data class ChatMessageDto(
    val id: String,
    val sessionId: String,
    val senderType: String,
    val senderName: String,
    val content: String,
    val createdAt: String,
)

data class StartChatRequest(
    val guestName: String? = null,
    val guestPhone: String? = null,
)

data class GuestInfoRequest(val guestName: String, val guestPhone: String)

data class QuickReplyDto(
    val id: String,
    val title: String,
    val content: String,
)

data class FaqItemDto(val id: String, val question: String, val answer: String)

data class FaqCategoryDto(
    val id: String,
    val name: String,
    val items: List<FaqItemDto> = emptyList(),
)

data class SupportTicketRequest(
    val name: String,
    val email: String,
    val phone: String? = null,
    val subject: String,
    val message: String,
)

data class TicketCreatedDto(val id: String, val status: String)

data class OrderLookupRequest(val orderNumber: String, val contact: String)

data class OrderLookupDto(
    val orderNumber: String,
    val status: String,
    val total: Double,
    val currency: String,
    val createdAt: String,
    val items: List<OrderItemLookupDto> = emptyList(),
)

data class OrderItemLookupDto(
    val productName: String,
    val quantity: Int,
    val totalPrice: Double,
)
