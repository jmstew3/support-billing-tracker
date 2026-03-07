import { SkeletonScorecard } from '../../../components/ui/SkeletonScorecard';
import { SkeletonTable } from '../../../components/ui/SkeletonTable';

function MobileSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="p-4 border rounded-lg space-y-3">
          <div className="flex justify-between items-center">
            <div className="h-5 w-32 bg-muted animate-pulse" />
            <div className="h-5 w-20 bg-muted animate-pulse" />
          </div>
          <div className="h-4 w-48 bg-muted animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col h-full">
      {/* Header Skeleton - Mimics PageHeader */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between gap-3">
          <div className="h-8 w-36 bg-muted animate-pulse" />
          <div className="hidden sm:flex items-center gap-6">
            <div className="h-9 w-56 bg-muted animate-pulse" />
            <div className="h-9 w-32 bg-muted animate-pulse" />
          </div>
          <div className="sm:hidden h-9 w-32 bg-muted animate-pulse" />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 lg:space-y-8">
          {/* Responsive Scorecards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            <SkeletonScorecard />
            <SkeletonScorecard />
            <SkeletonScorecard />
            <SkeletonScorecard />
          </div>

          {/* Desktop Table Skeleton */}
          <div className="hidden sm:block">
            <SkeletonTable rows={15} columns={5} columnWidths={['25%', '18%', '18%', '18%', '21%']} />
          </div>

          {/* Mobile List Skeleton */}
          <div className="block sm:hidden">
            <MobileSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}
