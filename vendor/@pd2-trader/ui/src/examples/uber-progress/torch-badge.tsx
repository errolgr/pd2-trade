import { UberProgress } from '@pd2-trader/ui';

export const meta = {
  title: 'Torch tracker badge',
  description: '`variant="badge"`: the compact chip for headers; it glows when a run is ready.',
  order: 2,
};

export default function TorchBadgeExample() {
  return (
    <div className="flex w-popover flex-wrap gap-2 rounded-lg border bg-surface p-4">
      <UberProgress variant="badge"
        encounter="Torch"
        materials={[
          { name: "Mephisto's Brain", have: 2 },
          { name: "Diablo's Horn", have: 3 },
          { name: "Baal's Eye", have: 2 },
        ]} />
      <UberProgress variant="badge"
        encounter="Ancients"
        materials={[
          { name: 'Sigil of Madawc', have: 1 },
          { name: 'Sigil of Talic', have: 0 },
          { name: 'Sigil of Korlic', have: 2 },
        ]} />
    </div>
  );
}
