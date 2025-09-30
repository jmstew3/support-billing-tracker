import { Card, CardContent, CardHeader } from './card';

export function SkeletonScorecard() {
  return (
    <Card className="transition-all duration-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-3">
        {/* Title skeleton */}
        <div className="h-4 w-24 bg-muted animate-pulse" />
        {/* Icon skeleton */}
        <div className="h-4 w-4 bg-muted animate-pulse" />
      </CardHeader>
      <CardContent className="p-5 pt-0">
        {/* Value skeleton */}
        <div className="h-8 w-32 bg-muted animate-pulse mb-2" />
        {/* Description skeleton */}
        <div className="h-3 w-full bg-muted animate-pulse" />
      </CardContent>
    </Card>
  );
}