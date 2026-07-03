package com.autohub.bd.data

import retrofit2.http.*

interface ApiService {
    @GET("/api/products/featured")
    suspend fun getFeatured(
        @Query("type") type: String? = null,
        @Query("limit") limit: Int? = null,
    ): ApiResponse<List<ProductDto>>

    @GET("/api/brands")
    suspend fun getBrands(): ApiResponse<List<BrandDto>>

    @GET("/api/cars")
    suspend fun getCars(
        @Query("page") page: Int = 1,
        @Query("pageSize") pageSize: Int = 48,
        @Query("brand") brand: String? = null,
        @Query("fuelType") fuelType: String? = null,
        @Query("search") search: String? = null,
    ): ApiResponse<PaginatedProducts>

    @GET("/api/parts")
    suspend fun getParts(
        @Query("page") page: Int = 1,
        @Query("pageSize") pageSize: Int = 48,
        @Query("category") category: String? = null,
        @Query("search") search: String? = null,
    ): ApiResponse<PaginatedProducts>

    @GET("/api/part-categories")
    suspend fun getPartCategories(): ApiResponse<List<PartCategoryDto>>

    @GET("/api/products/{slug}")
    suspend fun getProduct(@Path("slug") slug: String): ApiResponse<ProductDto>

    @POST("/api/auth/login")
    suspend fun login(@Body body: LoginRequest): ApiResponse<AuthData>

    @POST("/api/auth/register")
    suspend fun register(@Body body: RegisterRequest): ApiResponse<AuthData>

    @GET("/api/auth/me")
    suspend fun getMe(): ApiResponse<UserDto>

    @POST("/api/auth/refresh")
    suspend fun refreshToken(@Body body: RefreshRequest): ApiResponse<RefreshData>

    @POST("/api/auth/order-lookup")
    suspend fun orderLookup(@Body body: OrderLookupRequest): ApiResponse<OrderLookupDto>

    @GET("/api/appointments/service-centers")
    suspend fun getServiceCenters(): ApiResponse<List<ServiceCenterDto>>

    @GET("/api/appointments/slots")
    suspend fun getSlots(
        @Query("serviceCenterId") centerId: String,
        @Query("date") date: String,
    ): ApiResponse<List<SlotDto>>

    @POST("/api/appointments")
    suspend fun bookAppointment(@Body body: BookAppointmentRequest): ApiResponse<Any>

    @GET("/api/appointments/my")
    suspend fun getMyAppointments(): ApiResponse<List<AppointmentDto>>

    @POST("/api/chat/sessions")
    suspend fun startChat(@Body body: StartChatRequest = StartChatRequest()): ApiResponse<ChatSessionData>

    @PATCH("/api/chat/sessions/{id}/guest-info")
    suspend fun updateGuestInfo(
        @Path("id") sessionId: String,
        @Body body: GuestInfoRequest,
    ): ApiResponse<ChatSessionData>

    @GET("/api/chat/sessions/{id}/messages")
    suspend fun getChatMessages(@Path("id") sessionId: String): ApiResponse<List<ChatMessageDto>>

    @GET("/api/chat/quick-replies")
    suspend fun getQuickReplies(): ApiResponse<List<QuickReplyDto>>

    @GET("/api/support/faq")
    suspend fun getFaq(): ApiResponse<List<FaqCategoryDto>>

    @POST("/api/support/tickets")
    suspend fun createTicket(@Body body: SupportTicketRequest): ApiResponse<TicketCreatedDto>
}
