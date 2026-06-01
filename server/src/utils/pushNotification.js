/**
 * Push Notification Utility
 * Sends FCM push notifications to driver devices
 * 
 * Setup:
 * 1. Set FCM_SERVER_KEY in .env
 * 2. Or use Firebase Admin SDK with service account
 */

const https = require('https');

const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY;
const FCM_URL = 'https://fcm.googleapis.com/fcm/send';

/**
 * Send push notification to a specific device
 * @param {string} fcmToken - Device FCM token
 * @param {object} notification - { title, body }
 * @param {object} data - Additional data payload
 */
const sendToDevice = async (fcmToken, notification, data = {}) => {
    if (!FCM_SERVER_KEY) {
        console.warn('[FCM] Server key not configured, skipping push');
        return null;
    }

    if (!fcmToken) {
        console.warn('[FCM] No FCM token provided');
        return null;
    }

    const payload = JSON.stringify({
        to: fcmToken,
        notification: {
            title: notification.title,
            body: notification.body,
            sound: 'default',
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
        data: {
            ...data,
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
        priority: 'high',
    });

    return _sendFCM(payload);
};

/**
 * Send push notification to a topic (e.g., all drivers)
 * @param {string} topic - Topic name (e.g., 'drivers')
 * @param {object} notification - { title, body }
 * @param {object} data - Additional data payload
 */
const sendToTopic = async (topic, notification, data = {}) => {
    if (!FCM_SERVER_KEY) {
        console.warn('[FCM] Server key not configured, skipping push');
        return null;
    }

    const payload = JSON.stringify({
        to: `/topics/${topic}`,
        notification: {
            title: notification.title,
            body: notification.body,
            sound: 'default',
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
        data: {
            ...data,
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
        priority: 'high',
    });

    return _sendFCM(payload);
};

/**
 * Send push to multiple devices
 * @param {string[]} fcmTokens - Array of FCM tokens
 * @param {object} notification - { title, body }
 * @param {object} data - Additional data payload
 */
const sendToMultiple = async (fcmTokens, notification, data = {}) => {
    if (!FCM_SERVER_KEY) {
        console.warn('[FCM] Server key not configured, skipping push');
        return null;
    }

    if (!fcmTokens || fcmTokens.length === 0) return null;

    const payload = JSON.stringify({
        registration_ids: fcmTokens.slice(0, 1000), // FCM limit
        notification: {
            title: notification.title,
            body: notification.body,
            sound: 'default',
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
        data: {
            ...data,
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
        priority: 'high',
    });

    return _sendFCM(payload);
};

/**
 * Internal: Send HTTP request to FCM
 */
const _sendFCM = (payload) => {
    return new Promise((resolve, reject) => {
        const url = new URL(FCM_URL);
        const options = {
            hostname: url.hostname,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `key=${FCM_SERVER_KEY}`,
                'Content-Length': Buffer.byteLength(payload),
            },
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (result.success) {
                        console.log(`[FCM] Sent successfully: ${result.success} success, ${result.failure} failure`);
                    }
                    resolve(result);
                } catch (e) {
                    resolve({ raw: data });
                }
            });
        });

        req.on('error', (e) => {
            console.error('[FCM] Send error:', e.message);
            resolve(null); // Don't reject - push is best-effort
        });

        req.setTimeout(10000, () => {
            req.destroy();
            resolve(null);
        });

        req.write(payload);
        req.end();
    });
};

module.exports = {
    sendToDevice,
    sendToTopic,
    sendToMultiple,
};
