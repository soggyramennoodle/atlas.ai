import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  profileAvatarInitial,
  profileAvatarUrl,
} from "@/lib/profile-avatar";
import { cn } from "@/lib/utils";

export function UserAvatar({
  displayName,
  avatarR2Key,
  className,
  fallbackClassName,
  textClassName,
}: {
  displayName: string;
  avatarR2Key?: string | null;
  className?: string;
  fallbackClassName?: string;
  textClassName?: string;
}) {
  const initial = profileAvatarInitial(displayName);
  const src = profileAvatarUrl(avatarR2Key);

  return (
    <Avatar className={cn("rounded-[4px] border border-border", className)}>
      {src ? (
        <AvatarImage
          src={src}
          alt=""
          className="rounded-[4px] object-cover"
        />
      ) : null}
      <AvatarFallback
        className={cn(
          "rounded-[4px] bg-secondary text-sm font-semibold text-foreground",
          fallbackClassName
        )}
      >
        <span className={textClassName}>{initial}</span>
      </AvatarFallback>
    </Avatar>
  );
}
