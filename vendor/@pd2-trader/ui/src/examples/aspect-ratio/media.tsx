import { AspectRatio } from '@pd2-trader/ui';

export const meta = {
  title: 'Screenshot and item art',
  description:
    'A 16 / 9 frame for screenshots and video embeds, and a 1 / 1 tile for item art. The child fills the frame, so the layout does not jump while the image loads.',
  order: 0,
};

export default function AspectRatioMediaExample() {
  return (
    <div className="flex w-160 items-start gap-4 rounded-lg border bg-surface p-4">
      <div className="flex-1">
        <AspectRatio ratio={16 / 9}
          className="overflow-hidden rounded-md border bg-muted">
          <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
            Hell cows run, 16 / 9
          </div>
        </AspectRatio>
      </div>
      <div className="w-24">
        <AspectRatio ratio={1}
          className="overflow-hidden rounded-md border bg-muted">
          <div className="flex size-full items-center justify-center text-xs text-q-unique">Shako</div>
        </AspectRatio>
      </div>
    </div>
  );
}
