/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class', // Enable class-based dark mode
    theme: {
        extend: {
            colors: {
                primary: '#1F5FBF', // RANA Blue (brand)
                secondary: '#2F92F0', // Bright Azure Blue
                success: '#10B981',
                warning: '#F59E0B',
                danger: '#EF4444',
                dark: '#0f172a', // Slate 900
                light: '#f0f9ff', // Sky 50

                // --- RANA brand recolor ---
                // Remap indigo/violet/purple scales to blues matching the RANA logo.
                // This recolors the whole UI to the brand palette without touching component code.
                indigo: {
                    50: '#eff6ff',
                    100: '#dbeafe',
                    200: '#bfdbfe',
                    300: '#8ec0f4',
                    400: '#5a9bea',
                    500: '#2f7ad9',
                    600: '#1f5fbf',
                    700: '#1b4d9b',
                    800: '#1a417d',
                    900: '#173766',
                    950: '#0f2342',
                },
                violet: {
                    50: '#eef7ff',
                    100: '#d9edff',
                    200: '#bce0ff',
                    300: '#8ecdff',
                    400: '#59b0fb',
                    500: '#3092f0',
                    600: '#1f73d6',
                    700: '#1b5cad',
                    800: '#1c4d8c',
                    900: '#1b4174',
                    950: '#122a4d',
                },
                purple: {
                    50: '#eef4fb',
                    100: '#d8e6f6',
                    200: '#b6cfee',
                    300: '#86afe0',
                    400: '#5188cd',
                    500: '#2f67b5',
                    600: '#21509a',
                    700: '#1d437d',
                    800: '#1c3a68',
                    900: '#193257',
                    950: '#101f39',
                },
            },
            borderColor: theme => ({
                ...theme('colors'),
                DEFAULT: 'var(--border-primary)',
            }),
        },
    },
    plugins: [],
}
