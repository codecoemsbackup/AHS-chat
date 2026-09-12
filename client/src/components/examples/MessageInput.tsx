import MessageInput from "../MessageInput";

export default function MessageInputExample() {
  return (
    <div className="w-full max-w-2xl">
      <MessageInput
        onSendMessage={(msg) => console.log("Message sent:", msg)}
      />
    </div>
  );
}
