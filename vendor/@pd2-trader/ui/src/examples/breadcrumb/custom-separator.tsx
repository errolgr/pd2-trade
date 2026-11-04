import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@pd2-trader/ui';
import { Slash } from 'lucide-react';

export const meta = {
  title: 'Custom separator and router links',
  description: 'Pass any icon as the separator\'s child. `BreadcrumbLink asChild` styles your router link instead of rendering an `<a>`.',
  order: 1,
};

export default function BreadcrumbCustomSeparatorExample() {
  return (
    <div className="w-fit rounded-lg border bg-surface p-4">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <a href="#">Builds</a>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <Slash />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbLink href="#">Sorceress</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <Slash />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbPage>Blizzard</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
