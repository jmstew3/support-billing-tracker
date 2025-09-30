interface SkeletonChartProps {
  height?: number | string;
  showTitle?: boolean;
  showLegend?: boolean;
}

export function SkeletonChart({
  height = 250,
  showTitle = true,
  showLegend = true
}: SkeletonChartProps) {
  return (
    <div className="border bg-card p-4" style={{ height: typeof height === 'number' ? `${height}px` : height }}>
      {/* Title skeleton */}
      {showTitle && (
        <div className="h-4 w-32 bg-muted animate-pulse mb-4" />
      )}

      {/* Chart area skeleton */}
      <div className="relative h-full w-full bg-muted/30 animate-pulse mb-4">
        {/* Simulated bar/line elements */}
        <div className="absolute bottom-0 left-4 w-8 bg-muted/60 animate-pulse" style={{ height: '60%', animationDelay: '100ms' }} />
        <div className="absolute bottom-0 left-16 w-8 bg-muted/60 animate-pulse" style={{ height: '80%', animationDelay: '200ms' }} />
        <div className="absolute bottom-0 left-28 w-8 bg-muted/60 animate-pulse" style={{ height: '45%', animationDelay: '300ms' }} />
        <div className="absolute bottom-0 left-40 w-8 bg-muted/60 animate-pulse" style={{ height: '90%', animationDelay: '400ms' }} />
        <div className="absolute bottom-0 left-52 w-8 bg-muted/60 animate-pulse" style={{ height: '70%', animationDelay: '500ms' }} />
      </div>

      {/* Legend skeleton */}
      {showLegend && (
        <div className="flex gap-4 mt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-3 w-3 bg-muted animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
              <div className="h-3 w-16 bg-muted animate-pulse" style={{ animationDelay: `${i * 100 + 50}ms` }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}