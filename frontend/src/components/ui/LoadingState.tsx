import { SkeletonScorecard } from './SkeletonScorecard';
import { SkeletonTable } from './SkeletonTable';
import { SkeletonChart } from './SkeletonChart';

interface LoadingStateProps {
  variant: 'dashboard' | 'projects' | 'hosting' | 'overview';
}

export function LoadingState({ variant }: LoadingStateProps) {
  if (variant === 'dashboard') {
    return (
      <div className="flex flex-col h-full">
        {/* Header with filters - skeleton */}
        <div className="sticky top-0 z-10 bg-background border-b border-border">
          <div className="px-8 py-4 h-16 flex items-center justify-between">
            <div className="h-6 w-48 bg-muted animate-pulse" />
            <div className="flex items-center gap-4">
              <div className="h-8 w-32 bg-muted animate-pulse" />
              <div className="h-8 w-32 bg-muted animate-pulse" />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-8 space-y-8">
            {/* Scorecards - 4 across */}
            <div className="grid grid-cols-4 gap-6">
              <SkeletonScorecard />
              <SkeletonScorecard />
              <SkeletonScorecard />
              <SkeletonScorecard />
            </div>

            {/* Charts - 3 across */}
            <div className="grid grid-cols-3 gap-6">
              <SkeletonChart height={250} />
              <SkeletonChart height={250} />
              <SkeletonChart height={250} />
            </div>

            {/* Table */}
            <SkeletonTable rows={12} columns={9} columnWidths={['12%', '8%', '8%', '25%', '12%', '10%', '10%', '8%', '7%']} />
          </div>
        </main>
      </div>
    );
  }

  if (variant === 'projects') {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b border-border">
          <div className="px-8 py-4 h-16 flex items-center justify-between">
            <div className="h-6 w-32 bg-muted animate-pulse" />
            <div className="flex items-center gap-4">
              <div className="h-8 w-32 bg-muted animate-pulse" />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-8 space-y-8">
            {/* Scorecards - 3 across */}
            <div className="grid grid-cols-3 gap-6">
              <SkeletonScorecard />
              <SkeletonScorecard />
              <SkeletonScorecard />
            </div>

            {/* Chart */}
            <SkeletonChart height={250} showLegend={false} />

            {/* Table */}
            <SkeletonTable rows={10} columns={8} columnWidths={['20%', '12%', '12%', '12%', '12%', '12%', '10%', '10%']} />
          </div>
        </main>
      </div>
    );
  }

  if (variant === 'hosting') {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b border-border">
          <div className="px-8 py-4 h-16 flex items-center justify-between">
            <div className="h-6 w-40 bg-muted animate-pulse" />
            <div className="flex items-center gap-4">
              <div className="h-8 w-32 bg-muted animate-pulse" />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-8 space-y-8">
            {/* Scorecards - 3 across */}
            <div className="grid grid-cols-3 gap-6">
              <SkeletonScorecard />
              <SkeletonScorecard />
              <SkeletonScorecard />
            </div>

            {/* Filter controls */}
            <div className="border bg-card p-4 flex items-center gap-4">
              <div className="h-8 w-48 bg-muted animate-pulse" />
              <div className="h-8 w-32 bg-muted animate-pulse" />
              <div className="h-8 w-32 bg-muted animate-pulse" />
            </div>

            {/* Table */}
            <SkeletonTable rows={10} columns={8} columnWidths={['22%', '12%', '12%', '15%', '8%', '12%', '8%', '11%']} />
          </div>
        </main>
      </div>
    );
  }

  if (variant === 'overview') {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b border-border">
          <div className="px-8 py-4 h-16 flex items-center justify-between">
            <div className="h-6 w-56 bg-muted animate-pulse" />
            <div className="flex items-center gap-4">
              <div className="h-8 w-32 bg-muted animate-pulse" />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-8 space-y-8">
            {/* Scorecards - 4 across for overview */}
            <div className="grid grid-cols-4 gap-6">
              <SkeletonScorecard />
              <SkeletonScorecard />
              <SkeletonScorecard />
              <SkeletonScorecard />
            </div>

            {/* Nested breakdown table */}
            <SkeletonTable rows={15} columns={5} columnWidths={['25%', '18%', '18%', '18%', '21%']} />
          </div>
        </main>
      </div>
    );
  }

  return null;
}