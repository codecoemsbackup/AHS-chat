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

export default function EmailSetup() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const saveEmail = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || saving) return;
    setSaving(true);
    try {
      const response = await apiRequest("/api/profile/email", "PATCH", {
        email: email.trim(),
      });
      const user: User = await response.json();
      queryClient.setQueryData(["/api/auth/user"], user);
      await queryClient.invalidateQueries({ queryKey: ["/api/server"] });
    } catch (error: any) {
      toast({
        title: "Couldn't save your email",
        description: error.message || "Please check the address and try again.",
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
          <DialogTitle>Add your PISD email</DialogTitle>
          <DialogDescription>
            Enter your school email to continue. Use an address ending in .number@mypisd.net or @pisd.edu.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(event) => void saveEmail(event)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profile-email">Email address</Label>
            <Input
              id="profile-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              placeholder="name.123@mypisd.net"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={!email.trim() || saving}>
            {saving ? "Saving..." : "Continue"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
