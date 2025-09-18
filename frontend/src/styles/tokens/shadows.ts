// Shadow design tokens

export const shadows = {
  // Base shadow scale
  none: 'shadow-none',
  sm: 'shadow-sm',
  base: 'shadow',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
  '2xl': 'shadow-2xl',
  inner: 'shadow-inner',

  // Component-specific shadows
  components: {
    card: 'shadow-sm',
    cardHover: 'shadow-md',
    dropdown: 'shadow-lg',
    modal: 'shadow-xl',
    tooltip: 'shadow-md',
    button: 'shadow-sm',
    buttonHover: 'shadow',
  },

  // Custom shadow values for CSS variables
  custom: {
    light: {
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
      xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
    },
    dark: {
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.25)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.3)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.35)',
      xl: '0 20px 25px -5px rgb(0 0 0 / 0.4)',
    },
  },
};