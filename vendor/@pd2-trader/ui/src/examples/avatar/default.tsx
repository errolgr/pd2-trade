import { Avatar, AvatarFallback, AvatarImage } from '@pd2-trader/ui';
import { User } from 'lucide-react';

export const meta = {
  title: 'Image and fallback',
  description: 'Initials fallbacks at three sizes, an `AvatarImage` whose URL fails (the fallback stays) and an icon fallback. Resize with `className` (`size-6`, `size-10`).',
  order: 0,
};

export default function AvatarExample() {
  return (
    <div className="flex w-fit items-center gap-3 rounded-lg border bg-surface p-4">
      <Avatar className="size-6">
        <AvatarFallback>HD</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback>HD</AvatarFallback>
      </Avatar>
      <Avatar className="size-10">
        <AvatarImage src="/missing-portrait.png"
          alt="CowKing" />
        <AvatarFallback>CK</AvatarFallback>
      </Avatar>
      <Avatar className="size-10">
        <AvatarFallback>
          <User />
        </AvatarFallback>
      </Avatar>
    </div>
  );
}
