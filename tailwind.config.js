/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],

  theme: {
    extend: {
      colors: {
        primary: '#01134C',
        secondary: '#E8FC0A',
        accent: '#FFFFFF',
        muted: '#6B7280',
        light: '#F3F4F6',
        dark: '#111827',
        success: '#10B981',
        error: '#EF4444',
      },
     //*====={THEME FONTS}===>>>
           fontFamily: {
             Arial: ["Arial-bold", "sans-serif"],
             ArialLight: ["Arial-light", "sans-serif"],
             ArialThin: ["Arial-thin", "sans-serif"],
             poppins_Regular: ["Regular", "sans-serif"],
           },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        'soft': '0.75rem',
      },
      boxShadow: {
        soft: '0 4px 12px rgba(0, 0, 0, 0.08)',
        innerSoft: 'inset 0 2px 4px rgba(0, 0, 0, 0.06)',
      },
      spacing: {
        18: '4.5rem',
        22: '5.5rem',
      }
    },
  },
  plugins: [],
}
