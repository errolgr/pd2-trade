import { examplesFor } from '../examples';
import type { ComponentDoc } from '../types';

export const feedbackDocs: ComponentDoc[] = [
  {
    slug: 'alert',
    name: 'Alert',
    category: 'feedback',
    description:
      'Static callout inside content with an icon, title and description (season notice, stale data). For a status strip that slides in with actions use Banner; for transient confirmations use a toast.',
    status: 'stable',
    importName: 'Alert',
    props: [
      {
        name: 'variant',
        type: "'default' | 'destructive'",
        default: "'default'",
        description: '`destructive` for failures the user must act on.',
      },
      {
        name: 'AlertTitle / AlertDescription',
        type: 'ComponentProps<"div">',
        description: 'Title line and body; a leading lucide icon child gets its own column.',
      },
    ],
    examples: examplesFor('alert'),
    a11y: 'Renders `role="alert"`, so it is announced when it appears; do not mount several at once for non-urgent info.',
    related: ['banner', 'toast'],
  },
  {
    slug: 'banner',
    name: 'Banner',
    category: 'feedback',
    description:
      'Inline status strip at the top of a panel or page (consent prompt, sync error, info notice) with an icon tile and optional actions; slides in. Use Alert for static callouts inside content.',
    status: 'stable',
    importName: 'Banner',
    props: [
      {
        name: 'tone',
        type: "'info' | 'success' | 'warning' | 'destructive'",
        required: true,
        description: 'Tints the strip and the icon tile; `success` with a check icon for completed actions (synced, connected).',
      },
      { name: 'icon', type: 'ReactNode', required: true, description: 'Lucide icon shown in the tile.' },
      { name: 'actions', type: 'ReactNode', description: 'Buttons on the right (`size="xs"`).' },
      {
        name: 'role',
        type: "'alert' | 'status'",
        description: '`alert` for failures (announced immediately), `status` for notices; omit for prompts.',
      },
    ],
    examples: examplesFor('banner'),
    a11y: 'No role by default; set `role` to have it announced. Actions are regular Buttons and work by pointer without window focus.',
    related: ['alert', 'empty-state'],
  },
  {
    slug: 'empty-state',
    name: 'Empty state',
    category: 'feedback',
    description:
      'Centered "nothing here" or blocked state (no listings, no results, sign in required) with icon, title, description and one action. This is the shadcn Empty; `compact` for small panels and table bodies.',
    status: 'stable',
    importName: 'EmptyState',
    props: [
      { name: 'title', type: 'ReactNode', required: true, description: 'Short sentence-case statement.' },
      { name: 'description', type: 'ReactNode', description: 'What to do next.' },
      { name: 'icon', type: 'ReactNode', description: 'Lucide icon in a round tile.' },
      { name: 'action', type: 'ReactNode', description: 'The one next step (a Button).' },
      {
        name: 'compact',
        type: 'boolean',
        default: 'false',
        description: 'No dashed frame, smaller tile and padding.',
      },
    ],
    examples: examplesFor('empty-state'),
    a11y: 'Plain content (no live region). If it replaces results after a search, announce the change from the search field instead.',
    related: ['banner', 'skeleton-rows'],
  },
  {
    slug: 'progress',
    name: 'Progress',
    category: 'feedback',
    description: 'Determinate bar for a long task with a known fraction (stash scan, import). Pair it with a text label.',
    status: 'stable',
    importName: 'Progress',
    props: [
      { name: 'value', type: 'number | null', description: 'Percent complete, 0-100.' },
      { name: 'max', type: 'number', default: '100', description: 'Upper bound of `value`.' },
    ],
    examples: examplesFor('progress'),
    a11y: 'Radix Progress: `role="progressbar"` with `aria-valuenow`. Add `aria-label` or `aria-labelledby` pointing at the visible label.',
    related: ['spinner', 'skeleton'],
  },
  {
    slug: 'skeleton',
    name: 'Skeleton',
    category: 'feedback',
    description:
      'Pulsing placeholder block shaped like the content that is loading (tiles, title lines, charts). For lists and tables use SkeletonRows.',
    status: 'stable',
    importName: 'Skeleton',
    props: [
      {
        name: 'className',
        type: 'string',
        description: 'Size and shape (`h-3.5 w-3/4`, `size-10 rounded-md`).',
      },
    ],
    examples: examplesFor('skeleton'),
    a11y: 'Decorative. Mark the loading region with `aria-busy` or a `role="status"` label (SkeletonRows does this for you).',
    related: ['skeleton-rows', 'spinner'],
  },
  {
    slug: 'skeleton-rows',
    name: 'Skeleton rows',
    category: 'feedback',
    description: 'Ready-made list/table loading placeholder: `rows` label/value bars. The default for any list that is fetching.',
    status: 'stable',
    importName: 'SkeletonRows',
    props: [{ name: 'rows', type: 'number', default: '3', description: 'Number of placeholder rows.' }],
    examples: examplesFor('skeleton-rows'),
    a11y: '`role="status"` labelled with UiLabels `loading`.',
    related: ['skeleton', 'error-chip'],
  },
  {
    slug: 'error-chip',
    name: 'Error chip',
    category: 'feedback',
    description:
      'Compact inline failure for one section that failed while the rest works ("Couldn\'t load prices · Retry"). For a whole-panel failure use Banner.',
    status: 'stable',
    importName: 'ErrorChip',
    props: [
      { name: 'message', type: 'ReactNode', required: true, description: 'What failed; truncates.' },
      { name: 'onRetry', type: '() => void', description: 'Shows a Retry action labelled from UiLabels `retry`.' },
    ],
    examples: examplesFor('error-chip'),
    a11y: '`role="alert"`, announced when it appears. Retry is a Button that works by pointer without window focus.',
    related: ['banner', 'skeleton-rows'],
  },
  {
    slug: 'spinner',
    name: 'Spinner',
    category: 'feedback',
    description:
      'Spinning busy indicator for in-button and inline pending states only ("Listing…", "Syncing stash…"). Never for content areas: those use Skeleton or SkeletonRows.',
    status: 'beta',
    importName: 'Spinner',
    props: [
      {
        name: 'size',
        type: "'xs' | 'sm' | 'default'",
        default: "'default'",
        description: '`xs` = size-3, `sm` = size-3.5 (with text-xs / small buttons), `default` = size-4.',
      },
      {
        name: 'aria-label',
        type: 'string',
        default: 'UiLabels `loading`',
        description: 'Override the announced label.',
      },
    ],
    examples: examplesFor('spinner'),
    a11y: '`role="status"` with the UiLabels `loading` label. In a button, also disable the button and change its text so the pending state is not icon-only.',
    related: ['progress', 'skeleton'],
  },
  {
    slug: 'toast',
    name: 'Toast',
    category: 'feedback',
    description:
      'Transient confirmation or error after an action (copied, listed, bump failed), via sonner `toast()`. The app mounts `<Toaster theme={mode} />` once; call `toast`, `toast.success`, `toast.error` anywhere.',
    status: 'stable',
    importName: 'toast',
    props: [
      {
        name: 'message',
        type: 'ReactNode',
        required: true,
        description: 'First argument: the short sentence-case message.',
      },
      {
        name: 'options',
        type: '{ description?: ReactNode; action?: { label: string; onClick: () => void }; duration?: number; id?: string | number }',
        description: 'Second argument (sonner ExternalToast); pass `id` to update or dedupe a toast.',
      },
      {
        name: 'Toaster.theme',
        type: "'light' | 'dark'",
        required: true,
        description: 'The app light/dark mode so rich colors match the theme.',
      },
    ],
    examples: examplesFor('toast'),
    a11y:
      'Sonner renders an `aria-live` region, so toasts are announced. Toasts never take focus, which suits the non-focusable overlay; anything the user must act on belongs in a Banner or dialog, not a toast.',
    related: ['alert', 'banner'],
  },
];
