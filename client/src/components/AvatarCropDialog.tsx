import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";

const CROP_SIZE = 320;
const OUTPUT_SIZE = 512;

interface AvatarCropDialogProps {
  open: boolean;
  imageSrc: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (croppedImage: string) => Promise<void>;
}

export default function AvatarCropDialog({
  open,
  imageSrc,
  onOpenChange,
  onConfirm,
}: AvatarCropDialogProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const dragStartRef = useRef({ pointerX: 0, pointerY: 0, x: 0, y: 0 });

  useEffect(() => {
    if (!open || !imageSrc) return;
    setNaturalSize({ width: 0, height: 0 });
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setDragging(false);
  }, [open, imageSrc]);

  const layout = useMemo(() => {
    if (!naturalSize.width || !naturalSize.height) return null;
    const baseScale = Math.max(CROP_SIZE / naturalSize.width, CROP_SIZE / naturalSize.height);
    const width = naturalSize.width * baseScale * zoom;
    const height = naturalSize.height * baseScale * zoom;
    const centeredLeft = (CROP_SIZE - width) / 2;
    const centeredTop = (CROP_SIZE - height) / 2;
    const maxOffsetX = Math.max(0, (width - CROP_SIZE) / 2);
    const maxOffsetY = Math.max(0, (height - CROP_SIZE) / 2);
    const left = centeredLeft + Math.max(-maxOffsetX, Math.min(maxOffsetX, offset.x));
    const top = centeredTop + Math.max(-maxOffsetY, Math.min(maxOffsetY, offset.y));
    return { width, height, left, top, maxOffsetX, maxOffsetY };
  }, [naturalSize, offset, zoom]);

  const updateOffset = (x: number, y: number) => {
    if (!layout) return;
    setOffset({
      x: Math.max(-layout.maxOffsetX, Math.min(layout.maxOffsetX, x)),
      y: Math.max(-layout.maxOffsetY, Math.min(layout.maxOffsetY, y)),
    });
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!layout) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      x: offset.x,
      y: offset.y,
    };
    setDragging(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    updateOffset(
      dragStartRef.current.x + event.clientX - dragStartRef.current.pointerX,
      dragStartRef.current.y + event.clientY - dragStartRef.current.pointerY,
    );
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragging(false);
  };

  const handleZoomChange = (value: number[]) => {
    if (!naturalSize.width || !naturalSize.height) return;
    const nextZoom = value[0] || 1;
    const baseScale = Math.max(CROP_SIZE / naturalSize.width, CROP_SIZE / naturalSize.height);
    const maxOffsetX = Math.max(0, (naturalSize.width * baseScale * nextZoom - CROP_SIZE) / 2);
    const maxOffsetY = Math.max(0, (naturalSize.height * baseScale * nextZoom - CROP_SIZE) / 2);
    setZoom(nextZoom);
    setOffset((current) => ({
      x: Math.max(-maxOffsetX, Math.min(maxOffsetX, current.x)),
      y: Math.max(-maxOffsetY, Math.min(maxOffsetY, current.y)),
    }));
  };

  const handleConfirm = async () => {
    if (!imageRef.current || !layout) return;
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const context = canvas.getContext("2d");
    if (!context) return;
    const scale = OUTPUT_SIZE / CROP_SIZE;
    context.drawImage(
      imageRef.current,
      layout.left * scale,
      layout.top * scale,
      layout.width * scale,
      layout.height * scale,
    );
    setSaving(true);
    try {
      await onConfirm(canvas.toDataURL("image/jpeg", 0.9));
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImagePlus className="h-5 w-5 text-primary" />
            Crop profile picture
          </DialogTitle>
          <DialogDescription>
            Drag the image to choose the area that appears in your avatar.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-5">
          <div
            className={`relative h-80 w-80 select-none overflow-hidden rounded-full bg-muted ${
              dragging ? "cursor-grabbing" : "cursor-grab"
            }`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            role="application"
            aria-label="Profile picture crop area. Drag to reposition."
          >
            {imageSrc && (
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Profile picture preview"
                className="pointer-events-none absolute max-w-none"
                style={
                  layout
                    ? {
                        width: layout.width,
                        height: layout.height,
                        left: layout.left,
                        top: layout.top,
                      }
                    : { visibility: "hidden" }
                }
                onLoad={(event) =>
                  setNaturalSize({
                    width: event.currentTarget.naturalWidth,
                    height: event.currentTarget.naturalHeight,
                  })
                }
              />
            )}
            <div className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-primary/80 ring-offset-2 ring-offset-background" />
          </div>

          <div className="flex w-full items-center gap-3">
            <Minus className="h-4 w-4 text-muted-foreground" />
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.01}
              onValueChange={handleZoomChange}
              disabled={!layout || saving}
              aria-label="Zoom profile picture"
            />
            <Plus className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleConfirm()} disabled={!layout || saving}>
            {saving ? "Saving..." : "Use this picture"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}