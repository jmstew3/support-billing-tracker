import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Reusable hook for overlay behaviors: body scroll lock, Escape key,
 * focus trap, and route-change close.
 */
export function useOverlay(
  isOpen: boolean,
  onClose: () => void,
  containerRef: React.RefObject<HTMLElement | null>,
  triggerRef?: React.RefObject<HTMLElement | null>,
) {
  const savedScrollY = useRef(0);
  const location = useLocation();
  const prevPathname = useRef(location.pathname);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      savedScrollY.current = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${savedScrollY.current}px`;
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, savedScrollY.current);
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
    };
  }, [isOpen]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus trap
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const container = containerRef.current;
    const focusableSelector =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

    // Focus first focusable element
    const firstFocusable = container.querySelector<HTMLElement>(focusableSelector);
    firstFocusable?.focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusables = container.querySelectorAll<HTMLElement>(focusableSelector);
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleTab);
    return () => {
      document.removeEventListener('keydown', handleTab);
      // Return focus to trigger element
      triggerRef?.current?.focus();
    };
  }, [isOpen, containerRef, triggerRef]);

  // Route change close
  useEffect(() => {
    if (isOpen && location.pathname !== prevPathname.current) {
      onClose();
    }
    prevPathname.current = location.pathname;
  }, [location.pathname, isOpen, onClose]);
}
