import { useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';

interface MobileControlsProps {
  children: React.ReactNode;
}

export function MobileControls({ children }: MobileControlsProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-3 py-1.5 border border-border rounded text-sm hover:bg-muted"
      >
        <SlidersHorizontal className="h-4 w-4" />
        Filter & View
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="relative bg-background border-t border-border rounded-t-lg max-h-[80dvh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-sm font-semibold">Filters & View Options</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-muted rounded"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="py-4 px-4 overflow-y-auto">
              <div className="space-y-6">
                {children}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
