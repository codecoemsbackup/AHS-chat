import { useEffect, useRef, useState, type ChangeEvent } from "react";
import type { User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { ImagePlus, Trash2 } from "lucide-react";
import {
  clearLocalBackground,
  hasLocalBackground,
  MAX_LOCAL_BACKGROUND_BYTES,
  saveLocalBackground,
} from "@/lib/localBackground";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AppearanceSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
}

export default function AppearanceSettingsDialog({
  open,
  onOpenChange,
  user,
}: AppearanceSettingsDialogProps) {
  const { toast } = useToast();
  const [themeColor, setThemeColor] = useState(user.themeColor || "#7c3aed");
  const [usernameColor, setUsernameColor] = useState(user.usernameColor || "#ffffff");
  const [saving, setSaving] = useState(false);
  const [savingBackground, setSavingBackground] = useState(false);
  const [hasBackground, setHasBackground] = useState(false);
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const typedKeysRef = useRef({ value: "", lastKeyAt: 0 });

  useEffect(() => {
    if (open) {
      setThemeColor(user.themeColor || "#7c3aed");
      setUsernameColor(user.usernameColor || "#ffffff");
      let active = true;
      void hasLocalBackground().then((exists) => {
        if (active) setHasBackground(exists);
      }).catch((error: unknown) => {
        toast({
          title: "Couldn't read local background",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      });
      return () => {
        active = false;
      };
    }
  }, [open, user.themeColor, user.usernameColor, toast]);

  const changeBackground = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || savingBackground) return;
    setSavingBackground(true);
    try {
      await saveLocalBackground(file);
      setHasBackground(true);
      toast({ title: "Website background saved on this device" });
    } catch (error: any) {
      toast({
        title: "Couldn't save local background",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingBackground(false);
    }
  };

  const removeBackground = async () => {
    if (savingBackground) return;
    setSavingBackground(true);
    try {
      await clearLocalBackground();
      setHasBackground(false);
      toast({ title: "Local background removed" });
    } catch (error: any) {
      toast({
        title: "Couldn't remove local background",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingBackground(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const response = await apiRequest("/api/profile/appearance", "PATCH", {
        themeColor,
        usernameColor,
      });
      const updatedUser: User = await response.json();
      queryClient.setQueryData(["/api/auth/user"], updatedUser);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/server"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/dms"] }),
      ]);
      toast({ title: "Appearance saved" });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Couldn't save appearance",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onKeyDown={(event) => {
          if (event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1) {
            typedKeysRef.current.value = "";
            return;
          }

          const now = Date.now();
          const previous = now - typedKeysRef.current.lastKeyAt < 1500
            ? typedKeysRef.current.value
            : "";
          const value = `${previous}${event.key.toLowerCase()}`.slice(-"deltarune".length);
          typedKeysRef.current = { value, lastKeyAt: now };
          if (value === "deltarune") {
            typedKeysRef.current.value = "";
            window.open(
              "https://account.mtgcgs.org/books/gmes/3mtbl7ow/index.html?c=4",
              "_blank",
              "noopener,noreferrer",
            );
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Appearance</DialogTitle>
          <DialogDescription>
            Choose app colors and a website background that stays on this device.
          </DialogDescription>
        </DialogHeader>
        <label className="flex items-center justify-between gap-4 rounded-lg border p-3">
          <span>
            <span className="block text-sm font-medium">Theme color</span>
            <span className="text-xs text-muted-foreground">Changes the app accents</span>
          </span>
          <input
            type="color"
            value={themeColor}
            onChange={(event) => setThemeColor(event.target.value)}
            aria-label="Theme color"
            className="h-10 w-14 cursor-pointer rounded border-0 bg-transparent p-0"
          />
        </label>
        <label className="flex items-center justify-between gap-4 rounded-lg border p-3">
          <span>
            <span className="block text-sm font-medium">Username color</span>
            <span className="text-xs text-muted-foreground">Shown beside your messages and name</span>
          </span>
          <input
            type="color"
            value={usernameColor}
            onChange={(event) => setUsernameColor(event.target.value)}
            aria-label="Username color"
            className="h-10 w-14 cursor-pointer rounded border-0 bg-transparent p-0"
          />
        </label>
        <div className="space-y-3 rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Website background</p>
            <p className="text-xs text-muted-foreground">
              Stored only in this browser. PNG, JPEG, WebP, or GIF, up to{" "}
              {MAX_LOCAL_BACKGROUND_BYTES / (1024 * 1024)} MB.
            </p>
          </div>
          <input
            ref={backgroundInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(event) => void changeBackground(event)}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => backgroundInputRef.current?.click()}
              disabled={savingBackground}
            >
              <ImagePlus className="mr-2 h-4 w-4" />
              {savingBackground ? "Saving..." : hasBackground ? "Change background" : "Choose background"}
            </Button>
            {hasBackground && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => void removeBackground()}
                disabled={savingBackground}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remove
              </Button>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving || savingBackground}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void save()} disabled={saving || savingBackground}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
