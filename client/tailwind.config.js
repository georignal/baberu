/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#f7f7f6',
        panel: '#ffffff',
        'panel-2': '#fbfbfa',
        muted: '#6f6f6f',
        subtle: '#9a9a9a',
        border: '#e7e5e1',
        'border-strong': '#d8d5ce',
        accent: '#0f766e',
        'accent-soft': '#e6f4f1',
        danger: '#b42318',
        warning: '#b7791f',
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          '"Noto Sans SC"',
          '"Noto Sans JP"',
          'sans-serif',
        ],
      },
      borderRadius: {
        DEFAULT: '14px',
        sm: '10px',
      },
      boxShadow: {
        panel: '0 1px 2px rgba(15,23,42,.04), 0 12px 32px rgba(15,23,42,.06)',
      },
    },
  },
  plugins: [],
};
