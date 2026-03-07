export interface ClientPageHeaderProps {
  /**
   * Page title to display
   */
  title: string;

  /**
   * Optional subtitle/description
   */
  subtitle?: string;

  /**
   * Additional content to render on the right side
   */
  rightContent?: React.ReactNode;

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Client Portal Page Header
 *
 * Provides:
 * - Page title with optional subtitle
 * - Optional right-side content slot
 */
export function ClientPageHeader({
  title,
  subtitle,
  rightContent,
  className = '',
}: ClientPageHeaderProps) {
  return (
    <div className={`sticky top-0 z-10 bg-background border-b ${className}`}>
      <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between gap-3">
        {/* Left side: Title */}
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-0.5 hidden sm:block truncate">
              {subtitle}
            </p>
          )}
        </div>

        {/* Right side: Controls */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {rightContent && (
            <div className="hidden sm:block">
              {rightContent}
            </div>
          )}
        </div>
      </div>

      {/* Mobile subtitle */}
      {subtitle && (
        <div className="sm:hidden px-4 pb-3 -mt-1">
          <p className="text-sm text-muted-foreground truncate">
            {subtitle}
          </p>
        </div>
      )}

      {/* Mobile right content */}
      {rightContent && (
        <div className="sm:hidden px-4 py-2 border-t flex items-center gap-3">
          {rightContent}
        </div>
      )}
    </div>
  );
}
