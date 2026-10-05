import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function RealNameSetup() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saving, setSaving] = useState(false);

  const saveRealName = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!firstName.trim() || !lastName.trim() || saving) return;
    setSaving(true);
    try {
      const user: User = await apiRequest("/api/profile/real-name", "PATCH", {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      queryClient.setQueryData(["/api/auth/user"], user);
      await queryClient.invalidateQueries({ queryKey: ["/api/server"] });
    } catch (error: any) {
      toast({
        title: "Couldn't save your name",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add your real name</DialogTitle>
          <DialogDescription>
            Your real name is visible only to you and owner-role accounts.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(event) => void saveRealName(event)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="real-first-name">First name</Label>
              <Input
                id="real-first-name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                autoComplete="given-name"
                maxLength={80}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="real-last-name">Last name</Label>
              <Input
                id="real-last-name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                autoComplete="family-name"
                maxLength={80}
                required
              />
            </div>
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={!firstName.trim() || !lastName.trim() || saving}
          >
            {saving ? "Saving..." : "Continue"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
