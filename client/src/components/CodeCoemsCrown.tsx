import { Crown } from "lucide-react";

interface CodeCoemsCrownProps {
  username?: string | null;
  className?: string;
}

export default function CodeCoemsCrown({
  username,
  className = "h-3 w-3",
}: CodeCoemsCrownProps) {
  if (username?.trim().toLowerCase() !== "codecoems") return null;

  return (
    <Crown
      className={`inline-block shrink-0 text-amber-500 ${className}`}
      role="img"
      aria-label="CodeCoems, site owner"
    />
  );
}
