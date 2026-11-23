interface TitanBotAvatarProps {
  className?: string;
}

export default function TitanBotAvatar({ className }: TitanBotAvatarProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-label="Titan Bot"
      className={className}
    >
      <circle cx="32" cy="32" r="31" fill="hsl(var(--primary))" />
      <path
        d="M17 18h30v8H35v20h-8V26H17z"
        fill="hsl(var(--primary-foreground))"
      />
    </svg>
  );
}
