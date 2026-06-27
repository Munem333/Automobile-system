package com.erppos

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.erppos.databinding.FragmentQrScannerBinding
import com.erppos.util.QrOrderHandler
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import kotlinx.coroutines.launch
import java.util.concurrent.Executors

class QrScannerFragment : Fragment(R.layout.fragment_qr_scanner) {
    private var _binding: FragmentQrScannerBinding? = null
    private val binding get() = _binding!!
    private var handled = false
    private val cameraExecutor = Executors.newSingleThreadExecutor()

    private val cameraPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { granted ->
        if (granted) {
            startCamera()
        } else {
            _binding?.textScanHint?.text = getString(R.string.qr_camera_denied)
        }
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        _binding = FragmentQrScannerBinding.bind(view)
        requestCamera()
    }

    override fun onResume() {
        super.onResume()
        handled = false
    }

    private fun requestCamera() {
        if (ContextCompat.checkSelfPermission(requireContext(), Manifest.permission.CAMERA)
            == PackageManager.PERMISSION_GRANTED
        ) {
            startCamera()
        } else {
            cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    private fun startCamera() {
        val providerFuture = ProcessCameraProvider.getInstance(requireContext())
        providerFuture.addListener({
            val provider = providerFuture.get()
            val preview = Preview.Builder().build().also {
                it.setSurfaceProvider(binding.previewView.surfaceProvider)
            }
            val analysis = ImageAnalysis.Builder()
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .build()
            val scanner = BarcodeScanning.getClient()
            analysis.setAnalyzer(cameraExecutor) { imageProxy ->
                if (handled || !isAdded) {
                    imageProxy.close()
                    return@setAnalyzer
                }
                val mediaImage = imageProxy.image
                if (mediaImage == null) {
                    imageProxy.close()
                    return@setAnalyzer
                }
                val image = InputImage.fromMediaImage(
                    mediaImage,
                    imageProxy.imageInfo.rotationDegrees,
                )
                scanner.process(image)
                    .addOnSuccessListener { barcodes ->
                        val raw = barcodes.firstOrNull { it.format == Barcode.FORMAT_QR_CODE }?.rawValue
                        if (!raw.isNullOrBlank()) {
                            handleScan(raw)
                        }
                    }
                    .addOnCompleteListener { imageProxy.close() }
            }
            try {
                provider.unbindAll()
                provider.bindToLifecycle(
                    viewLifecycleOwner,
                    CameraSelector.DEFAULT_BACK_CAMERA,
                    preview,
                    analysis,
                )
            } catch (_: Exception) {
                if (isAdded) {
                    binding.textScanHint.text = getString(R.string.qr_camera_failed)
                }
            }
        }, ContextCompat.getMainExecutor(requireContext()))
    }

    private fun handleScan(raw: String) {
        if (handled || !isAdded) return
        handled = true
        lifecycleScope.launch {
            val order = QrOrderHandler.processRaw(requireContext(), raw)
            if (!isAdded) return@launch
            if (order == null) {
                handled = false
                Toast.makeText(
                    requireContext(),
                    getString(R.string.qr_invalid_code),
                    Toast.LENGTH_LONG,
                ).show()
                return@launch
            }
            Toast.makeText(
                requireContext(),
                getString(R.string.qr_scan_success, order.total),
                Toast.LENGTH_LONG,
            ).show()
        }
    }

    override fun onDestroyView() {
        cameraExecutor.shutdown()
        super.onDestroyView()
        _binding = null
    }
}
