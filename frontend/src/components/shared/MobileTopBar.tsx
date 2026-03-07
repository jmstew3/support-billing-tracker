import { HamburgerButton } from './HamburgerButton';

interface MobileTopBarProps {
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  logo: React.ReactNode;
}

export function MobileTopBar({ isMenuOpen, onToggleMenu, logo }: MobileTopBarProps) {
  return (
    <div
      className="sm:hidden fixed top-0 left-0 right-0 z-20 h-14 bg-background border-b border-border/50 flex items-center justify-between px-3"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex items-center">{logo}</div>
      <HamburgerButton isOpen={isMenuOpen} onClick={onToggleMenu} />
    </div>
  );
}
