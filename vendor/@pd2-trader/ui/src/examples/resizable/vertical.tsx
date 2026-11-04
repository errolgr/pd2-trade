import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@pd2-trader/ui';

export const meta = {
  title: 'Vertical, plain handle',
  description:
    '`direction="vertical"` stacks the panels; without `withHandle` the handle is a hairline that highlights on hover and drag.',
  order: 1,
};

export default function ResizableVerticalExample() {
  return (
    <div className="h-72 w-sidebar overflow-hidden rounded-lg border bg-surface text-xs text-surface-foreground">
      <ResizablePanelGroup direction="vertical">
        <ResizablePanel defaultSize={65}
          minSize={30}>
          <div className="p-3">Price history chart</div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={35}
          minSize={20}>
          <div className="p-3 text-muted-foreground">Recent trades: 24 in 7 days</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
