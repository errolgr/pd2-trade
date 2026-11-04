import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
} from '@pd2-trader/ui';

export const meta = {
  title: 'Edit form',
  description: 'A modal form: trigger, header with title and description, body fields and a footer with `DialogClose` for cancel. The close button (top right) is built in.',
  order: 0,
};

export default function DialogEditPriceExample() {
  return (
    <div className="rounded-lg border bg-surface p-4">
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline">Edit price</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit listing price</DialogTitle>
            <DialogDescription>Harlequin Crest · Shako · 141 defense</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="dialog-price">Price (HR)</Label>
            <Input id="dialog-price"
              defaultValue="1.5" />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <DialogClose asChild>
              <Button>Save</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
