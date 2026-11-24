import { useState, type FormEvent } from "react";
import { ArrowLeft, FlaskConical, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";

type TestMessage = {
  id: number;
  sender: string;
  content: string;
  reactions: string[];
};

type TestAuditEvent = {
  id: number;
  timestamp: string;
  actor: string;
  summary: string;
  details: string;
};

const initialMessages: TestMessage[] = [
  { id: 1, sender: "Jamie Student", content: "Welcome to the test channel.", reactions: ["👍"] },
  { id: 2, sender: "Taylor Student", content: "Try sending a message or reacting.", reactions: [] },
];

export default function TestModePage() {
  const { user, isLoading } = useAuth();
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [friendRequestAccepted, setFriendRequestAccepted] = useState(false);
  const [groupName, setGroupName] = useState("Test group");
  const [groupMember, setGroupMember] = useState("Jamie Student");
  const [groupMembers, setGroupMembers] = useState(["Taylor Student"]);
  const [pollVotes, setPollVotes] = useState([0, 0, 0]);
  const [isBanned, setIsBanned] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [themeColor, setThemeColor] = useState("#7c3aed");
  const [botDraft, setBotDraft] = useState("");
  const [botMessages, setBotMessages] = useState<string[]>([
    "Hi! This is a local test reply. No AI service was contacted.",
  ]);
  const [auditEvents, setAuditEvents] = useState<TestAuditEvent[]>([]);
  const [nextId, setNextId] = useState(3);

  const addAuditEvent = (summary: string, details: string) => {
    setAuditEvents((events) => [
      {
        id: Date.now(),
        timestamp: new Date().toLocaleString(),
        actor: user?.username || "Test owner",
        summary,
        details,
      },
      ...events,
    ]);
  };

  const sendMessage = (event: FormEvent) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content) return;
    setMessages((current) => [...current, {
      id: nextId,
      sender: "Test owner",
      content,
      reactions: [],
    }]);
    setNextId((id) => id + 1);
    setDraft("");
    addAuditEvent("sent a test message", content);
  };

  const sendBotMessage = (event: FormEvent) => {
    event.preventDefault();
    const content = botDraft.trim();
    if (!content) return;
    setBotMessages((current) => [
      ...current,
      `You: ${content}`,
      "Titan Bot test reply: This is a simulated response in the isolated test workspace.",
    ]);
    setBotDraft("");
    addAuditEvent("tested Titan Bot", `Prompt: ${content}\nReply: Simulated local response`);
  };

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading...</div>;
  }

  if (!user?.isOwner) {
    return (
      <main className="app-shell flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Test mode is owner-only</CardTitle>
            <CardDescription>Sign in with the owner account to use the isolated test workspace.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild><a href="/">Back to chat</a></Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="app-shell min-h-screen p-4 sm:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Button asChild variant="ghost" className="mb-2 -ml-3">
              <a href="/"><ArrowLeft className="mr-2 h-4 w-4" />Back to chat</a>
            </Button>
            <h1 className="flex items-center gap-2 text-3xl font-bold">
              <FlaskConical className="h-7 w-7 text-primary" />
              Test mode
            </h1>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => window.location.reload()}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset tests
          </Button>
        </header>

        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          <strong>Isolated workspace:</strong> Everything here is mock data held only in this page.
          Nothing is sent to the server, saved to real accounts, or sent to Groq.
        </div>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Channels and messages</CardTitle>
              <CardDescription>Test sending messages, reactions, and message deletion locally.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {messages.map((message) => (
                <div key={message.id} className="rounded-lg border p-3">
                  <p className="text-xs font-semibold text-muted-foreground">{message.sender}</p>
                  <p className="break-words text-sm">{message.content}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setMessages((current) => current.map((item) =>
                          item.id === message.id
                            ? { ...item, reactions: item.reactions.includes("👍")
                              ? item.reactions.filter((reaction) => reaction !== "👍")
                              : [...item.reactions, "👍"] }
                            : item,
                        ));
                        addAuditEvent("reacted to a test message", message.content);
                      }}
                    >
                      👍 {message.reactions.includes("👍") ? "1" : ""}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setMessages((current) => current.filter((item) => item.id !== message.id));
                        addAuditEvent("deleted a test message", `${message.sender}: ${message.content}`);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
              <form className="flex gap-2" onSubmit={sendMessage}>
                <Input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Write a test message" />
                <Button type="submit">Send</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Polls and friend requests</CardTitle>
              <CardDescription>Try voting and accepting a sample friend request.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="font-medium">Which test should run next?</p>
              {["Message test", "Poll test", "Theme test"].map((option, index) => (
                <Button
                  key={option}
                  type="button"
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => {
                    setPollVotes((votes) => votes.map((count, voteIndex) =>
                      voteIndex === index ? count + 1 : count,
                    ));
                    addAuditEvent("voted in a test poll", option);
                  }}
                >
                  {option}<span>{pollVotes[index]} votes</span>
                </Button>
              ))}
              <div className="flex items-center justify-between border-t pt-3">
                <span>Friend request from Jamie Student</span>
                <Button
                  type="button"
                  variant={friendRequestAccepted ? "secondary" : "default"}
                  onClick={() => {
                    setFriendRequestAccepted((accepted) => !accepted);
                    addAuditEvent(
                      friendRequestAccepted ? "reopened a test friend request" : "accepted a test friend request",
                      "Jamie Student",
                    );
                  }}
                >
                  {friendRequestAccepted ? "Accepted" : "Accept"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Group chat</CardTitle>
              <CardDescription>Rename the sample group and add or remove mock members.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input value={groupName} onChange={(event) => setGroupName(event.target.value)} aria-label="Test group name" />
              <form
                className="flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const name = groupMember.trim();
                  if (!name || groupMembers.includes(name)) return;
                  setGroupMembers((members) => [...members, name]);
                  addAuditEvent(`added ${name} to the test group`, `Group: ${groupName}`);
                  setGroupMember("");
                }}
              >
                <Input value={groupMember} onChange={(event) => setGroupMember(event.target.value)} placeholder="Mock member name" />
                <Button type="submit">Add</Button>
              </form>
              <ul className="space-y-2">
                {groupMembers.map((member) => (
                  <li key={member} className="flex items-center justify-between rounded border p-2 text-sm">
                    {member}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setGroupMembers((members) => members.filter((name) => name !== member));
                        addAuditEvent(`removed ${member} from the test group`, `Group: ${groupName}`);
                      }}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Admin and moderation</CardTitle>
              <CardDescription>Toggle test permissions and simulate a ban without affecting an account.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded border p-3">
                <span>Sample member: Jamie Student</span>
                <Button
                  type="button"
                  variant={isBanned ? "destructive" : "outline"}
                  onClick={() => {
                    setIsBanned((banned) => !banned);
                    addAuditEvent(isBanned ? "unbanned a test member" : "banned a test member", "Jamie Student");
                  }}
                >
                  {isBanned ? "Banned" : "Ban"}
                </Button>
              </div>
              <div className="flex items-center justify-between rounded border p-3">
                <span>Admin access</span>
                <Button
                  type="button"
                  variant={isAdmin ? "secondary" : "outline"}
                  onClick={() => {
                    setIsAdmin((admin) => !admin);
                    addAuditEvent(isAdmin ? "removed test admin access" : "granted test admin access", "Jamie Student");
                  }}
                >
                  {isAdmin ? "Admin" : "Make admin"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">These controls only change the sample state in this page.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Preview a theme color without changing your account settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="flex items-center justify-between gap-4">
                <span>Preview color</span>
                <Input
                  className="h-10 w-16 p-1"
                  type="color"
                  value={themeColor}
                  onChange={(event) => setThemeColor(event.target.value)}
                  aria-label="Test theme color"
                />
              </label>
              <div className="rounded-lg border p-4" style={{ borderColor: themeColor }}>
                <p className="font-semibold" style={{ color: themeColor }}>Theme preview</p>
                <Button type="button" className="mt-2" style={{ backgroundColor: themeColor }}>
                  Test button
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Titan Bot</CardTitle>
              <CardDescription>Try the chat layout with a simulated reply. No Groq request is made.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="max-h-40 space-y-2 overflow-y-auto rounded border p-3 text-sm">
                {botMessages.map((message, index) => <p key={`${index}-${message}`}>{message}</p>)}
              </div>
              <form className="flex gap-2" onSubmit={sendBotMessage}>
                <Textarea
                  className="min-h-10"
                  rows={1}
                  value={botDraft}
                  onChange={(event) => setBotDraft(event.target.value)}
                  placeholder="Try a test prompt"
                />
                <Button type="submit">Send</Button>
              </form>
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Audit log preview</CardTitle>
            <CardDescription>Actions in this test workspace appear here only; they are not written to logs.json.</CardDescription>
          </CardHeader>
          <CardContent>
            {auditEvents.length ? (
              <ul className="space-y-3">
                {auditEvents.map((event) => (
                  <li key={event.id} className="border-t pt-3 first:border-0 first:pt-0">
                    <p className="text-sm"><strong>{event.actor}</strong> {event.summary}</p>
                    <p className="mt-1 whitespace-pre-wrap break-words rounded bg-muted/50 p-2 text-xs">{event.details}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{event.timestamp}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Try an action above to populate the test audit log.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
