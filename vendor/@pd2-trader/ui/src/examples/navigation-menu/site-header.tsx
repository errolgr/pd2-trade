import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '@pd2-trader/ui';

export const meta = {
  title: 'Site header',
  description: 'Website top navigation: plain links styled with `navigationMenuTriggerStyle()`, hover-opened link panels in the shared viewport, and the indicator caret. `active` marks the current section with the theme glow.',
  order: 0,
};

const NET_WORTH = [
  { title: 'My net worth', description: 'Stash value, history and sessions' },
  { title: 'Leaderboard', description: 'Top net gained, wealth and sessions' },
  { title: 'Rare appraisal', description: 'Stats that multiply a rare\'s price' },
];

const TOOLS = [
  { title: 'Price check', description: 'Hover an item in game for its market price' },
  { title: 'Runeword planner', description: 'Bases, sockets and rune cost in HR' },
  { title: 'Corrupted zones', description: 'Current zone and the next rotation' },
  { title: 'Uber tracker', description: 'Keys, organs and torch progress' },
];

export default function NavigationMenuSiteHeaderExample() {
  return (
    <div className="h-80 w-full max-w-3xl">
      <div className="flex h-12 items-center gap-4 rounded-lg border bg-surface px-3">
        <span className="text-sm font-semibold tracking-tight">PD2 Trader</span>
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuLink href="#"
                active
                className={navigationMenuTriggerStyle()}>
                Economy
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuTrigger>Net worth</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="flex w-72 flex-col">
                  {NET_WORTH.map((link) => (
                    <li key={link.title}>
                      <NavigationMenuLink href="#">
                        <span className="font-semibold text-foreground">{link.title}</span>
                        <span className="text-xs text-muted-foreground">{link.description}</span>
                      </NavigationMenuLink>
                    </li>
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuTrigger>Tools</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-120 grid-cols-2 gap-0.5">
                  {TOOLS.map((link) => (
                    <li key={link.title}>
                      <NavigationMenuLink href="#">
                        <span className="font-semibold text-foreground">{link.title}</span>
                        <span className="text-xs text-muted-foreground">{link.description}</span>
                      </NavigationMenuLink>
                    </li>
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink href="#"
                className={navigationMenuTriggerStyle()}>
                Builds
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuIndicator />
          </NavigationMenuList>
        </NavigationMenu>
      </div>
    </div>
  );
}
