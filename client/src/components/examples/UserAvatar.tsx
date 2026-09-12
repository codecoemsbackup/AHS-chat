import UserAvatar from "../UserAvatar";

export default function UserAvatarExample() {
  return (
    <div className="flex items-center gap-6 p-6">
      <UserAvatar name="John Doe" size="sm" showOnlineStatus isOnline />
      <UserAvatar name="Jane Smith" size="md" showOnlineStatus isOnline />
      <UserAvatar name="Mike Johnson" size="lg" showOnlineStatus />
    </div>
  );
}
