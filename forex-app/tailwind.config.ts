import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0d0d1a',
          secondary: '#111120',
          panel: '#161628',
          hover: '#1e1e35',
        },
        accent: {
          blue: '#3b82f6',
          green: '#26a69a',
          red: '#ef5350',
          yellow: '#f59e0b',
          purple: '#8b5cf6',
        },
        border: '#1e1e35',
        text: {
          primary: '#e2e8f0',
          secondary: '#94a3b8',
          muted: '#475569',
        },
      },
    },
  },
  plugins: [],
}
export default config
