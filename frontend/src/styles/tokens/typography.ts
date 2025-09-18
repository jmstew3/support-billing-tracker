// Typography design tokens

export const typography = {
  // Font sizes with their Tailwind class equivalents
  fontSize: {
    xs: 'text-xs',      // 12px / 0.75rem
    sm: 'text-sm',      // 14px / 0.875rem
    base: 'text-base',  // 16px / 1rem
    lg: 'text-lg',      // 18px / 1.125rem
    xl: 'text-xl',      // 20px / 1.25rem
    '2xl': 'text-2xl',  // 24px / 1.5rem
    '3xl': 'text-3xl',  // 30px / 1.875rem
    '4xl': 'text-4xl',  // 36px / 2.25rem
  },

  // Font weights
  fontWeight: {
    light: 'font-light',       // 300
    normal: 'font-normal',     // 400
    medium: 'font-medium',     // 500
    semibold: 'font-semibold', // 600
    bold: 'font-bold',         // 700
  },

  // Line heights
  lineHeight: {
    tight: 'leading-tight',     // 1.25
    normal: 'leading-normal',   // 1.5
    relaxed: 'leading-relaxed', // 1.625
    loose: 'leading-loose',     // 2
  },

  // Component-specific typography presets
  components: {
    // Dashboard components
    dashboardTitle: {
      size: 'text-3xl',
      weight: 'font-bold',
      tracking: 'tracking-tight',
    },

    // Scorecard components
    scorecardTitle: {
      size: 'text-sm',
      weight: 'font-medium',
    },
    scorecardValue: {
      size: 'text-2xl',
      weight: 'font-bold',
    },
    scorecardDescription: {
      size: 'text-xs',
      weight: 'font-normal',
    },

    // Table components
    tableHeader: {
      size: 'text-sm',
      weight: 'font-semibold',
    },
    tableCell: {
      size: 'text-sm',
      weight: 'font-normal',
    },

    // Button components
    buttonSmall: {
      size: 'text-xs',
      weight: 'font-medium',
    },
    buttonMedium: {
      size: 'text-sm',
      weight: 'font-medium',
    },
    buttonLarge: {
      size: 'text-base',
      weight: 'font-medium',
    },

    // Chart labels
    chartLabel: {
      size: 'text-xs',
      weight: 'font-medium',
    },
    chartTitle: {
      size: 'text-lg',
      weight: 'font-semibold',
    },
  },
};

// Utility function to combine typography classes
export const getTypographyClasses = (preset: keyof typeof typography.components): string => {
  const config = typography.components[preset];
  return `${config.size} ${config.weight} ${config.tracking || ''}`.trim();
};