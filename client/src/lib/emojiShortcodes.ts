const EMOJI_SHORTCODES: Record<string, string> = {
  smile: "😄",
  grin: "😁",
  joy: "😂",
  laughing: "😆",
  wink: "😉",
  blush: "😊",
  heart_eyes: "😍",
  kissing_heart: "😘",
  thinking: "🤔",
  sunglasses: "😎",
  sob: "😭",
  cry: "😢",
  angry: "😠",
  rage: "😡",
  confused: "😕",
  neutral_face: "😐",
  flushed: "😳",
  scream: "😱",
  poop: "💩",
  skull: "💀",
  clown: "🤡",
  ghost: "👻",
  fire: "🔥",
  rocket: "🚀",
  tada: "🎉",
  sparkles: "✨",
  eyes: "👀",
  pray: "🙏",
  clap: "👏",
  wave: "👋",
  thumbsup: "👍",
  thumbsdown: "👎",
  muscle: "💪",
  ok_hand: "👌",
  checkered_flag: "🏁",
  warning: "⚠️",
  x: "❌",
  white_check_mark: "✅",
  question: "❓",
  exclamation: "❗",
  heart: "❤️",
  broken_heart: "💔",
  blue_heart: "💙",
  green_heart: "💚",
  yellow_heart: "💛",
  purple_heart: "💜",
  star: "⭐",
  sun: "☀️",
  moon: "🌙",
  coffee: "☕",
  pizza: "🍕",
  beer: "🍺",
  cake: "🍰",
};

function replaceKnownShortcodes(value: string) {
  return value.replace(/:([a-z0-9_+-]+):/gi, (match, shortcode: string) => {
    return EMOJI_SHORTCODES[shortcode.toLowerCase()] || match;
  });
}

export function replaceEmojiShortcodes(value: string, cursorPosition?: number) {
  const text = replaceKnownShortcodes(value);
  if (cursorPosition === undefined) return { text };

  return {
    text,
    cursorPosition: replaceKnownShortcodes(value.slice(0, cursorPosition)).length,
  };
}