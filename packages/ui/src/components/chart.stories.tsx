import type { Story, StoryDefault } from '@ladle/react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis } from 'recharts';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@pd2-trader/ui';

export default { title: 'Primitives / Chart' } satisfies StoryDefault;

const HISTORY = [
  { day: 'Mon', ber: 1.1, jah: 0.9 },
  { day: 'Tue', ber: 1.15, jah: 0.95 },
  { day: 'Wed', ber: 1.05, jah: 1.0 },
  { day: 'Thu', ber: 1.2, jah: 1.05 },
  { day: 'Fri', ber: 1.3, jah: 1.1 },
  { day: 'Sat', ber: 1.25, jah: 1.2 },
  { day: 'Sun', ber: 1.35, jah: 1.15 },
];

const config = {
  ber: { label: 'Ber', color: 'var(--chart-1)' },
  jah: { label: 'Jah', color: 'var(--chart-2)' },
} satisfies ChartConfig;

export const AreaHistory: Story = () => (
  <div className="w-popover rounded-lg border bg-surface p-4">
    <ChartContainer config={config}
      className="aspect-video w-full">
      <AreaChart data={HISTORY}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="day"
          tickLine={false}
          axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={({ payload }) => <ChartLegendContent payload={payload} />} />
        <Area dataKey="ber"
          type="monotone"
          stroke="var(--color-ber)"
          fill="var(--color-ber)"
          fillOpacity={0.2} />
        <Area dataKey="jah"
          type="monotone"
          stroke="var(--color-jah)"
          fill="var(--color-jah)"
          fillOpacity={0.2} />
      </AreaChart>
    </ChartContainer>
  </div>
);

export const Bars: Story = () => (
  <div className="w-popover rounded-lg border bg-surface p-4">
    <ChartContainer config={config}
      className="aspect-video w-full">
      <BarChart data={HISTORY}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="day"
          tickLine={false}
          axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent indicator="dashed" />} />
        <Bar dataKey="ber"
          fill="var(--color-ber)"
          radius={4} />
        <Bar dataKey="jah"
          fill="var(--color-jah)"
          radius={4} />
      </BarChart>
    </ChartContainer>
  </div>
);
