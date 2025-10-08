import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ThemeToggleProps {
  theme: 'light' | 'dark';
  onToggle: () => void;
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, className }) => {
  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center',
        className
      )}
    >
      <Sun
        className={cn(
          'h-5 w-5 transition-all duration-300',
          theme === 'dark' ? 'rotate-90 scale-0' : 'rotate-0 scale-100'
        )}
      />
      <Moon
        className={cn(
          'absolute h-5 w-5 transition-all duration-300',
          theme === 'dark' ? 'rotate-0 scale-100' : '-rotate-90 scale-0'
        )}
      />
    </div>
  );
};