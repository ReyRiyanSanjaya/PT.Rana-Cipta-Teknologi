package com.rana.driver.mobile_driver

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {

    private val CHANNEL = "com.rana.driver/bubble"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "showBubble" -> {
                    val status = call.argument<String>("status") ?: "Online"
                    showBubble(status)
                    result.success(true)
                }
                "hideBubble" -> {
                    hideBubble()
                    result.success(true)
                }
                "updateBubble" -> {
                    val status = call.argument<String>("status") ?: "Online"
                    updateBubble(status)
                    result.success(true)
                }
                "canDrawOverlays" -> {
                    result.success(canDrawOverlays())
                }
                "requestOverlayPermission" -> {
                    requestOverlayPermission()
                    result.success(true)
                }
                else -> result.notImplemented()
            }
        }
    }

    private fun canDrawOverlays(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Settings.canDrawOverlays(this)
        } else {
            true
        }
    }

    private fun requestOverlayPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
            val intent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:$packageName")
            )
            startActivityForResult(intent, 1234)
        }
    }

    private fun showBubble(status: String) {
        if (!canDrawOverlays()) return
        val intent = Intent(this, BubbleService::class.java).apply {
            action = BubbleService.ACTION_SHOW
            putExtra(BubbleService.EXTRA_STATUS, status)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent)
        } else {
            startService(intent)
        }
    }

    private fun hideBubble() {
        val intent = Intent(this, BubbleService::class.java).apply {
            action = BubbleService.ACTION_HIDE
        }
        startService(intent)
    }

    private fun updateBubble(status: String) {
        val intent = Intent(this, BubbleService::class.java).apply {
            action = BubbleService.ACTION_UPDATE
            putExtra(BubbleService.EXTRA_STATUS, status)
        }
        startService(intent)
    }
}
