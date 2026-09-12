import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, MessageSquare, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";
import ThemeToggle from "@/components/ThemeToggle";

interface Availability {
  available: boolean;
  reason: string;
}

export default function SignupPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const normalizedUsername = username.trim();
  const usernameIsValid = /^[a-zA-Z0-9_]{3,20}$/.test(normalizedUsername);

  const { data: availability, isFetching: checkingUsername } = useQuery<Availability>({
    queryKey: [
      `/api/auth/username-available?username=${encodeURIComponent(normalizedUsername)}`,
    ],
    enabled: usernameIsValid,
  });

  const signupMutation = useMutation({
    mutationFn: () =>
      apiRequest("/api/auth/local/signup", "POST", {
        username: normalizedUsername,
        password,
      }),
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/auth/user"], user);
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: "Couldn't create account",
        description: error.message || "Please check your details and try again.",
        variant: "destructive",
      });
    },
  });

  const handleSignup = (event: React.FormEvent) => {
    event.preventDefault();
    if (!usernameIsValid || !availability?.available) return;
    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Enter the same password in both fields.",
        variant: "destructive",
      });
      return;
    }
    signupMutation.mutate();
  };

  return (
    <div className="app-shell relative flex min-h-screen items-center justify-center p-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-bold">AHS Chat</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create your account</CardTitle>
            <CardDescription>Make a username and password to join the community server.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-username">Username</Label>
                <Input
                  id="signup-username"
                  type="text"
                  placeholder="Choose a unique username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                  minLength={3}
                  maxLength={20}
                  required
                  data-testid="input-username"
                />
                <div className="min-h-5 text-xs">
                  {normalizedUsername.length > 0 && !usernameIsValid && (
                    <p className="text-muted-foreground">Use 3-20 letters, numbers, or underscores.</p>
                  )}
                  {usernameIsValid && checkingUsername && (
                    <p className="text-muted-foreground">Checking username...</p>
                  )}
                  {usernameIsValid && !checkingUsername && availability?.available && (
                    <p className="flex items-center gap-1 text-green-600"><Check className="h-3.5 w-3.5" /> Username is available</p>
                  )}
                  {usernameIsValid && !checkingUsername && availability && !availability.available && (
                    <p className="flex items-center gap-1 text-destructive"><X className="h-3.5 w-3.5" /> {availability.reason}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="Create a password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={128}
                  required
                  data-testid="input-password"
                />
                <p className="text-xs text-muted-foreground">Use at least 8 characters.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Enter your password again"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                  data-testid="input-confirm-password"
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={
                  signupMutation.isPending ||
                  checkingUsername ||
                  !usernameIsValid ||
                  !availability?.available ||
                  password.length < 8 ||
                  password !== confirmPassword
                }
                data-testid="button-signup"
              >
                {signupMutation.isPending ? "Creating account..." : "Create account"}
              </Button>
              <div className="text-center text-sm">
                <span className="text-muted-foreground">Already have an account? </span>
                <button type="button" className="text-primary hover:underline" onClick={() => setLocation("/login")} data-testid="link-login">
                  Sign in
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}