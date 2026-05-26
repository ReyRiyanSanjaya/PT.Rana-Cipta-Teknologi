import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchNotifications, markNotificationsRead } from '../services/api';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);

    const loadNotifications = async () => {
        if (!user) return;
        // Don't set global loading state on refresh to avoid UI flickering
        // Only set it if it's the first load? For now simple.
        
        try {
            const data = await fetchNotifications();
            if (Array.isArray(data)) {
                setNotifications(data);
                setUnreadCount(data.filter(n => !n.isRead).length);
            }
        } catch (error) {
            console.error("Failed to load notifications", error);
        }
    };

    const markAllRead = async () => {
        try {
            // Optimistic update
            const updated = notifications.map(n => ({ ...n, isRead: true }));
            setNotifications(updated);
            setUnreadCount(0);
            
            await markNotificationsRead();
        } catch (error) {
            console.error("Failed to mark notifications read", error);
            loadNotifications();
        }
    };

    useEffect(() => {
        if (user) {
            loadNotifications();
            // Poll every 60s
            const interval = setInterval(loadNotifications, 60000);
            return () => clearInterval(interval);
        } else {
            setNotifications([]);
            setUnreadCount(0);
        }
    }, [user]);

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, loading, loadNotifications, markAllRead }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => useContext(NotificationContext);
