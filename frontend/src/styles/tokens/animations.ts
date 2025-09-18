// Animation design tokens

export const animations = {
  // Transition durations
  duration: {
    instant: '0ms',
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
    slowest: '1000ms',
  },

  // Easing functions
  easing: {
    linear: 'linear',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },

  // Component animations
  components: {
    // Button transitions
    button: {
      duration: '150ms',
      easing: 'ease-in-out',
      properties: 'background-color, border-color, color, fill, stroke, opacity, box-shadow, transform',
    },

    // Card transitions
    card: {
      duration: '200ms',
      easing: 'ease-in-out',
      properties: 'box-shadow, transform',
    },

    // Theme toggle
    themeToggle: {
      duration: '300ms',
      easing: 'ease-in-out',
      properties: 'transform, opacity',
    },

    // Chart animations
    chart: {
      duration: '800ms',
      easing: 'ease-in-out',
    },

    // Tooltip
    tooltip: {
      duration: '100ms',
      easing: 'ease-out',
    },
  },

  // Tailwind animation classes
  classes: {
    spin: 'animate-spin',
    ping: 'animate-ping',
    pulse: 'animate-pulse',
    bounce: 'animate-bounce',
    none: 'animate-none',
  },
};