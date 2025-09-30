interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  columnWidths?: string[];
}

export function SkeletonTable({
  rows = 8,
  columns = 6,
  columnWidths = ['20%', '15%', '15%', '20%', '15%', '15%']
}: SkeletonTableProps) {
  return (
    <div className="border bg-card">
      {/* Header row */}
      <div className="flex gap-4 p-4 border-b bg-muted/30" style={{ boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={`header-${i}`}
            className="h-4 bg-muted animate-pulse"
            style={{ width: columnWidths[i] || `${100 / columns}%` }}
          />
        ))}
      </div>

      {/* Data rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={`row-${rowIndex}`}
          className="flex gap-4 p-4 border-b hover:bg-muted/20 transition-colors"
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div
              key={`cell-${rowIndex}-${colIndex}`}
              className="h-4 bg-muted animate-pulse"
              style={{
                width: columnWidths[colIndex] || `${100 / columns}%`,
                animationDelay: `${(rowIndex * 50 + colIndex * 25)}ms`
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}