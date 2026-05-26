package com.example.rana_merchant

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.graphics.drawable.RippleDrawable
import android.content.res.ColorStateList
import android.os.Build
import android.os.IBinder
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.ImageView
import androidx.core.content.ContextCompat
import android.widget.LinearLayout

class FloatingWidgetService : Service() {
    private lateinit var windowManager: WindowManager
    private var overlayView: View? = null
    private var layoutParams: WindowManager.LayoutParams? = null
    private var menuView: View? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startForeground(1, buildNotification())
        showOverlay()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        return START_STICKY
    }

    override fun onDestroy() {
        removeOverlay()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                "rana_merchant_overlay",
                "Rana Merchant Overlay",
                NotificationManager.IMPORTANCE_LOW
            )
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        val intent = Intent(this, MainActivity::class.java)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        val pi = PendingIntent.getActivity(
            this,
            0,
            intent,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M)
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            else PendingIntent.FLAG_UPDATE_CURRENT
        )
        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, "rana_merchant_overlay")
        } else {
            Notification.Builder(this)
        }
        return builder
            .setContentTitle("Rana Merchant aktif")
            .setContentText("Widget mengambang berjalan di latar belakang")
            .setSmallIcon(applicationInfo.icon)
            .setContentIntent(pi)
            .setOngoing(true)
            .build()
    }

    private fun dpToPx(dp: Int): Int {
        val density = resources.displayMetrics.density
        return (dp * density).toInt()
    }

    private fun showOverlay() {
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        val size = dpToPx(56)
        val container = FrameLayout(this)
        val gradient = GradientDrawable(
            GradientDrawable.Orientation.TL_BR,
            intArrayOf(0xFF2196F3.toInt(), 0xFF21CBF3.toInt())
        ).apply {
            shape = GradientDrawable.OVAL
            setStroke(dpToPx(1), 0x33FFFFFF.toInt())
        }
        val mask = GradientDrawable().apply {
            shape = GradientDrawable.OVAL
            setColor(0xFFFFFFFF.toInt())
        }
        val ripple = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            RippleDrawable(ColorStateList.valueOf(0x33FFFFFF.toInt()), gradient, mask)
        } else gradient
        container.background = ripple
        container.layoutParams = FrameLayout.LayoutParams(size, size)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            container.elevation = dpToPx(6).toFloat()
        }

        val iconSize = dpToPx(36)
        val icon = ImageView(this).apply {
            val d = ContextCompat.getDrawable(this@FloatingWidgetService, applicationInfo.icon)
            setImageDrawable(d)
            scaleType = ImageView.ScaleType.CENTER_INSIDE
            layoutParams = FrameLayout.LayoutParams(iconSize, iconSize).apply {
                gravity = Gravity.CENTER
            }
        }
        container.addView(icon)
        container.setOnClickListener {
            val intent = Intent(this, MainActivity::class.java)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            startActivity(intent)
        }
        container.setOnLongClickListener {
            toggleMenu()
            true
        }
        container.setOnTouchListener(object : View.OnTouchListener {
            private var initialX = 0
            private var initialY = 0
            private var initialTouchX = 0f
            private var initialTouchY = 0f
            private var moved = false
            override fun onTouch(v: View, event: MotionEvent): Boolean {
                when (event.action) {
                    MotionEvent.ACTION_DOWN -> {
                        initialX = layoutParams?.x ?: 0
                        initialY = layoutParams?.y ?: 0
                        initialTouchX = event.rawX
                        initialTouchY = event.rawY
                        moved = false
                        return true
                    }
                    MotionEvent.ACTION_MOVE -> {
                        val lp = layoutParams ?: return false
                        lp.x = initialX + (event.rawX - initialTouchX).toInt()
                        lp.y = initialY + (event.rawY - initialTouchY).toInt()
                        windowManager.updateViewLayout(container, lp)
                        moved = true
                        hideMenu()
                        return true
                    }
                    MotionEvent.ACTION_UP -> {
                        val lp = layoutParams ?: return false
                        val screenWidth = resources.displayMetrics.widthPixels
                        lp.x = if (lp.x + (size / 2) > screenWidth / 2)
                            screenWidth - size - dpToPx(12)
                        else
                            dpToPx(12)
                        windowManager.updateViewLayout(container, lp)
                        return moved
                    }
                }
                return false
            }
        })

        val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        else WindowManager.LayoutParams.TYPE_PHONE
        val lp = WindowManager.LayoutParams(
            size,
            size,
            type,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        )
        lp.gravity = Gravity.TOP or Gravity.START
        lp.x = dpToPx(12)
        lp.y = dpToPx(120)
        layoutParams = lp
        overlayView = container
        windowManager.addView(container, lp)
    }

    private fun removeOverlay() {
        val v = overlayView
        if (v != null) {
            windowManager.removeView(v)
            overlayView = null
        }
        hideMenu()
    }

    private fun hideMenu() {
        val mv = menuView ?: return
        try {
            windowManager.removeView(mv)
        } catch (_: Exception) { }
        menuView = null
    }

    private fun toggleMenu() {
        if (menuView != null) {
            hideMenu()
            return
        }
        val bubble = overlayView ?: return
        val size = dpToPx(56)
        val spacing = dpToPx(8)
        val actionSize = dpToPx(48)
        val actions = listOf(
            Pair("orders", android.R.drawable.ic_menu_agenda),
            Pair("scan", android.R.drawable.ic_menu_camera),
            Pair("pos", android.R.drawable.ic_dialog_dialer),
            Pair("notifications", android.R.drawable.ic_dialog_info)
        )
        val container = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                actionSize
            )
        }
        actions.forEach { (action, iconRes) ->
            val itemBg = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(0xCCFFFFFF.toInt())
            }
            val mask = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(0xFFFFFFFF.toInt())
            }
            val item = FrameLayout(this).apply {
                val ripple = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    RippleDrawable(ColorStateList.valueOf(0x22000000), itemBg, mask)
                } else itemBg
                background = ripple
                layoutParams = LinearLayout.LayoutParams(actionSize, actionSize).apply {
                    setMargins(spacing, 0, spacing, 0)
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    elevation = dpToPx(3).toFloat()
                }
                setOnClickListener {
                    val intent = Intent(this@FloatingWidgetService, MainActivity::class.java)
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                    intent.putExtra("overlay_action", action)
                    startActivity(intent)
                    hideMenu()
                }
            }
            val icon = ImageView(this).apply {
                setImageDrawable(ContextCompat.getDrawable(this@FloatingWidgetService, iconRes))
                scaleType = ImageView.ScaleType.CENTER_INSIDE
                layoutParams = FrameLayout.LayoutParams(dpToPx(24), dpToPx(24)).apply {
                    gravity = Gravity.CENTER
                }
            }
            item.addView(icon)
            container.addView(item)
        }
        val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        else WindowManager.LayoutParams.TYPE_PHONE
        val lp = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            actionSize + dpToPx(2),
            type,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        )
        val screenWidth = resources.displayMetrics.widthPixels
        val bubbleLp = layoutParams ?: return
        val placeRight = bubbleLp.x < screenWidth / 2
        lp.gravity = Gravity.TOP or (if (placeRight) Gravity.START else Gravity.END)
        lp.y = bubbleLp.y
        lp.x = if (placeRight) bubbleLp.x + size + spacing else screenWidth - bubbleLp.x + spacing
        menuView = container
        windowManager.addView(container, lp)
    }
}
