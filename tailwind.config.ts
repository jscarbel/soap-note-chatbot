import type { Config } from 'tailwindcss';

export default {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        hero: '#F8F8F8',
        customFont: '#1C2B2D',
        buttonBackground: '#1C2B2D',
      },
    },
  },
  plugins: [],
} satisfies Config;
