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
    <Avatar className={cn("rounded-2xl border border-black/[0.10] bg-white", className)}>
      {src ? (
        <AvatarImage
          src={src}
          alt=""
          className="rounded-2xl object-cover"
        />
      ) : null}
      <AvatarFallback
        className={cn(
          "rounded-2xl bg-[#0d0d0d] text-sm font-medium text-white",
          fallbackClassName
        )}
      >
        <span className={textClassName}>{initial}</span>
      </AvatarFallback>
    </Avatar>
  );
}
