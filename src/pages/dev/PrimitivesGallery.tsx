import React, { useState } from 'react';
import { Coins, Info, Loader2, Settings, TriangleAlert } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { WindowChrome, WindowPanel } from '@/components/custom/window-chrome';

const VARIANTS = ['default', 'secondary', 'outline', 'ghost', 'destructive', 'link'] as const;
const SIZES = ['sm', 'default', 'lg'] as const;
const QUALITIES = ['unique', 'set', 'rare', 'magic', 'crafted', 'rune', 'normal', 'gold', 'corrupted'] as const;
const QUALITY_CLASS: Record<(typeof QUALITIES)[number], string> = {
  unique: 'text-q-unique',
  set: 'text-q-set',
  rare: 'text-q-rare',
  magic: 'text-q-magic',
  crafted: 'text-q-crafted',
  rune: 'text-q-rune',
  normal: 'text-q-normal',
  gold: 'text-q-gold',
  corrupted: 'text-q-corrupted',
};

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={className}>
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

export default function PrimitivesGallery() {
  const open = new URLSearchParams(window.location.search).get('open');
  const [checked, setChecked] = useState(true);

  return (
    <TooltipProvider>
      <div className="min-h-screen w-full bg-background p-4 text-foreground">
        <div className="mx-auto grid max-w-[1100px] grid-cols-3 gap-4 text-sm">
          <Section title="Buttons"
            className="col-span-2">
            <div className="space-y-2">
              {SIZES.map((size) => (
                <div key={size}
                  className="flex flex-wrap items-center gap-2">
                  {VARIANTS.map((variant) => (
                    <Button key={variant}
                      variant={variant}
                      size={size}>
                      {variant}
                    </Button>
                  ))}
                </div>
              ))}
              <div className="flex flex-wrap items-center gap-2">
                <Button disabled>Disabled</Button>
                <Button variant="outline"
                  disabled>
                  Disabled
                </Button>
                <Button disabled>
                  <Loader2 className="animate-spin" />
                  Loading
                </Button>
                <Button size="icon"
                  variant="outline"
                  aria-label="Settings">
                  <Settings />
                </Button>
              </div>
            </div>
          </Section>

          <Section title="Badges">
            <div className="flex flex-wrap gap-2">
              <Badge>default</Badge>
              <Badge variant="secondary">secondary</Badge>
              <Badge variant="outline">outline</Badge>
              <Badge variant="destructive">destructive</Badge>
            </div>
            <h3 className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Semantic
            </h3>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-md bg-success/15 px-2 py-0.5 text-success">success</span>
              <span className="rounded-md bg-warning/15 px-2 py-0.5 text-warning">warning</span>
              <span className="rounded-md bg-info/15 px-2 py-0.5 text-info">info</span>
              <span className="rounded-md bg-destructive/15 px-2 py-0.5 text-destructive">destructive</span>
            </div>
          </Section>

          <Section title="Inputs">
            <div className="space-y-2">
              <Input placeholder="Empty" />
              <Input defaultValue="Shako" />
              <Input placeholder="Disabled"
                disabled />
              <Input defaultValue="Invalid"
                aria-invalid />
              <Textarea placeholder="Textarea" />
            </div>
          </Section>

          <Section title="Select / Checkbox / Switch / Slider">
            <div className="space-y-3">
              <Select defaultOpen={open === 'select'}
                defaultValue="sc">
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sc">Softcore Ladder</SelectItem>
                  <SelectItem value="hc">Hardcore Ladder</SelectItem>
                  <SelectItem value="nl">Non-ladder</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-4">
                <Label>
                  <Checkbox checked={checked}
                    onCheckedChange={(v) => setChecked(v === true)} />
                  On
                </Label>
                <Label>
                  <Checkbox />
                  Off
                </Label>
                <Label>
                  <Checkbox disabled
                    defaultChecked />
                  Disabled
                </Label>
              </div>
              <div className="flex items-center gap-4">
                <Switch defaultChecked />
                <Switch />
                <Switch disabled
                  defaultChecked />
              </div>
              <Slider defaultValue={[40]}
                max={100} />
              <Progress value={62} />
            </div>
          </Section>

          <Section title="Tabs / Toggle group">
            <Tabs defaultValue="items">
              <TabsList>
                <TabsTrigger value="items">Items</TabsTrigger>
                <TabsTrigger value="runes">Runes</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>
              <TabsContent value="items"
                className="text-muted-foreground">
                Items tab content
              </TabsContent>
            </Tabs>
            <ToggleGroup type="single"
              variant="outline"
              defaultValue="hr"
              className="mt-3">
              <ToggleGroupItem value="hr">HR</ToggleGroupItem>
              <ToggleGroupItem value="gold">Gold</ToggleGroupItem>
              <ToggleGroupItem value="ist">Ist</ToggleGroupItem>
            </ToggleGroup>
            <h3 className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Skeleton
            </h3>
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </Section>

          <Section title="Alerts">
            <div className="space-y-2">
              <Alert>
                <Info />
                <AlertTitle>Heads up</AlertTitle>
                <AlertDescription>Prices refresh every 5 minutes.</AlertDescription>
              </Alert>
              <Alert variant="destructive">
                <TriangleAlert />
                <AlertTitle>Request failed</AlertTitle>
                <AlertDescription>Could not reach the market API.</AlertDescription>
              </Alert>
            </div>
          </Section>

          <Section title="Card / Breadcrumb / Separator">
            <Card>
              <CardHeader className="p-4">
                <CardTitle>Stash value</CardTitle>
                <CardDescription>Softcore Ladder · S13</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 text-2xl font-semibold">142.5 HR</CardContent>
            </Card>
            <Separator className="my-3" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="#">Settings</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Appearance</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </Section>

          <Section title="Table">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  ['Harlequin Crest', '3.5 HR', 'text-q-unique'],
                  ['Tal Rasha\u2019s Guardianship', '1.2 HR', 'text-q-set'],
                  ['Ber Rune', '1 HR', 'text-q-rune'],
                ].map(([name, price, cls]) => (
                  <TableRow key={name}>
                    <TableCell className={cls}>{name}</TableCell>
                    <TableCell className="text-right">{price}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Section>

          <Section title="Window chrome">
            <WindowPanel className="h-40">
              <WindowChrome title="Stash Value"
                icon={<Coins />}
                diabloFont
                titleClassName="text-q-unique"
                actions={
                  <Button size="sm"
                    variant="ghost"
                    className="h-7">
                    Refresh
                  </Button>
                }
                onClose={() => undefined} />
              <div className="p-3 text-muted-foreground">Panel body on bg-surface</div>
            </WindowPanel>
          </Section>

          <Section title="Quality colors"
            className="col-span-2">
            <div className="flex flex-wrap gap-3 font-semibold">
              {QUALITIES.map((q) => (
                <span key={q}
                  className={QUALITY_CLASS[q]}
                  style={{ fontFamily: 'DiabloFont' }}>
                  {q}
                </span>
              ))}
            </div>
          </Section>

          <Section title="Overlays (?open=…)">
            <div className="flex flex-wrap gap-2">
              <Dialog defaultOpen={open === 'dialog'}>
                <DialogTrigger asChild>
                  <Button size="sm"
                    variant="outline">
                    Dialog
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit listing</DialogTitle>
                    <DialogDescription>Update the asking price for this item.</DialogDescription>
                  </DialogHeader>
                  <Input defaultValue="2.5 HR" />
                  <DialogFooter>
                    <Button variant="outline">Cancel</Button>
                    <Button>Save</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <AlertDialog defaultOpen={open === 'alert-dialog'}>
                <AlertDialogTrigger asChild>
                  <Button size="sm"
                    variant="outline">
                    Alert dialog
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete listing?</AlertDialogTitle>
                    <AlertDialogDescription>This removes the listing from the market.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Sheet defaultOpen={open === 'sheet'}>
                <SheetTrigger asChild>
                  <Button size="sm"
                    variant="outline">
                    Sheet
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Filters</SheetTitle>
                    <SheetDescription>Narrow down market results.</SheetDescription>
                  </SheetHeader>
                </SheetContent>
              </Sheet>

              <Popover defaultOpen={open === 'popover'}>
                <PopoverTrigger asChild>
                  <Button size="sm"
                    variant="outline">
                    Popover
                  </Button>
                </PopoverTrigger>
                <PopoverContent>
                  <p className="font-medium">Rune prices</p>
                  <p className="text-muted-foreground">Ber 1 HR · Jah 0.9 HR</p>
                </PopoverContent>
              </Popover>

              <Tooltip defaultOpen={open === 'tooltip'}>
                <TooltipTrigger asChild>
                  <Button size="sm"
                    variant="outline">
                    Tooltip
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Online in-game</TooltipContent>
              </Tooltip>

              <DropdownMenu defaultOpen={open === 'dropdown'}>
                <DropdownMenuTrigger asChild>
                  <Button size="sm"
                    variant="outline">
                    Dropdown
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Listing</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Bump</DropdownMenuItem>
                  <DropdownMenuItem>Edit price</DropdownMenuItem>
                  <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </Section>
        </div>
      </div>
    </TooltipProvider>
  );
}
