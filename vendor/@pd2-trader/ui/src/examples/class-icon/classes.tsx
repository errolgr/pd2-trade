import { ClassIcon, classPortraitUrl, D2_CLASSES } from '@pd2-trader/ui';

export const meta = {
  title: 'Portraits and tiles',
  description: 'The seven class portraits framed in their class color, the lettered tile (`src={null}` or failed art), and an unknown class.',
  order: 1,
};

const ORIGIN = 'https://pd2trader.com';

export default function ClassesExample() {
  return (
    <div className="flex w-popover flex-col gap-4 rounded-lg border bg-surface p-4">
      <div className="flex flex-wrap items-end gap-3">
        {D2_CLASSES.map((cls) => (
          <ClassIcon key={cls}
            cls={cls}
            src={classPortraitUrl(cls, ORIGIN)}
            size={41}
            alt={cls} />
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        {D2_CLASSES.map((cls) => (
          <ClassIcon key={cls}
            cls={cls}
            src={null}
            size={32} />
        ))}
        <ClassIcon cls="Warlock"
          size={32} />
      </div>
    </div>
  );
}
