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

export const meta = {
  title: 'Destructive confirm',
  description: 'Confirm an action that cannot be undone. Only Cancel or the action closes it (no click-outside); `variant="destructive"` on the action.',
  order: 0,
};

export default function AlertDialogDestructiveConfirmExample() {
  return (
    <div className="rounded-lg border bg-surface p-4">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive">Delist all</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delist 14 items?</AlertDialogTitle>
            <AlertDialogDescription>
              All active listings on pd2trader.com for this character are removed. Offers in progress are cancelled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep listings</AlertDialogCancel>
            <AlertDialogAction variant="destructive">Delist all</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
