import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@pd2-trader/ui';

export const meta = {
  title: 'Controlled',
  description: 'Drive `open` / `onOpenChange` yourself to open the dialog from anywhere (a row action, a hotkey) and close it after an async save.',
  order: 1,
};

export default function DialogControlledExample() {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('Ladder, will trade for Ber');
  const [saved, setSaved] = useState(note);
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-surface p-4 text-sm">
      <span className="text-muted-foreground">Note: {saved}</span>
      <Button variant="quiet"
        size="inline"
        onClick={() => setOpen(true)}>
        Edit
      </Button>
      <Dialog open={open}
        onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Listing note</DialogTitle>
            <DialogDescription>Shown under the item on pd2trader.com.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="dialog-note">Note</Label>
            <Input id="dialog-note"
              value={note}
              onChange={(e) => setNote(e.target.value)} />
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setSaved(note);
                setOpen(false);
              }}
            >
              Save note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
