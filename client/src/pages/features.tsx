import { ArrowLeft, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { releases } from "@/data/features";

export default function FeaturesPage() {
  return (
    <main className="app-shell min-h-screen px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <Button asChild variant="ghost" className="mb-6">
          <a href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to AHS Chat
          </a>
        </Button>

        <header className="mb-8">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-primary">
            <Sparkles className="h-4 w-4" />
            AHS Chat updates
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">Features &amp; Patch Notes</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            What you can do in AHS Chat and what has been added over time.
            New updates appear at the top.
          </p>
        </header>

        <div className="space-y-5">
          {releases.map((release) => (
            <article
              key={release.title}
              className="glass-panel rounded-xl p-5 sm:p-6"
              aria-labelledby={`release-${release.date.replaceAll(" ", "-")}-${release.title.replaceAll(" ", "-")}`}
            >
              <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1">
                <time className="text-sm font-semibold text-primary">{release.date}</time>
                <span className="text-muted-foreground" aria-hidden="true">·</span>
                <h2
                  id={`release-${release.date.replaceAll(" ", "-")}-${release.title.replaceAll(" ", "-")}`}
                  className="text-lg font-semibold"
                >
                  {release.title}
                </h2>
              </div>
              <ul className="space-y-3">
                {release.features.map((feature) => (
                  <li key={feature} className="flex gap-3 text-sm leading-relaxed">
                    <Check
                      className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
