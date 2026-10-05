import { useEffect, useState } from "react";
import type { User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
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

  useEffect(() => {
    if (open) {
      setThemeColor(user.themeColor || "#7c3aed");
      setUsernameColor(user.usernameColor || "#ffffff");
    }
  }, [open, user.themeColor, user.usernameColor]);

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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Appearance</DialogTitle>
          <DialogDescription>
            Choose an app accent color and a separate color for your username.
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
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void save()} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
