import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Hydrate from localStorage
        const hydrate = () => {
            try {
                const token = localStorage.getItem('token');
                const userData = localStorage.getItem('user');
                if (token && userData) {
                    const parsedUser = JSON.parse(userData);
                    setUser(parsedUser);
                    api.defaults.headers.common['Authorization'] = `Bearer ${token}`; // Set global header
                }
            } catch (error) {
                console.error("Failed to hydrate user session:", error);
                // Optional: Clear corrupted data
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            } finally {
                setLoading(false);
            }
        };

        hydrate();
    }, []);

    const login = async (email, password) => {
        try {
            const response = await api.post('/auth/login', { email, password });
            const { token, user } = response.data.data;

            // Save
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));

            // Set State & Header
            setUser(user);
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            return user;
        } catch (error) {
            throw error.response?.data?.message || "Login Failed";
        }
    };

    const refreshUser = async () => {
        try {
            const response = await api.get('/auth/me');
            const userData = response.data.data;
            if (userData) {
                // Normalize storeId if missing but store object exists
                if (userData.store && !userData.storeId) {
                    userData.storeId = userData.store.id;
                }
                setUser(userData);
                localStorage.setItem('user', JSON.stringify(userData));
            }
            return userData;
        } catch (error) {
            console.error("Failed to refresh user", error);
            return null;
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        delete api.defaults.headers.common['Authorization'];
    };

    const checkSubscriptionStatus = () => {
        if (!user?.tenant) return true; // Fail safe
        const { subscriptionStatus, subscriptionEndsAt, trialEndsAt } = user.tenant;
        const isActiveStatus = subscriptionStatus === 'ACTIVE' || subscriptionStatus === 'TRIAL';
        const expiryDate = subscriptionStatus === 'ACTIVE' ? subscriptionEndsAt : trialEndsAt;
        const now = new Date();
        const isDateValid = expiryDate ? new Date(expiryDate) > now : false;
        return isActiveStatus && isDateValid;
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, refreshUser, loading, checkSubscriptionStatus }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
