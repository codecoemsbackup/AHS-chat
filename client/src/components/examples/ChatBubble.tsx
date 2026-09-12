import ChatBubble from "../ChatBubble";

export default function ChatBubbleExample() {
  return (
    <div className="w-full max-w-2xl p-6 space-y-4">
      <ChatBubble
        message="Hey! How are you doing?"
        timestamp="10:30 AM"
        isSent={false}
        senderName="Sarah Wilson"
      />
      <ChatBubble
        message="I'm doing great, thanks! How about you?"
        timestamp="10:32 AM"
        isSent={true}
      />
      <ChatBubble
        message="Pretty good! Working on a new project"
        timestamp="10:33 AM"
        isSent={false}
        senderName="Sarah Wilson"
      />
    </div>
  );
}
