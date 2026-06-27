package com.erppos.util

import android.content.Context
import androidx.appcompat.app.AppCompatDelegate

object ThemeHelper {
    private const val PREFS = "erp_pos_prefs"
    private const val KEY_THEME = "theme"

    const val THEME_LIGHT = "light"
    const val THEME_DARK = "dark"
    const val THEME_SYSTEM = "system"

    fun apply(context: Context) {
        AppCompatDelegate.setDefaultNightMode(nightMode(getTheme(context)))
    }

    fun getTheme(context: Context): String {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(KEY_THEME, THEME_SYSTEM) ?: THEME_SYSTEM
    }

    fun setTheme(context: Context, theme: String) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_THEME, theme)
            .apply()
        AppCompatDelegate.setDefaultNightMode(nightMode(theme))
    }

    private fun nightMode(theme: String): Int {
        return when (theme) {
            THEME_LIGHT -> AppCompatDelegate.MODE_NIGHT_NO
            THEME_DARK -> AppCompatDelegate.MODE_NIGHT_YES
            else -> AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM
        }
    }
}
