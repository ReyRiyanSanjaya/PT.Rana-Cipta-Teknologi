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
                primary: '#14B8A6', // Tosca Green (Teal 500)
                secondary: '#38BDF8', // Light Blue (Sky 400)
                success: '#10B981',
                warning: '#F59E0B',
                danger: '#EF4444',
                dark: '#0f172a', // Slate 900
                light: '#f0f9ff', // Sky 50
            },
            borderColor: theme => ({
                ...theme('colors'),
                DEFAULT: 'var(--border-primary)',
            }),
        },
    },
    plugins: [],
}
