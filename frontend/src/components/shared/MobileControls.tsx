import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../ui/sheet';

interface MobileControlsProps {
  children: React.ReactNode;
}

export function MobileControls({ children }: MobileControlsProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <SlidersHorizontal className="h-4 w-4 mr-2" />
          Filter & View
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[80dvh] flex flex-col">
        <SheetHeader>
          <SheetTitle>Filters & View Options</SheetTitle>
        </SheetHeader>
        <div className="py-4 overflow-y-auto">
          <div className="space-y-6">
            {children}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
