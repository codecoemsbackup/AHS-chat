import { useState } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import LandingPage from "@/pages/landing";
import ChatPage from "@/pages/chat";
import LoginPage from "@/pages/login";
import SignupPage from "@/pages/signup";
import FeaturesPage from "@/pages/features";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();

  if (location === "/features") {
    return <FeaturesPage />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {isAuthenticated ? (
        <>
          <Route path="/" component={ChatPage} />
          <Route path="/server/:channel" component={ChatPage} />
          <Route path="/dms/:user" component={ChatPage} />
          <Route path="/groups/:groupChat" component={ChatPage} />
        </>
      ) : (
        <>
          <Route path="/login" component={LoginPage} />
          <Route path="/signup" component={SignupPage} />
          <Route path="/" component={LandingPage} />
        </>
      )}
    </Switch>
  );
}

function App() {
  const [showWrongLinkWarning, setShowWrongLinkWarning] = useState(
    () => window.location.origin === "https://ahs-chat-2d9a.onrender.com",
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
        <AlertDialog open={showWrongLinkWarning}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>You’re on the wrong link</AlertDialogTitle>
              <AlertDialogDescription>
                If this site is working, you can continue using it for now.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setShowWrongLinkWarning(false)}>
                Continue anyway
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
