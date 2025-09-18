// Spacing design tokens

export const spacing = {
  // Base spacing scale (in rem)
  scale: {
    0: '0',
    px: '1px',
    0.5: '0.125rem',  // 2px
    1: '0.25rem',     // 4px
    1.5: '0.375rem',  // 6px
    2: '0.5rem',      // 8px
    2.5: '0.625rem',  // 10px
    3: '0.75rem',     // 12px
    3.5: '0.875rem',  // 14px
    4: '1rem',        // 16px
    5: '1.25rem',     // 20px
    6: '1.5rem',      // 24px
    7: '1.75rem',     // 28px
    8: '2rem',        // 32px
    9: '2.25rem',     // 36px
    10: '2.5rem',     // 40px
    11: '2.75rem',    // 44px
    12: '3rem',       // 48px
    14: '3.5rem',     // 56px
    16: '4rem',       // 64px
    20: '5rem',       // 80px
    24: '6rem',       // 96px
  },

  // Component-specific spacing
  components: {
    // Card spacing
    card: {
      padding: '1.5rem',      // 24px
      paddingCompact: '1rem', // 16px
      gap: '0.75rem',         // 12px
    },

    // Scorecard spacing
    scorecard: {
      padding: '1.5rem',
      headerGap: '0.375rem',  // 6px
      contentGap: '0.25rem',  // 4px
    },

    // Table spacing
    table: {
      cellPaddingX: '0.75rem', // 12px
      cellPaddingY: '0.5rem',  // 8px
      headerPaddingY: '0.75rem', // 12px
    },

    // Button spacing
    button: {
      paddingXSmall: '0.75rem',  // 12px
      paddingXMedium: '1rem',    // 16px
      paddingXLarge: '1.5rem',   // 24px
      paddingYSmall: '0.375rem', // 6px
      paddingYMedium: '0.5rem',  // 8px
      paddingYLarge: '0.75rem',  // 12px
    },

    // Form spacing
    form: {
      inputPaddingX: '0.75rem',
      inputPaddingY: '0.5rem',
      labelMarginBottom: '0.5rem',
      fieldGap: '1.5rem',
    },

    // Layout spacing
    layout: {
      containerPadding: '2rem',
      sectionGap: '3rem',
      contentGap: '1.5rem',
      sidebarWidth: '16rem',
    },
  },

  // Tailwind class mappings
  classes: {
    padding: {
      none: 'p-0',
      xs: 'p-1',
      sm: 'p-2',
      md: 'p-4',
      lg: 'p-6',
      xl: 'p-8',
    },
    margin: {
      none: 'm-0',
      xs: 'm-1',
      sm: 'm-2',
      md: 'm-4',
      lg: 'm-6',
      xl: 'm-8',
    },
    gap: {
      none: 'gap-0',
      xs: 'gap-1',
      sm: 'gap-2',
      md: 'gap-4',
      lg: 'gap-6',
      xl: 'gap-8',
    },
  },
};