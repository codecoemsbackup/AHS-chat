import {
  AtSign,
  MessageCircle,
  MessageSquareText,
  Paperclip,
  ShieldCheck,
  UsersRound,
  Vote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import BrandLogo from "@/components/BrandLogo";

const features = [
  {
    icon: MessageSquareText,
    title: "Conversations with context",
    description:
      "Keep topics organized in channels, then reply to a message when a conversation needs a little more focus.",
  },
  {
    icon: MessageCircle,
    title: "Private messages",
    description:
      "Start one-to-one conversations with message requests and a dedicated place for each chat.",
  },
  {
    icon: AtSign,
    title: "Stay in the loop",
    description:
      "Mention a member, see unread counts, and know when your community is online or typing.",
  },
  {
    icon: Paperclip,
    title: "More than text",
    description:
      "Share files and GIFs, react with emoji, or use a poll to make a group decision.",
  },
  {
    icon: UsersRound,
    title: "A community at a glance",
    description:
      "Browse member profiles and custom statuses, and start a private chat right from the member list.",
  },
  {
    icon: ShieldCheck,
    title: "Tools for a well-run space",
    description:
      "Admins can manage channels and members, while staff-only areas keep sensitive conversations focused.",
  },
];

export default function LandingPage() {
  return (
    <div className="app-shell min-h-screen">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <a href="/" className="flex min-w-0 items-center gap-3" aria-label="AHS Chat home">
            <BrandLogo className="h-9 w-9 shrink-0 object-contain" />
            <span className="truncate text-base font-semibold tracking-tight">AHS Chat</span>
          </a>
          <nav aria-label="Main navigation" className="flex items-center gap-2">
            <a
              href="/features"
              className="hidden rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:inline-flex"
              data-testid="button-features"
            >
              Features
            </a>
            <ThemeToggle />
            <Button asChild size="sm" data-testid="button-login">
              <a href="/login">Sign in</a>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        <section className="border-b border-border bg-card">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:gap-16">
            <div className="max-w-2xl">
              <p className="mb-4 text-sm font-semibold text-primary">
                TITANS ACADEMY COMMUNITY
              </p>
              <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
                Good conversations belong in one place.
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-8 text-muted-foreground">
                A straightforward space for your community to chat, share updates,
                and keep up with one another.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" data-testid="button-get-started">
                  <a href="/signup">Create an account</a>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <a href="/features">Explore features</a>
                </Button>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Already a member?{" "}
                <a className="font-medium text-primary hover:underline" href="/login">
                  Sign in
                </a>
              </p>
            </div>

            <div className="rounded-lg border border-border bg-background p-5 sm:p-6">
              <div className="flex items-center gap-3 border-b border-border pb-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <UsersRound className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-semibold">One community</p>
                  <p className="text-sm text-muted-foreground">A place for everyone to catch up</p>
                </div>
              </div>
              <ul className="mt-2 divide-y divide-border">
                <li className="flex items-center gap-3 py-3.5">
                  <MessageSquareText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span className="flex-1 text-sm font-medium">Channels for every topic</span>
                  <span className="h-2 w-2 rounded-full bg-status-online" aria-label="Active" />
                </li>
                <li className="flex items-center gap-3 py-3.5">
                  <MessageCircle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span className="flex-1 text-sm font-medium">Private conversations</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">1:1</span>
                </li>
                <li className="flex items-center gap-3 py-3.5">
                  <Vote className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span className="flex-1 text-sm font-medium">Quick polls and reactions</span>
                  <span className="text-sm" aria-hidden="true">👍</span>
                </li>
              </ul>
              <p className="mt-2 border-t border-border pt-4 text-xs text-muted-foreground">
                Messages, media, and community tools—without the clutter.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mb-8 max-w-2xl">
            <p className="text-sm font-semibold text-primary">MADE FOR THE WAY YOU TALK</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              The useful things, all together.
            </h2>
            <p className="mt-3 leading-7 text-muted-foreground">
              Start with a conversation and bring in the right tools as you need them.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, description }) => (
              <article
                key={title}
                className="rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/35"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-foreground">
                  <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
              </article>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-card p-5 sm:px-6">
            <div>
              <h2 className="font-semibold">See what’s new in AHS Chat</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Browse feature details and recent updates.
              </p>
            </div>
            <Button asChild variant="outline">
              <a href="/features">Features &amp; patch notes</a>
            </Button>
          </div>
        </section>
      </main>
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-sm text-muted-foreground sm:px-6">
          <span>AHS Chat · Titans Academy</span>
          <a href="/features" className="hover:text-foreground">Features &amp; updates</a>
        </div>
      </footer>
    </div>
  );
}
