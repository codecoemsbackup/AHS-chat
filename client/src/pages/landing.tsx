import { Button } from "@/components/ui/button";
import { MessageSquare, Users, Zap, Shield } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

export default function LandingPage() {
  return (
    <div className="app-shell min-h-screen">
      <header className="glass-panel sticky top-0 z-10 border-x-0 border-t-0">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold">AHS Chat</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild data-testid="button-login">
              <a href="/login">Sign In</a>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-4xl text-center space-y-8">
            <h2 className="text-5xl font-bold">
              One community server. Every conversation in real-time.
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Simple, fast, and secure messaging for your people, your channels,
                and your conversations in one place.
            </p>
            <div className="flex gap-4 justify-center">
              <Button size="lg" asChild data-testid="button-get-started">
                <a href="/login">Get Started</a>
              </Button>
            </div>
          </div>
        </section>

        <section className="glass-panel border-x-0 py-16 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <Zap className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Real-time Messaging</h3>
                <p className="text-muted-foreground">
                  Instant message delivery with live typing indicators and online
                  status updates
                </p>
              </div>

              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Shared Server</h3>
                <p className="text-muted-foreground">
                  Join one welcoming server with channels organized around the
                  conversations your community cares about.
                </p>
              </div>

              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <Shield className="w-8 h-8 text-primary" />
                </div>
                 <h3 className="text-xl font-semibold">Presence at a glance</h3>
                <p className="text-muted-foreground">
                   See who is online and who is offline while your community chats.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
