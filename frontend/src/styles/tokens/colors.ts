// Design system color tokens with light and dark mode support

export const colors = {
  // Brand colors
  brand: {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },
  },

  // Semantic colors for light mode
  semantic: {
    success: {
      light: '#10b981',
      dark: '#34d399',
      bg: '#d1fae5',
      bgDark: '#064e3b',
    },
    warning: {
      light: '#f59e0b',
      dark: '#fbbf24',
      bg: '#fef3c7',
      bgDark: '#78350f',
    },
    error: {
      light: '#ef4444',
      dark: '#f87171',
      bg: '#fee2e2',
      bgDark: '#7f1d1d',
    },
    info: {
      light: '#3b82f6',
      dark: '#60a5fa',
      bg: '#dbeafe',
      bgDark: '#1e3a8a',
    },
  },

  // Chart category colors (works in both themes)
  chart: {
    categories: {
      support: '#8884d8',
      hosting: '#82ca9d',
      forms: '#ffc658',
      billing: '#ff7c7c',
      email: '#8dd1e1',
      migration: '#d084d0',
      nonBillable: '#ffb347',
      advisory: '#87ceeb',
      general: '#98d8c8',
    },
    // Alternative darker versions for dark mode if needed
    categoriesDark: {
      support: '#9994e8',
      hosting: '#92da9d',
      forms: '#ffd668',
      billing: '#ff8c8c',
      email: '#9de1f1',
      migration: '#e094e0',
      nonBillable: '#ffc357',
      advisory: '#97deeb',
      general: '#a8e8d8',
    },
  },

  // Neutral colors
  neutral: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
    950: '#030712',
  },
};

// Color mappings for CSS variables (theme-aware)
export const colorMappings = {
  light: {
    // Backgrounds
    background: colors.neutral[50],
    foreground: colors.neutral[900],

    // Card backgrounds
    card: '#ffffff',
    cardForeground: colors.neutral[900],

    // Muted colors
    muted: colors.neutral[100],
    mutedForeground: colors.neutral[500],

    // Borders
    border: colors.neutral[200],

    // Primary colors
    primary: colors.brand.primary[600],
    primaryForeground: '#ffffff',

    // Chart colors
    chartColors: colors.chart.categories,
  },

  dark: {
    // Backgrounds
    background: colors.neutral[950],
    foreground: colors.neutral[50],

    // Card backgrounds
    card: colors.neutral[900],
    cardForeground: colors.neutral[50],

    // Muted colors
    muted: colors.neutral[800],
    mutedForeground: colors.neutral[400],

    // Borders
    border: colors.neutral[800],

    // Primary colors
    primary: colors.brand.primary[500],
    primaryForeground: colors.neutral[950],

    // Chart colors
    chartColors: colors.chart.categoriesDark,
  },
};