import { ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const featureGroups = [
  {
    title: "Community and channels",
    features: [
      "A shared community server with general, rules, announcements, polls, and staff channels.",
      "Admins can create and manage channels; the staff channel is limited to admins.",
      "Jump directly to a channel with its /server/<channel> URL.",
    ],
  },
  {
    title: "Messaging",
    features: [
      "Real-time channel messages with live typing indicators and online presence.",
      "Reply to messages, mention members, and attach files or GIFs.",
      "Create polls in the polls channel and react to messages with emoji.",
      "Load message history as you scroll back; admins can remove messages.",
      "See unread message and mention indicators for channels.",
    ],
  },
  {
    title: "Direct messages",
    features: [
      "Start private conversations with community members.",
      "New conversations arrive as message requests that recipients can accept or decline.",
      "Send files and GIFs in accepted direct-message conversations.",
      "See unread DM counts and navigate directly to a conversation with /dms/<username>.",
    ],
  },
  {
    title: "Profiles and accounts",
    features: [
      "Sign in with a username and password and choose a unique username.",
      "Complete required real-name and school-email setup when prompted.",
      "Set a profile picture, custom status, online status, and Do Not Disturb.",
      "Real names and email addresses are only visible to the account holder and owner-role accounts.",
    ],
  },
  {
    title: "Administration and safety",
    features: [
      "Admins can manage server channels, review members, and ban or unban accounts.",
      "Admins can use the everyone mention and create polls.",
      "Staff conversations and admin-only channels are restricted by account permissions.",
    ],
  },
  {
    title: "Appearance and navigation",
    features: [
      "Switch between light and dark themes.",
      "Choose an app accent color and a separate username display color.",
      "Use direct channel and DM URLs; the root route opens the default channel.",
    ],
  },
];

export default function FeaturesPage() {
  return (
    <main className="app-shell min-h-screen px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <Button asChild variant="ghost" className="mb-6">
          <a href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to chat
          </a>
        </Button>

        <header className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-primary">
            AHS Chat
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">Features</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            A guide to the community, messaging, profile, and administration
            features available in AHS Chat.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          {featureGroups.map((group) => (
            <section
              key={group.title}
              className="glass-panel rounded-xl p-5"
              aria-labelledby={`feature-group-${group.title}`}
            >
              <h2
                id={`feature-group-${group.title}`}
                className="mb-4 text-lg font-semibold"
              >
                {group.title}
              </h2>
              <ul className="space-y-3">
                {group.features.map((feature) => (
                  <li key={feature} className="flex gap-3 text-sm leading-relaxed">
                    <Check
                      className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
