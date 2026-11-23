import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import BrandLogo from "@/components/BrandLogo";
import { releases } from "@/data/features";

export default function LandingPage() {
  return (
    <div className="app-shell relative min-h-screen overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl"
      />
      <header className="relative border-b border-primary/15 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <a href="/" className="flex items-center gap-3" aria-label="AHS Chat home">
            <BrandLogo className="h-10 w-10 object-contain" />
            <span className="text-lg font-bold tracking-tight">AHS Chat</span>
          </a>
          <Button
            asChild
            className="bg-primary text-primary-foreground shadow-md shadow-primary/20"
            data-testid="button-signup"
          >
            <a href="/signup">Sign up</a>
          </Button>
        </div>
      </header>

      <main className="relative mx-auto max-w-4xl px-4 pb-16 sm:px-6">
        <section className="py-12 sm:py-16">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            Titans Academy
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            What you can do with{" "}
            <span className="bg-gradient-to-r from-primary to-cyan-500 bg-clip-text text-transparent">
              AHS Chat
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            The full feature list, from community channels to private group chats.
          </p>
        </section>

        <section aria-label="AHS Chat features" className="space-y-10">
          {releases.map((release) => (
            <article
              key={release.title}
              className="border-t border-border pt-6"
              aria-labelledby={`release-${release.date.replaceAll(" ", "-")}-${release.title.replaceAll(" ", "-")}`}
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <time className="text-sm font-semibold text-primary">{release.date}</time>
                <h2
                  id={`release-${release.date.replaceAll(" ", "-")}-${release.title.replaceAll(" ", "-")}`}
                  className="text-lg font-semibold"
                >
                  {release.title}
                </h2>
              </div>
              <ul className="mt-4 space-y-3">
                {release.features.map((feature) => (
                  <li key={feature} className="flex gap-3 text-sm leading-6 sm:text-base">
                    <Check
                      className="mt-1 h-4 w-4 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        <section className="mt-12 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/15 via-primary/5 to-cyan-500/10 p-6 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-8">
          <div>
            <h2 className="text-xl font-bold">Join AHS Chat</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Create an account to get started.
            </p>
          </div>
          <Button
            asChild
            size="lg"
            className="mt-5 bg-primary text-primary-foreground shadow-lg shadow-primary/20 sm:mt-0"
            data-testid="button-get-started"
          >
            <a href="/signup">
              Sign up
              <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
        </section>
      </main>
    </div>
  );
}
