import type { MessageReactionEvent, MessageReactionSummary } from "@shared/schema";

export function applyReactionEvent(
  reactions: MessageReactionSummary[] = [],
  event: MessageReactionEvent,
  currentUserId: string,
): MessageReactionSummary[] {
  if (event.reactionDetails) {
    return event.reactionDetails.map((reaction) => ({
      ...reaction,
      reactedByMe: reaction.users.some((user) => user.userId === currentUserId),
    }));
  }
  if (event.count === 0) {
    return reactions.filter((reaction) => reaction.emoji !== event.emoji);
  }

  const existing = reactions.find((reaction) => reaction.emoji === event.emoji);
  if (existing) {
    return reactions.map((reaction) =>
      reaction.emoji === event.emoji
        ? {
            ...reaction,
            count: event.count,
            reactedByMe: event.userId === currentUserId ? event.added : reaction.reactedByMe,
          }
        : reaction,
    );
  }

  return [
    ...reactions,
    {
      emoji: event.emoji,
      count: event.count,
      reactedByMe: event.userId === currentUserId && event.added,
    },
  ];
}
