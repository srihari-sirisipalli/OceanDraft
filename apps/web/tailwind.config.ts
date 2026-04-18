import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'deep-sea': '#0B2540',
        'hull-navy': '#123A5C',
        'blueprint-cyan': '#2FB6C6',
        'anchor-steel': '#6B7E8F',
        'sail-white': '#F4F7FA',
        'brass-gold': '#C59D5F',
        'coral-red': '#D9534F',
        'foam-green': '#3DB27D',
      },
      fontFamily: {
        display: ['"Cinzel"', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      backgroundImage: {
        blueprint:
          'linear-gradient(rgba(47,182,198,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(47,182,198,0.07) 1px, transparent 1px)',
      },
      backgroundSize: {
        blueprint: '28px 28px',
      },
      boxShadow: {
        porthole: '0 0 0 4px rgba(47,182,198,0.15), 0 12px 40px -10px rgba(11,37,64,0.6)',
      },
    },
  },
  plugins: [],
};

export default config;
