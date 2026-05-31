package com.rana.driver.mobile_driver

import android.app.*
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.view.*
import android.widget.ImageView
import android.widget.TextView
import androidx.core.app.NotificationCompat

class BubbleService : Service() {

    private var windowManager: WindowManager? = null
    private var bubbleView: View? = null
    private var isShowing = false

    companion object {
        const val CHANNEL_ID = "bubble_channel"
        const val NOTIFICATION_ID = 1001
        const val ACTION_SHOW = "SHOW_BUBBLE"
        const val ACTION_HIDE = "HIDE_BUBBLE"
        const val ACTION_UPDATE = "UPDATE_BUBBLE"
        const val EXTRA_STATUS = "status"
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_SHOW -> showBubble(intent.getStringExtra(EXTRA_STATUS) ?: "Online")
            ACTION_HIDE -> hideBubble()
            ACTION_UPDATE -> updateBubble(intent.getStringExtra(EXTRA_STATUS) ?: "Online")
        }
        return START_STICKY
    }

    private fun showBubble(status: String) {
        if (isShowing) {
            updateBubble(status)
            return
        }

        // Start as foreground service
        val notification = createNotification(status)
        startForeground(NOTIFICATION_ID, notification)

        // Create bubble view from layout
        val inflater = getSystemService(LAYOUT_INFLATER_SERVICE) as LayoutInflater
        bubbleView = inflater.inflate(R.layout.bubble_layout, null)

        val params = WindowManager.LayoutParams(
            dpToPx(60),
            dpToPx(60),
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            else
                @Suppress("DEPRECATION")
                WindowManager.LayoutParams.TYPE_PHONE,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        )
        params.gravity = Gravity.TOP or Gravity.START
        params.x = 0
        params.y = 200

        // Make bubble draggable
        bubbleView?.setOnTouchListener(BubbleTouchListener(params, windowManager!!))

        // Tap to open app
        bubbleView?.setOnClickListener {
            val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
            launchIntent?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            startActivity(launchIntent)
        }

        windowManager?.addView(bubbleView, params)
        isShowing = true
    }

    private fun dpToPx(dp: Int): Int {
        return (dp * resources.displayMetrics.density).toInt()
    }

    private fun hideBubble() {
        if (isShowing && bubbleView != null) {
            windowManager?.removeView(bubbleView)
            bubbleView = null
            isShowing = false
        }
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    private fun updateBubble(status: String) {
        updateBubbleText(status)
        // Update notification too
        val notification = createNotification(status)
        val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        nm.notify(NOTIFICATION_ID, notification)
    }

    private fun updateBubbleText(status: String) {
        bubbleView?.findViewById<TextView>(android.R.id.text1)?.apply {
            text = status
            visibility = View.VISIBLE
        }
    }

    override fun onDestroy() {
        hideBubble()
        super.onDestroy()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Driver Status",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Shows driver online status"
                setShowBadge(false)
            }
            val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
            nm.createNotificationChannel(channel)
        }
    }

    private fun createNotification(status: String): Notification {
        val intent = packageManager.getLaunchIntentForPackage(packageName)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Rana Driver")
            .setContentText(status)
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    // Touch listener for dragging the bubble
    private class BubbleTouchListener(
        private val params: WindowManager.LayoutParams,
        private val windowManager: WindowManager
    ) : View.OnTouchListener {
        private var initialX = 0
        private var initialY = 0
        private var initialTouchX = 0f
        private var initialTouchY = 0f
        private var moved = false

        override fun onTouch(v: View, event: MotionEvent): Boolean {
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    initialX = params.x
                    initialY = params.y
                    initialTouchX = event.rawX
                    initialTouchY = event.rawY
                    moved = false
                    return true
                }
                MotionEvent.ACTION_MOVE -> {
                    val dx = (event.rawX - initialTouchX).toInt()
                    val dy = (event.rawY - initialTouchY).toInt()
                    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) moved = true
                    params.x = initialX + dx
                    params.y = initialY + dy
                    windowManager.updateViewLayout(v, params)
                    return true
                }
                MotionEvent.ACTION_UP -> {
                    if (!moved) {
                        v.performClick()
                    }
                    return true
                }
            }
            return false
        }
    }
}
