import { ArrowLeft, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const releases = [
  {
    date: "October 7, 2026",
    title: "Mobile-friendly chat layout",
    features: [
      "Use a slide-out navigation drawer and member list overlay on smaller screens.",
      "Navigate between channels and direct messages with mobile header controls.",
      "Use a compact message composer with spacing for device safe areas.",
    ],
  },
  {
    date: "October 6, 2026",
    title: "Direct-message media and public feature notes",
    features: [
      "Send file attachments and GIFs in accepted direct-message conversations.",
      "Browse the feature and update history without signing in.",
      "Open the feature notes from the landing, sign-in, sign-up, and chat screens.",
    ],
  },
  {
    date: "October 5, 2026",
    title: "Shareable chat destinations",
    features: [
      "Open a channel directly with a /server/<channel> link.",
      "Open a direct message with a /dms/<username> link.",
      "The root chat route opens the default channel.",
    ],
  },
  {
    date: "Earlier updates",
    title: "Original feature set (exact release dates not recorded)",
    features: [
      "Community channels for general conversation, rules, announcements, polls, and staff.",
      "Real-time channel messages, typing indicators, online presence, and unread indicators.",
      "Message replies, member mentions, file attachments, GIFs, polls, and emoji reactions.",
      "Scroll back to load message history; admins can manage channels and remove messages.",
      "Private conversations with message requests, unread counts, and emoji reactions.",
      "Username and password accounts, profile pictures, and custom usernames.",
      "Required real-name and school-email setup; private profile details are visible only to their owner and owner-role accounts.",
      "Custom status, online status, Do Not Disturb, light and dark themes, and personalized accent and username colors.",
      "Admin tools for member management, bans, staff access, and everyone mentions.",
    ],
  },
];

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
              key={release.date}
              className="glass-panel rounded-xl p-5 sm:p-6"
              aria-labelledby={`release-${release.date.replaceAll(" ", "-")}`}
            >
              <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1">
                <time className="text-sm font-semibold text-primary">{release.date}</time>
                <span className="text-muted-foreground" aria-hidden="true">·</span>
                <h2
                  id={`release-${release.date.replaceAll(" ", "-")}`}
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
