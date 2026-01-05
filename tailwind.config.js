/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    DEFAULT: '#A63446',
                    dark: '#8a2b3a',
                    light: '#c84a5c',
                },
                background: {
                    soft: '#FEF9F3',
                }
            },
        },
    },
    plugins: [],
}
