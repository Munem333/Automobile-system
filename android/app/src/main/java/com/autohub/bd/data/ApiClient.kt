package com.autohub.bd.data

import android.content.Context
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.logging.HttpLoggingInterceptor
import org.json.JSONObject
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {
    private var token: String? = null
    private var cachedUrl: String? = null
    private var cachedService: ApiService? = null
    private val refreshLock = Any()

    fun setToken(t: String?) {
        token = t
    }

    fun invalidate() {
        cachedUrl = null
        cachedService = null
    }

    fun create(context: Context): ApiService {
        val baseUrl = ApiConfig.getBaseUrl(context) + "/"
        if (cachedService != null && cachedUrl == baseUrl) {
            return cachedService!!
        }

        val prefs = context.getSharedPreferences("autohub", Context.MODE_PRIVATE)
        token = prefs.getString("accessToken", null)

        val client = OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .addInterceptor(HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BASIC
            })
            .addInterceptor { chain ->
                val original = chain.request()
                val authed = original.newBuilder().apply {
                    token?.let { addHeader("Authorization", "Bearer $it") }
                }.build()

                var response = chain.proceed(authed)
                if (response.code == 401 && !original.url.encodedPath.contains("/auth/")) {
                    response.close()
                    val newToken = refreshAccessToken(context, baseUrl)
                    if (newToken != null) {
                        token = newToken
                        val retry = original.newBuilder()
                            .header("Authorization", "Bearer $newToken")
                            .build()
                        response = chain.proceed(retry)
                    }
                }
                response
            }
            .build()

        cachedUrl = baseUrl
        cachedService = Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(ApiService::class.java)

        return cachedService!!
    }

    private fun refreshAccessToken(context: Context, baseUrl: String): String? {
        synchronized(refreshLock) {
            val prefs = context.getSharedPreferences("autohub", Context.MODE_PRIVATE)
            val refreshToken = prefs.getString("refreshToken", null) ?: return null

            return try {
                val body = JSONObject().put("refreshToken", refreshToken).toString()
                    .toRequestBody("application/json".toMediaType())
                val request = Request.Builder()
                    .url("${baseUrl}api/auth/refresh")
                    .post(body)
                    .build()

                val client = OkHttpClient.Builder()
                    .connectTimeout(15, TimeUnit.SECONDS)
                    .readTimeout(15, TimeUnit.SECONDS)
                    .build()

                client.newCall(request).execute().use { response ->
                    val json = JSONObject(response.body?.string().orEmpty())
                    if (!json.optBoolean("success")) return null
                    val data = json.getJSONObject("data")
                    val accessToken = data.getString("accessToken")
                    val newRefresh = data.getString("refreshToken")
                    prefs.edit()
                        .putString("accessToken", accessToken)
                        .putString("refreshToken", newRefresh)
                        .apply()
                    accessToken
                }
            } catch (_: Exception) {
                null
            }
        }
    }

    fun authHeader(): String? = token?.let { "Bearer $it" }
}
