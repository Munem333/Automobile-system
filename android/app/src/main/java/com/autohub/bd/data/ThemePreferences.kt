package com.autohub.bd.data

import android.content.Context

enum class ThemeMode { LIGHT, DARK, SYSTEM }

object ThemePreferences {
    private const val PREFS = "autohub"
    private const val KEY = "theme_mode"

    fun get(context: Context): ThemeMode {
        val saved = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, "system")
        return when (saved) {
            "light" -> ThemeMode.LIGHT
            "dark" -> ThemeMode.DARK
            else -> ThemeMode.SYSTEM
        }
    }

    fun set(context: Context, mode: ThemeMode) {
        val value = when (mode) {
            ThemeMode.LIGHT -> "light"
            ThemeMode.DARK -> "dark"
            ThemeMode.SYSTEM -> "system"
        }
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, value).apply()
    }
}
