import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@pd2-trader/ui';

export const meta = {
  title: 'Without a viewport',
  description: 'With `viewport={false}` and no viewport placed, each content opens as its own popover right under its trigger (no size animation between items).',
  order: 2,
};

export default function NavigationMenuInlinePopoversExample() {
  return (
    <div className="h-56 w-full max-w-3xl">
      <div className="flex h-12 items-center rounded-lg border bg-surface px-3">
        <NavigationMenu viewport={false}>
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger>Market</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="flex w-48 flex-col">
                  <li>
                    <NavigationMenuLink href="#">Uniques</NavigationMenuLink>
                  </li>
                  <li>
                    <NavigationMenuLink href="#">Runes</NavigationMenuLink>
                  </li>
                  <li>
                    <NavigationMenuLink href="#">Runewords</NavigationMenuLink>
                  </li>
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuTrigger>Season</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="flex w-48 flex-col">
                  <li>
                    <NavigationMenuLink href="#">Ladder</NavigationMenuLink>
                  </li>
                  <li>
                    <NavigationMenuLink href="#">Hardcore</NavigationMenuLink>
                  </li>
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>
    </div>
  );
}
