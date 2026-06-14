/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: { center: true },
    extend: {
      fontFamily: {
        // 衬线强调（拉丁：Playfair Display 高对比度衬线 / 中文：系统宋体 / 兜底：serif）
        display: ['"Playfair Display"', '"Cormorant Garamond"', '"PingFang SC"', '"Microsoft YaHei"', '"Songti SC"', '"STSong"', 'SimSun', 'Cambria', 'Constantia', '"Source Han Serif SC"', '"Noto Serif SC"', 'serif'],
        // 正文（拉丁：Inter / 中文：系统中英文）
        sans: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', '"PingFang SC"', '"Microsoft YaHei"', '"Hiragino Sans GB"', '"Source Han Sans CN"', 'system-ui', 'sans-serif'],
        // 等宽
        mono: ['"JetBrains Mono"', '"SF Mono"', '"Cascadia Code"', 'Consolas', 'monospace'],
      },
      colors: {
        // 纸面（背景主色）
        paper: {
          DEFAULT: '#ebe5d8',
          50: '#f5f1e8',
          100: '#ede7da',
          200: '#ddd5c2',
          300: '#c5bca8',
        },
        // 墨（文字主色）
        ink: {
          DEFAULT: '#1a1815',
          50: '#4a443c',
          100: '#3a352e',
          200: '#5c5447',
          300: '#8a8275',
        },
        // 烟灰（中性辅助）
        ash: {
          DEFAULT: '#8a8275',
          50: '#b8b0a3',
          100: '#a39a8a',
          200: '#8a8275',
          300: '#6e665a',
        },
        // 烧赭（单一强调色）
        umber: {
          DEFAULT: '#6b3d2e',
          50: '#8b5a47',
          100: '#7a4a3a',
          200: '#6b3d2e',
          300: '#4a281e',
        },
      },
      borderRadius: {
        'none': '0px',
        'sm': '2px',
        'DEFAULT': '4px',
        'md': '6px',
        'lg': '8px',
      },
      boxShadow: {
        // 仅保留极克制的 hairline 阴影
        'paper': '0 1px 0 rgba(26, 24, 21, 0.04)',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'fade-up': 'fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-down': 'fadeDown 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-in': 'scaleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'ticker': 'ticker 1.8s ease-in-out infinite',
        'drift': 'drift 30s ease-in-out infinite',
        'shimmer': 'shimmer 8s linear infinite',
        'marquee': 'marquee 60s linear infinite',
        'slide-in-right': 'slideInRight 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        ticker: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '1' },
        },
        // 极慢的有机漂移（用于唯一的色块）
        drift: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(-20px, 20px) scale(1.05)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
      letterSpacing: {
        'widest-2': '0.25em',
        'widest-3': '0.32em',
      },
    },
  },
  plugins: [],
};
