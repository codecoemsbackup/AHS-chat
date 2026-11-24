import { useEffect, useState } from "react";
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
import TestModePage from "@/pages/test-mode";

function Router() {
  const { user, isAuthenticated, isLoading } = useAuth();
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

  if (location === "/test-mode") {
    if (!isAuthenticated) return <LoginPage />;
    if (!user?.isOwner) return <ChatPage />;
    return <TestModePage />;
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
  const [showRedirectNotice, setShowRedirectNotice] = useState(false);

  useEffect(() => {
    if (window.location.origin === "https://ahs-chat-2d9a.onrender.com") {
      window.location.replace("https://ahs-chat-hd5w.onrender.com/?redirectedFromOldSite=1");
      return;
    }

    const url = new URL(window.location.href);
    if (
      url.origin === "https://ahs-chat-hd5w.onrender.com" &&
      url.searchParams.get("redirectedFromOldSite") === "1"
    ) {
      setShowRedirectNotice(true);
      url.searchParams.delete("redirectedFromOldSite");
      window.history.replaceState(
        window.history.state,
        "",
        `${url.pathname}${url.search}${url.hash}`,
      );
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
        <AlertDialog open={showRedirectNotice} onOpenChange={setShowRedirectNotice}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>You’ve been redirected to our new website</AlertDialogTitle>
              <AlertDialogDescription>
                Accounts from the old website aren’t available here. You’ll need to sign up
                again to use this site.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setShowRedirectNotice(false)}>
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
