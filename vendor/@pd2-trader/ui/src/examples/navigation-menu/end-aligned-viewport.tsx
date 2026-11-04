import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuViewport,
} from '@pd2-trader/ui';
import { BookOpen, KeyRound, Puzzle } from 'lucide-react';

export const meta = {
  title: 'End-aligned viewport',
  description: 'For a menu at the right end of a header: `viewport={false}` drops the built-in viewport and a `NavigationMenuViewport align="end"` keeps the panel inside the bar.',
  order: 1,
};

const DEVELOPERS = [
  { title: 'API keys', description: 'Create and revoke keys', icon: KeyRound },
  { title: 'Plugins', description: 'Build overlay plugins', icon: Puzzle },
  { title: 'Docs', description: 'Endpoints and rate limits', icon: BookOpen },
];

export default function NavigationMenuEndAlignedExample() {
  return (
    <div className="h-64 w-full max-w-3xl">
      <div className="flex h-12 items-center justify-end rounded-lg border bg-surface px-3">
        <NavigationMenu viewport={false}>
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger>Developers</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="flex w-64 flex-col">
                  {DEVELOPERS.map((link) => (
                    <li key={link.title}>
                      <NavigationMenuLink href="#"
                        className="flex-row items-center gap-2.5">
                        <link.icon aria-hidden />
                        <span className="flex flex-col">
                          <span className="font-semibold text-foreground">{link.title}</span>
                          <span className="text-xs text-muted-foreground">{link.description}</span>
                        </span>
                      </NavigationMenuLink>
                    </li>
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
          </NavigationMenuList>
          <NavigationMenuViewport align="end" />
        </NavigationMenu>
      </div>
    </div>
  );
}
