interface HamburgerButtonProps {
  isOpen: boolean;
  onClick: () => void;
  className?: string;
}

export function HamburgerButton({ isOpen, onClick, className = '' }: HamburgerButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`relative w-11 h-11 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${className}`}
      aria-label={isOpen ? 'Close menu' : 'Open menu'}
      aria-expanded={isOpen}
    >
      <div className="w-5 h-4 flex flex-col justify-between">
        <span
          className={`block h-0.5 w-full bg-foreground transition-all duration-300 origin-center ${
            isOpen ? 'translate-y-[7px] rotate-45' : ''
          }`}
        />
        <span
          className={`block h-0.5 w-full bg-foreground transition-all duration-300 ${
            isOpen ? 'opacity-0 scale-x-0' : ''
          }`}
        />
        <span
          className={`block h-0.5 w-full bg-foreground transition-all duration-300 origin-center ${
            isOpen ? '-translate-y-[7px] -rotate-45' : ''
          }`}
        />
      </div>
    </button>
  );
}
