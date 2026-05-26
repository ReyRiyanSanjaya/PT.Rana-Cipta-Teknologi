package com.example.rana_merchant

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.ContextCompat
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private var overlayChannel: MethodChannel? = null

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        overlayChannel = MethodChannel(
            flutterEngine.dartExecutor.binaryMessenger,
            "rana_merchant/overlay"
        )
        overlayChannel?.setMethodCallHandler { call, result ->
            when (call.method) {
                "hasOverlayPermission" -> {
                    val ok = Settings.canDrawOverlays(this)
                    result.success(ok)
                }
                "openOverlaySettings" -> {
                    val intent = Intent(
                        Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        Uri.parse("package:$packageName")
                    )
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    startActivity(intent)
                    result.success(true)
                }
                "startOverlay" -> {
                    val intent = Intent(this, FloatingWidgetService::class.java)
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        ContextCompat.startForegroundService(this, intent)
                    } else {
                        startService(intent)
                    }
                    result.success(true)
                }
                "stopOverlay" -> {
                    val intent = Intent(this, FloatingWidgetService::class.java)
                    stopService(intent)
                    result.success(true)
                }
                else -> result.notImplemented()
            }
        }
        handleOverlayAction(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleOverlayAction(intent)
    }

    private fun handleOverlayAction(intent: Intent?) {
        val action = intent?.getStringExtra("overlay_action") ?: return
        overlayChannel?.invokeMethod("navigate", action)
    }
}
