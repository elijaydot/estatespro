import { useState } from 'react';
import { ChevronLeft, ChevronRight, X, Expand } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface PhotoGalleryProps {
  images: string[];
  className?: string;
}

const ROOM_LABELS = [
  'Cover Photo', 'Living Room', 'Kitchen', 'Bedroom', 'Bathroom',
  'Dining Area', 'Balcony/Patio', 'Exterior', 'Parking', 'Other',
];

export function PhotoGallery({ images, className }: PhotoGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  if (!images || images.length === 0) return null;

  const prev = () => setActiveIndex((i) => (i === 0 ? images.length - 1 : i - 1));
  const next = () => setActiveIndex((i) => (i === images.length - 1 ? 0 : i + 1));

  return (
    <>
      <div className={cn('space-y-2', className)}>
        {/* Main image */}
        <div
          className="relative aspect-video rounded-lg overflow-hidden cursor-pointer group"
          onClick={() => { setActiveIndex(0); setLightboxOpen(true); }}
        >
          <img src={images[0]} alt="Cover" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <Expand className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          {images.length > 1 && (
            <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-md">
              +{images.length - 1} more
            </span>
          )}
        </div>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {images.map((url, i) => (
              <button
                key={i}
                onClick={() => { setActiveIndex(i); setLightboxOpen(true); }}
                className={cn(
                  'flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-colors',
                  i === activeIndex ? 'border-primary' : 'border-transparent hover:border-muted-foreground/30'
                )}
              >
                <img src={url} alt={ROOM_LABELS[i] || `Photo ${i + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-4xl p-0 bg-black/95 border-none">
          <div className="relative flex items-center justify-center min-h-[60vh]">
            <img
              src={images[activeIndex]}
              alt={ROOM_LABELS[activeIndex] || `Photo ${activeIndex + 1}`}
              className="max-h-[80vh] max-w-full object-contain"
            />
            
            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm">
              {ROOM_LABELS[activeIndex] || `Photo ${activeIndex + 1}`} — {activeIndex + 1}/{images.length}
            </p>

            {images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={prev}
                  className="absolute left-2 text-white hover:bg-white/20 h-10 w-10"
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={next}
                  className="absolute right-2 text-white hover:bg-white/20 h-10 w-10"
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
