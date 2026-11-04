import { Separator } from '@pd2-trader/ui';

export const meta = {
  title: 'Orientations',
  description: 'Horizontal rule between blocks and vertical separators between inline stats (give the row a height).',
  order: 0,
};

export default function OrientationsExample() {
  return (
    <div className="w-sidebar rounded-lg border bg-surface p-4 text-xs">
      <p>Harlequin Crest</p>
      <Separator className="my-2" />
      <div className="flex h-4 items-center gap-2 text-muted-foreground">
        <span>Shako</span>
        <Separator orientation="vertical" />
        <span>141 def</span>
        <Separator orientation="vertical" />
        <span>Req lvl 62</span>
      </div>
    </div>
  );
}
