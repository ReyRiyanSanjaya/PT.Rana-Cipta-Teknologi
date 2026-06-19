import { useEffect, useState, useCallback } from 'react';

// Read the current theme from the <html> class / localStorage / system preference.
const getInitialTheme = () => {
    if (typeof window === 'undefined') return 'light';
    const stored = localStorage.getItem('theme');
    if (stored === 'dark' || stored === 'light') return stored;
    if (document.documentElement.classList.contains('dark')) return 'dark';
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
};

const applyTheme = (theme) => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
        root.classList.add('dark');
    } else {
        root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
};

/**
 * Shared theme hook. Keeps all toggle buttons across the app in sync
 * via a custom 'themechange' event, and persists the choice.
 */
const useTheme = () => {
    const [theme, setThemeState] = useState(getInitialTheme);

    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    // Sync when theme changes elsewhere (other toggle, other tab)
    useEffect(() => {
        const onThemeChange = (e) => {
            const next = e.detail || getInitialTheme();
            setThemeState((prev) => (prev !== next ? next : prev));
        };
        const onStorage = (e) => {
            if (e.key === 'theme' && (e.newValue === 'dark' || e.newValue === 'light')) {
                setThemeState(e.newValue);
            }
        };
        window.addEventListener('themechange', onThemeChange);
        window.addEventListener('storage', onStorage);
        return () => {
            window.removeEventListener('themechange', onThemeChange);
            window.removeEventListener('storage', onStorage);
        };
    }, []);

    const setTheme = useCallback((next) => {
        setThemeState(next);
        applyTheme(next);
        window.dispatchEvent(new CustomEvent('themechange', { detail: next }));
    }, []);

    const toggleTheme = useCallback(() => {
        setThemeState((prev) => {
            const next = prev === 'dark' ? 'light' : 'dark';
            applyTheme(next);
            window.dispatchEvent(new CustomEvent('themechange', { detail: next }));
            return next;
        });
    }, []);

    return { theme, setTheme, toggleTheme };
};

export default useTheme;
