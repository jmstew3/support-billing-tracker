import { useEffect, useState } from 'react';
import { colors } from '../styles/tokens/colors';

type Theme = 'light' | 'dark';

export const useTheme = () => {
  // Initialize theme from localStorage or default to light
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'light';

    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) return savedTheme;

    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }

    return 'light';
  });

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;

    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Save to localStorage
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Toggle theme function
  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  // Set specific theme
  const setSpecificTheme = (newTheme: Theme) => {
    setTheme(newTheme);
  };

  // Get chart colors based on current theme
  const getChartColors = () => {
    return theme === 'dark' ? colors.chart.categoriesDark : colors.chart.categories;
  };

  // Get semantic color based on theme
  const getSemanticColor = (type: 'success' | 'warning' | 'error' | 'info', variant: 'light' | 'dark' | 'bg') => {
    if (variant === 'bg') {
      return theme === 'dark' ? colors.semantic[type].bgDark : colors.semantic[type].bg;
    }
    return theme === 'dark' ? colors.semantic[type].dark : colors.semantic[type].light;
  };

  // Listen for system theme changes
  useEffect(() => {
    if (!window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      // Only change if no saved preference
      if (!localStorage.getItem('theme')) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return {
    theme,
    toggleTheme,
    setTheme: setSpecificTheme,
    getChartColors,
    getSemanticColor,
    isDark: theme === 'dark',
    isLight: theme === 'light',
  };
};