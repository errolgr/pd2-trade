import type { Story, StoryDefault } from '@ladle/react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
} from '@pd2-trader/ui';

export default { title: 'Primitives / AlertDialog' } satisfies StoryDefault;

const Body = () => (
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delist 14 items?</AlertDialogTitle>
      <AlertDialogDescription>
        All active listings on pd2trader.com for this character are removed. Offers in progress are cancelled.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Keep listings</AlertDialogCancel>
      <AlertDialogAction>Delist all</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
);

export const Open: Story = () => (
  <AlertDialog defaultOpen>
    <AlertDialogTrigger asChild>
      <Button variant="destructive">Delist all</Button>
    </AlertDialogTrigger>
    <Body />
  </AlertDialog>
);

export const Trigger: Story = () => (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button variant="destructive">Delist all</Button>
    </AlertDialogTrigger>
    <Body />
  </AlertDialog>
);
