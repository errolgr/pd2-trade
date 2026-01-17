import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { X, ChevronRight, Tag, Target, Settings, ShoppingCart, Gamepad2, Archive, Sparkles } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { MarketSearchFilters as MarketSearchFiltersType, DEFAULT_FILTERS, SaleType } from '../lib/types';
import { ItemQuality } from '@/common/types/Item';
import { itemTypes } from '@/common/item-types';
import { modifiers } from '@/assets/modifiers';
import { ModifierCombobox } from './ModifierCombobox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel } from '@/components/ui/sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MarketSearchFiltersProps {
  filters: MarketSearchFiltersType;
  onFiltersChange: (filters: MarketSearchFiltersType) => void;
  settings: { mode: 'hardcore' | 'softcore'; ladder: 'ladder' | 'non-ladder' };
}

const ALL_QUALITIES_OPTION = { value: 'all-qualities', label: 'All Qualities' };
const ALL_TYPES_OPTION = { typeValue: 'all-types', typeLabel: 'All Types' };

const QUALITY_OPTIONS = [
  ALL_QUALITIES_OPTION,
  { value: ItemQuality.Normal, label: 'Normal' },
  { value: ItemQuality.Superior, label: 'Superior' },
  { value: ItemQuality.Magic, label: 'Magic' },
  { value: ItemQuality.Rare, label: 'Rare' },
  { value: ItemQuality.Set, label: 'Set' },
  { value: ItemQuality.Unique, label: 'Unique' },
  { value: ItemQuality.Crafted, label: 'Crafted' },
  { value: ItemQuality.Runeword, label: 'Runeword' },
];

const BOOLEAN_OPTIONS = [
  { value: 'both', label: 'Both' },
  { value: 'true', label: 'Yes' },
  { value: 'false', label: 'No' },
];

const SALE_TYPE_OPTIONS: { value: SaleType; label: string }[] = [
  { value: 'any', label: 'Any' },
  { value: 'hr_only', label: 'HR Only' },
  { value: 'price_with_note', label: 'Price with Note' },
  { value: 'no_listed_price', label: 'No Listed Price' },
];

