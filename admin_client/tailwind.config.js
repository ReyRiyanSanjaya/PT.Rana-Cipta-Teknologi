/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
            },
            colors: {
                primary: {
                    50: '#F0FFF6',
                    100: '#E0F9EA',
                    200: '#B8F0D0',
                    300: '#85E3AE',
                    400: '#5DBB7B',
                    500: '#4DAA6A',
                    600: '#3D9A5A',
                    700: '#2D7A44',
                    800: '#1F5A30',
                    900: '#133A1F',
                }
            },
            borderRadius: {
                '2xl': '1rem',
                '3xl': '1.25rem',
            },
            boxShadow: {
                'soft': '0 2px 15px -3px rgba(93, 187, 123, 0.08), 0 4px 6px -4px rgba(93, 187, 123, 0.04)',
                'card': '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)',
            }
        },
    },
    plugins: [
        require('@tailwindcss/typography'),
    ],
}
