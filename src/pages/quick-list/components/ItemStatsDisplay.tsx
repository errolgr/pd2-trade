import React from 'react';
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';
import { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';

interface ItemStatsDisplayProps {
  stashItem: GameStashItem;
  isExpanded: boolean;
  onToggleExpanded: (itemHash: string) => void;
}

const ItemStatsDisplay: React.FC<ItemStatsDisplayProps> = ({
  stashItem,
  isExpanded,
  onToggleExpanded
}) => {
  const hasModifiers = stashItem.modifiers && stashItem.modifiers.length > 0;
  
    const filteredModifiers = stashItem.modifiers.filter((mod) => {
        return mod.name !== 'corrupted'
    });

    // Separate corrupted and non-corrupted modifiers
    const corruptedModifiers = filteredModifiers.filter((mod) => stashItem.corruptions.includes(mod.name));
    const nonCorruptedModifiers = filteredModifiers.filter((mod) => !stashItem.corruptions.includes(mod.name));

    // Combine with corrupted modifiers at the top
    const sortedModifiers = [...corruptedModifiers, ...nonCorruptedModifiers];

  return (
    <div className="text-xs space-y-1">
      <div className='flex flex-row gap-1'>
        {stashItem.is_ethereal && (
          <Badge className='text-xs rounded-lg'>Ethereal</Badge>
        )}
        {stashItem.corrupted && (
          <Badge variant={'destructive'} className='text-xs rounded-lg'>Corrupted</Badge>
        )}
        {stashItem.is_runeword && (
          <Badge variant='secondary' className='text-xs rounded-lg'>Runeword</Badge>
        )}
        {stashItem.socket_count > 0 && (
          <Badge variant='secondary' className='text-xs rounded-lg'>
            <Badge className='rounded-4xl text-xs h-4 w-4'>
              {stashItem.socket_count}
            </Badge>
            Socket{stashItem.socket_count > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {hasModifiers && (
        <div className="mt-2">
          {isExpanded ? (
            // Show all modifiers when expanded
            sortedModifiers.map((mod, idx) => (
              <div key={idx} className={cn("text-gray-200 truncate", {'text-red-500': stashItem?.corruptions && stashItem.corruptions.includes(mod.name)})}>
                {mod.label}
                {mod?.min && mod?.max && `: [${mod.min} - ${mod.max}]`}
              </div>
            ))
          ) : (
            // Show first 3 modifiers when collapsed
            <>
              {sortedModifiers.slice(0, 3).map((mod, idx) => (
                <div key={idx} className={cn("text-gray-200 truncate", {'text-red-500': stashItem?.corruptions && stashItem.corruptions.includes(mod.name)})}>
                  {mod.label}
                  {mod?.min && mod?.max && `: [${mod.min} - ${mod.max}]`}
                </div>
              ))}
              {sortedModifiers.length > 3 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleExpanded(stashItem.hash);
                  }}
                  className="text-blue-500 hover:text-blue-700 text-xs underline"
                >
                  Show More
                </button>
              )}
            </>
          )}
          {isExpanded && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpanded(stashItem.hash);
              }}
              className="text-gray-500 hover:text-gray-700 text-xs underline"
            >
              Show Less
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ItemStatsDisplay; 