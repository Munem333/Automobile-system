package com.erppos

import com.erppos.BuildConfig
import android.content.res.ColorStateList
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.findNavController
import com.erppos.data.AppDatabase
import com.erppos.databinding.FragmentSettingsBinding
import com.erppos.util.ThemeHelper
import androidx.core.content.ContextCompat
import com.google.android.material.button.MaterialButtonToggleGroup
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class SettingsFragment : Fragment(R.layout.fragment_settings) {
    private var _binding: FragmentSettingsBinding? = null
    private val binding get() = _binding!!

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        _binding = FragmentSettingsBinding.bind(view)

        binding.textVersion.text = "Version ${BuildConfig.VERSION_NAME}"
        binding.switchAutoStart.isChecked = true
        setupThemeToggle()

        binding.btnClearHistory.setOnClickListener {
            lifecycleScope.launch {
                withContext(Dispatchers.IO) {
                    AppDatabase.get(requireContext()).entryDao().deleteAll()
                }
                requireContext().sendBroadcast(android.content.Intent(MainActivity.ACTION_REFRESH_UI))
                Toast.makeText(requireContext(), "History cleared", Toast.LENGTH_SHORT).show()
            }
        }

        binding.btnOpenDevices.setOnClickListener {
            findNavController().navigate(R.id.devicesFragment)
        }
    }

    private fun setupThemeToggle() {
        when (ThemeHelper.getTheme(requireContext())) {
            ThemeHelper.THEME_LIGHT -> binding.toggleTheme.check(R.id.btn_theme_light)
            ThemeHelper.THEME_DARK -> binding.toggleTheme.check(R.id.btn_theme_dark)
            else -> binding.toggleTheme.check(R.id.btn_theme_system)
        }
        updateThemeButtonStyles()

        binding.toggleTheme.addOnButtonCheckedListener(
            MaterialButtonToggleGroup.OnButtonCheckedListener { _, checkedId, isChecked ->
                if (!isChecked) return@OnButtonCheckedListener
                val theme = when (checkedId) {
                    R.id.btn_theme_light -> ThemeHelper.THEME_LIGHT
                    R.id.btn_theme_dark -> ThemeHelper.THEME_DARK
                    else -> ThemeHelper.THEME_SYSTEM
                }
                if (theme == ThemeHelper.getTheme(requireContext())) return@OnButtonCheckedListener
                ThemeHelper.setTheme(requireContext(), theme)
                updateThemeButtonStyles()
                requireActivity().recreate()
            },
        )
        updateThemeButtonStyles()
    }

    private fun updateThemeButtonStyles() {
        val checkedId = binding.toggleTheme.checkedButtonId
        listOf(binding.btnThemeLight, binding.btnThemeDark, binding.btnThemeSystem).forEach { btn ->
            val selected = btn.id == checkedId
            btn.strokeColor = ColorStateList.valueOf(
                ContextCompat.getColor(
                    requireContext(),
                    if (selected) R.color.accent_purple else R.color.border_color,
                ),
            )
            btn.backgroundTintList = ColorStateList.valueOf(
                ContextCompat.getColor(
                    requireContext(),
                    if (selected) R.color.purple_tint else android.R.color.transparent,
                ),
            )
            btn.setTextColor(ContextCompat.getColor(requireContext(), R.color.text_primary))
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
