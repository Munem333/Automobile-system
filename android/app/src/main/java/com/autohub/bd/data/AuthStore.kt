package com.autohub.bd.data

import android.content.Context

object AuthStore {
    private const val PREFS = "autohub"

    fun getToken(context: Context): String? =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("accessToken", null)

    fun saveSession(context: Context, accessToken: String, refreshToken: String) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString("accessToken", accessToken)
            .putString("refreshToken", refreshToken)
            .apply()
        ApiClient.setToken(accessToken)
    }

    fun getRefreshToken(context: Context): String? =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("refreshToken", null)

    fun clear(context: Context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().clear().apply()
        ApiClient.setToken(null)
    }
}
