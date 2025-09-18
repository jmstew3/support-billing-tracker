/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class', // Enable class-based dark mode
  safelist: [
    'bg-background',
    'text-foreground',
    'text-muted-foreground',
    'bg-muted',
    'border-border',
    'bg-card',
    'text-card-foreground',
    'bg-primary',
    'text-primary-foreground',
    'dark', // Add dark class to safelist
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Chart colors from design tokens
        chart: {
          support: "var(--chart-color-support)",
          hosting: "var(--chart-color-hosting)",
          forms: "var(--chart-color-forms)",
          billing: "var(--chart-color-billing)",
          email: "var(--chart-color-email)",
          migration: "var(--chart-color-migration)",
          'non-billable': "var(--chart-color-non-billable)",
          advisory: "var(--chart-color-advisory)",
          general: "var(--chart-color-general)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [
    function ({ addUtilities }) {
      addUtilities({
        '.bg-background': {
          'background-color': 'hsl(var(--background))',
        },
        '.text-foreground': {
          'color': 'hsl(var(--foreground))',
        },
        '.text-muted-foreground': {
          'color': 'hsl(var(--muted-foreground))',
        },
        '.bg-muted': {
          'background-color': 'hsl(var(--muted))',
        },
        '.border-border': {
          'border-color': 'hsl(var(--border))',
        },
        '.bg-card': {
          'background-color': 'hsl(var(--card))',
        },
        '.text-card-foreground': {
          'color': 'hsl(var(--card-foreground))',
        },
        '.text-primary': {
          'color': 'hsl(var(--primary))',
        },
        '.text-primary-foreground': {
          'color': 'hsl(var(--primary-foreground))',
        },
        '.bg-primary': {
          'background-color': 'hsl(var(--primary))',
        },
        '.bg-primary-foreground': {
          'background-color': 'hsl(var(--primary-foreground))',
        },
      })
    }
  ],
}
