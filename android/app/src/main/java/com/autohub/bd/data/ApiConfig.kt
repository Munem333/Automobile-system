package com.autohub.bd.data

import android.content.Context
import com.autohub.bd.BuildConfig

object ApiConfig {
    private const val PREFS = "autohub"
    private const val KEY_API_URL = "api_base_url"

    fun getBaseUrl(context: Context): String {
        val saved = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(KEY_API_URL, null)
            ?.trim()
            ?.trimEnd('/')
        if (!saved.isNullOrBlank()) return saved
        return BuildConfig.API_BASE_URL.trimEnd('/')
    }

    fun setBaseUrl(context: Context, url: String) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_API_URL, url.trim().trimEnd('/'))
            .apply()
    }

    fun clearCustomUrl(context: Context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .remove(KEY_API_URL)
            .apply()
    }
}