export const MarketSearchFilters: React.FC<MarketSearchFiltersProps> = ({ filters, onFiltersChange, settings }) => {
  const updateFilter = <K extends keyof MarketSearchFiltersType>(key: K, value: MarketSearchFiltersType[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      ...DEFAULT_FILTERS,
      isHardcore: settings.mode === 'hardcore',
      isLadder: settings.ladder === 'ladder',
    });
  };

  // Get available bases for selected item type
  const availableBases = React.useMemo(() => {
    const bases = [];

    if (filters.itemType) {
      const selectedType = itemTypes.find((type) => {
        const typeValue = typeof type.typeValue === 'string' ? type.typeValue : JSON.stringify(type.typeValue);
        // Normalize both values for comparison (remove any whitespace differences)
        const normalizedTypeValue = typeValue.trim();
        const normalizedFilterType = filters.itemType?.trim();
        return normalizedTypeValue === normalizedFilterType;
      });
      if (selectedType?.bases) {
        bases.push(...selectedType.bases);
      }
    }
    return bases;
  }, [filters.itemType]);

  const hasActiveFilters = () => {
    return (
      filters.searchText.trim() !== '' ||
      (filters.quality !== '' && filters.quality !== undefined) ||
      filters.itemType !== undefined ||
      (filters.baseCode !== undefined && filters.baseCode !== 'Any') ||
      filters.levelMin !== undefined ||
      filters.levelMax !== undefined ||
      filters.dexterityMin !== undefined ||
      filters.dexterityMax !== undefined ||
      filters.strengthMin !== undefined ||
      filters.strengthMax !== undefined ||
      filters.minPrice !== undefined ||
      filters.maxPrice !== undefined ||
      filters.corrupted !== 'both' ||
      filters.ethereal !== 'both' ||
      filters.itemLevelMin !== undefined ||
      filters.itemLevelMax !== undefined ||
      filters.identified !== 'both' ||
      filters.socketCountMin !== undefined ||
      filters.socketCountMax !== undefined ||
      filters.sellerAccount !== undefined ||
      filters.collapseListingsByAccount ||
      filters.saleType !== 'any' ||
      filters.searchArchived ||
      filters.isHardcore !== (settings.mode === 'hardcore') ||
      filters.isLadder !== (settings.ladder === 'ladder')
    );
  };

  const filterSections = [
    {
      title: 'Category',
      icon: Tag,
      defaultOpen: true,
      content: (
        <>
          {/* Item Category (Type Code) */}
          <div className="space-y-2">
            <Label htmlFor="item-type"
              className="text-xs">
              Type
            </Label>
            <Select
              value={filters.itemType || ALL_TYPES_OPTION.typeValue}
              onValueChange={(value) => {
                updateFilter('itemType', value === ALL_TYPES_OPTION.typeValue ? undefined : value);
              }}
            >
              <SelectTrigger id="item-type"
                className="w-full h-8">
                <SelectValue placeholder="All Types">
                  {filters.itemType
                    ? itemTypes.find((type) => {
                        const typeValue =
                          typeof type.typeValue === 'string' ? type.typeValue : JSON.stringify(type.typeValue);
                        return typeValue === filters.itemType;
                      })?.typeLabel || 'All Types'
                    : 'All Types'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {[ALL_TYPES_OPTION, ...itemTypes].map((type) => {
                  const typeValue =
                    typeof type.typeValue === 'string' ? type.typeValue : JSON.stringify(type.typeValue);
                  return (
                    <SelectItem key={typeValue || ALL_TYPES_OPTION.typeValue}
                      value={typeValue}>
                      {type.typeLabel}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Base Code */}
          <div className="space-y-2">
            <Label htmlFor="base-code"
              className="text-xs">
              Base
            </Label>
            <Select
              value={filters.baseCode}
              onValueChange={(value) => updateFilter('baseCode', value)}
              disabled={!filters.itemType}
            >
              <SelectTrigger id="base-code"
                className="w-full h-8">
                <SelectValue placeholder={'Any'}>
                  {availableBases.find((base) => base.value === filters.baseCode)?.label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {availableBases.map((base) => (
                  <SelectItem key={base.value}
                    value={base.value}>
                    {base.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quality */}
          <div className="space-y-2">
            <Label htmlFor="quality"
              className="text-xs">
              Quality
            </Label>
            <Select
              value={filters.quality || ALL_QUALITIES_OPTION.value}
              onValueChange={(value) =>
                updateFilter('quality', value === ALL_QUALITIES_OPTION.value ? '' : (value as ItemQuality))
              }
            >
              <SelectTrigger id="quality"
                className="w-full h-8">
                <SelectValue placeholder={ALL_QUALITIES_OPTION.label}>
                  {filters.quality
                    ? QUALITY_OPTIONS.find((option) => option.value === filters.quality)?.label ||
                      ALL_QUALITIES_OPTION.label
                    : ALL_QUALITIES_OPTION.label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {QUALITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value || ALL_QUALITIES_OPTION.value}
                    value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      ),
    },
    {
      title: 'Requirements',
      icon: Target,
      defaultOpen: false,
      content: (
        <>
          {/* Level */}
          <div className="space-y-2">
            <Label className="text-xs">Level</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Min"
                min={1}
                max={99}
                className="h-8"
                value={filters.levelMin ?? ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                  updateFilter('levelMin', value);
                }}
              />
              <Input
                type="number"
                placeholder="Max"
                min={1}
                max={99}
                className="h-8"
                value={filters.levelMax ?? ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                  updateFilter('levelMax', value);
                }}
              />
            </div>
          </div>

          {/* Dexterity */}
          <div className="space-y-2">
            <Label className="text-xs">Dexterity</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Min"
                min={0}
                className="h-8"
                value={filters.dexterityMin ?? ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                  updateFilter('dexterityMin', value);
                }}
              />
              <Input
                type="number"
                placeholder="Max"
                min={0}
                className="h-8"
                value={filters.dexterityMax ?? ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                  updateFilter('dexterityMax', value);
                }}
              />
            </div>
          </div>

          {/* Strength */}
          <div className="space-y-2">
            <Label className="text-xs">Strength</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Min"
                min={0}
                className="h-8"
                value={filters.strengthMin ?? ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                  updateFilter('strengthMin', value);
                }}
              />
              <Input
                type="number"
                placeholder="Max"
                min={0}
                className="h-8"
                value={filters.strengthMax ?? ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                  updateFilter('strengthMax', value);
                }}
              />
            </div>
          </div>
        </>
      ),
    },
    {
      title: 'Misc',
      icon: Settings,
      defaultOpen: false,
      content: (
        <>
          {/* Corrupted */}
          <div className="space-y-2">
            <Label htmlFor="corrupted"
              className="text-xs">
              Corrupted
            </Label>
            <Select
              value={filters.corrupted ?? 'both'}
              onValueChange={(value) => updateFilter('corrupted', value as 'true' | 'false' | 'both')}
            >
              <SelectTrigger id="corrupted"
                className="w-full h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BOOLEAN_OPTIONS.map((option) => (
                  <SelectItem key={option.value}
                    value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Ethereal */}
          <div className="space-y-2">
            <Label htmlFor="ethereal"
              className="text-xs">
              Ethereal
            </Label>
            <Select
              value={filters.ethereal ?? 'both'}
              onValueChange={(value) => updateFilter('ethereal', value as 'true' | 'false' | 'both')}
            >
              <SelectTrigger id="ethereal"
                className="w-full h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BOOLEAN_OPTIONS.map((option) => (
                  <SelectItem key={option.value}
                    value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Item Level */}
          <div className="space-y-2">
            <Label className="text-xs">Item Level</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Min"
                min={1}
                max={99}
                className="h-8"
                value={filters.itemLevelMin ?? ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                  updateFilter('itemLevelMin', value);
                }}
              />
              <Input
                type="number"
                placeholder="Max"
                min={1}
                max={99}
                className="h-8"
                value={filters.itemLevelMax ?? ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                  updateFilter('itemLevelMax', value);
                }}
              />
            </div>
          </div>

          {/* Identified */}
          <div className="space-y-2">
            <Label htmlFor="identified"
              className="text-xs">
              Identified
            </Label>
            <Select
              value={filters.identified ?? 'both'}
              onValueChange={(value) => updateFilter('identified', value as 'true' | 'false' | 'both')}
            >
              <SelectTrigger id="identified"
                className="w-full h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BOOLEAN_OPTIONS.map((option) => (
                  <SelectItem key={option.value}
                    value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Socket Count */}
          <div className="space-y-2">
            <Label className="text-xs">Sockets</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Min"
                min={0}
                max={6}
                className="h-8"
                value={filters.socketCountMin ?? ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                  updateFilter('socketCountMin', value);
                }}
              />
              <Input
                type="number"
                placeholder="Max"
                min={0}
                max={6}
                className="h-8"
                value={filters.socketCountMax ?? ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                  updateFilter('socketCountMax', value);
                }}
              />
            </div>
          </div>
        </>
      ),
    },
    {
      title: 'Modifiers',
      icon: Sparkles,
      defaultOpen: false,
      content: (
        <>
          <div className="space-y-2">
            <div className="space-y-2">
              <Label className="text-xs">Modifier Filters</Label>
              <ModifierCombobox
                selectedModifiers={filters.modifiers?.map((m) => m.name) || []}
                onSelectModifier={(modifierName) => {
                  const existingModifiers = filters.modifiers || [];
                  const modifierIndex = existingModifiers.findIndex((m) => m.name === modifierName);

                  if (modifierIndex >= 0) {
                    // Remove modifier if it exists
                    const newModifiers = existingModifiers.filter((m) => m.name !== modifierName);
                    updateFilter('modifiers', newModifiers.length > 0 ? newModifiers : undefined);
                  } else {
                    // Add modifier if it doesn't exist
                    updateFilter('modifiers', [...existingModifiers, { name: modifierName }]);
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              {filters.modifiers && filters.modifiers.length > 0 ? (
                filters.modifiers.map((mod, index) => {
                  const modifierData = modifiers.find((m) => m.name === mod.name);
                  const displayName =
                    modifierData?.description?.label &&
                    typeof modifierData.description.label === 'object' &&
                    'positive' in modifierData.description.label
                      ? modifierData.description.label.positive
                      : mod.name;
                  return (
                    <div key={index}
                      className="flex items-center gap-2 p-2 border rounded border-border">
                      <Checkbox
                        checked={true}
                        onCheckedChange={(checked) => {
                          if (!checked) {
                            const newModifiers = filters.modifiers?.filter((_, i) => i !== index) || [];
                            updateFilter('modifiers', newModifiers.length > 0 ? newModifiers : undefined);
                          }
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{displayName}</div>
                        <div className="flex gap-2 mt-1">
                          <Input
                            type="number"
                            placeholder="Min"
                            className="h-7 text-xs"
                            value={mod.min ?? ''}
                            onChange={(e) => {
                              const newModifiers = [...(filters.modifiers || [])];
                              newModifiers[index] = {
                                ...newModifiers[index],
                                min: e.target.value === '' ? undefined : parseInt(e.target.value, 10),
                              };
                              updateFilter('modifiers', newModifiers);
                            }}
                          />
                          <Input
                            type="number"
                            placeholder="Max"
                            className="h-7 text-xs"
                            value={mod.max ?? ''}
                            onChange={(e) => {
                              const newModifiers = [...(filters.modifiers || [])];
                              newModifiers[index] = {
                                ...newModifiers[index],
                                max: e.target.value === '' ? undefined : parseInt(e.target.value, 10),
                              };
                              updateFilter('modifiers', newModifiers);
                            }}
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => {
                          const newModifiers = filters.modifiers?.filter((_, i) => i !== index) || [];
                          updateFilter('modifiers', newModifiers.length > 0 ? newModifiers : undefined);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })
              ) : (
                <div className="text-xs text-muted-foreground">No modifier filters added</div>
              )}
            </div>
          </div>
        </>
      ),
    },
    {
      title: 'Trade',
      icon: ShoppingCart,
      defaultOpen: false,
      content: (
        <>
          {/* Seller Account */}
          <div className="space-y-2">
            <Label htmlFor="seller-account"
              className="text-xs">
              Seller Account
            </Label>
            <Input
              id="seller-account"
              type="text"
              placeholder="Filter by seller account..."
              className="h-8"
              value={filters.sellerAccount ?? ''}
              onChange={(e) => updateFilter('sellerAccount', e.target.value || undefined)}
            />
          </div>

          {/* Collapse Listings by Account */}
          <div className="flex items-center justify-between">
            <Label htmlFor="collapse-account"
              className="text-xs font-normal cursor-pointer">
              Collapse Listings by Account
            </Label>
            <Switch
              id="collapse-account"
              checked={filters.collapseListingsByAccount}
              onCheckedChange={(checked) => updateFilter('collapseListingsByAccount', checked)}
            />
          </div>

          {/* Sale Type */}
          <div className="space-y-2">
            <Label htmlFor="sale-type"
              className="text-xs">
              Sale Type
            </Label>
            <Select value={filters.saleType}
              onValueChange={(value) => updateFilter('saleType', value as SaleType)}>
              <SelectTrigger id="sale-type"
                className="w-full h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SALE_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value}
                    value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Price Range */}
          <div className="space-y-2">
            <Label className="text-xs">Price (HR)</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Min"
                min={0}
                step={0.01}
                className="h-8"
                value={filters.minPrice ?? ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
                  updateFilter('minPrice', value);
                }}
              />
              <Input
                type="number"
                placeholder="Max"
                min={0}
                step={0.01}
                className="h-8"
                value={filters.maxPrice ?? ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
                  updateFilter('maxPrice', value);
                }}
              />
            </div>
          </div>
        </>
      ),
    },
  ];

  return (
    <ScrollArea className="flex-1 h-full">
      <div className="flex flex-col pb-16">
        {/* Filter Sections */}
        <SidebarGroup>
          <SidebarGroupLabel>Filters</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="gap-0">
              {filterSections.map((section) => (
                <Collapsible key={section.title}
                  defaultOpen={section.defaultOpen}
                  className="group/collapsible">
                  <SidebarGroup className="px-2 py-1">
                    <SidebarGroupLabel
                      asChild
                      className="group/label text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sm"
                    >
                      <CollapsibleTrigger className="flex items-center gap-2 w-full">
                        {section.icon && <section.icon className="h-4 w-4" />}
                        <span>{section.title}</span>
                        <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                      </CollapsibleTrigger>
                    </SidebarGroupLabel>
                    <CollapsibleContent>
                      <div className="border-sidebar-border mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l pl-4 px-2.5 py-0.5">
                        <div className="space-y-3">{section.content}</div>
                      </div>
                    </CollapsibleContent>
                  </SidebarGroup>
                </Collapsible>
              ))}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        <Separator />

        {/* Game Mode */}
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <Gamepad2 className="h-4 w-4" />
            Game Mode
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="p-2 space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="hardcore"
                  className="text-sm font-normal cursor-pointer">
                  Hardcore
                </Label>
                <Switch
                  id="hardcore"
                  checked={filters.isHardcore ?? settings.mode === 'hardcore'}
                  onCheckedChange={(checked) => updateFilter('isHardcore', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="ladder"
                  className="text-sm font-normal cursor-pointer">
                  Ladder
                </Label>
                <Switch
                  id="ladder"
                  checked={filters.isLadder ?? settings.ladder === 'ladder'}
                  onCheckedChange={(checked) => updateFilter('isLadder', checked)}
                />
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        <Separator />

        {/* Archive Search */}
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <Archive className="h-4 w-4" />
            Misc
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="flex items-center justify-between p-2">
              <div className="space-y-0.5">
                <Label htmlFor="archive"
                  className="text-sm font-normal cursor-pointer">
                  Search Archive
                </Label>
                <p className="text-xs text-muted-foreground">Search listings up to 14 days old</p>
              </div>
              <Switch
                id="archive"
                checked={filters.searchArchived}
                onCheckedChange={(checked) => updateFilter('searchArchived', checked)}
              />
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </div>
    </ScrollArea>
  );
};
