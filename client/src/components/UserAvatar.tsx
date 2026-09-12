import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserAvatarProps {
  name: string;
  avatarUrl?: string;
  size?: "sm" | "md" | "lg";
  showOnlineStatus?: boolean;
  isOnline?: boolean;
}

export default function UserAvatar({
  name,
  avatarUrl,
  size = "md",
  showOnlineStatus = false,
  isOnline = false,
}: UserAvatarProps) {
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-16 h-16 text-base",
  };

  const statusSizeClasses = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
    lg: "w-4 h-4",
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="relative inline-block">
      <Avatar className={sizeClasses[size]}>
        <AvatarImage src={avatarUrl} alt={name} className="object-cover" />
        <AvatarFallback>{getInitials(name)}</AvatarFallback>
      </Avatar>
      {showOnlineStatus && (
        <span
          className={`absolute bottom-0 right-0 rounded-full border-2 border-background ${statusSizeClasses[size]} ${
            isOnline ? "bg-status-online" : "bg-status-offline"
          }`}
        />
      )}
    </div>
  );
}
