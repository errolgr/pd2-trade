import React from "react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Stat } from "@/pages/price-check/utils/interfaces";
import { Input } from "@/components/ui/input";
import {statIdToProperty, StatId} from "@/pages/price-check/utils/stat-mappings";
import {HoverPopover} from "@/components/custom/hover-popover";
import {Badge} from "@/components/ui/badge";
import {skillNameToIdMap} from "@/assets/character-skills";
import {classSkillNameToIdMap, classSubSkillNameToIdMap} from "@/assets/class-skills";

interface StatRowProps {
  stat: Stat;
  nested?: boolean;
  updateFilter: (key: string, field: "value" | "min" | "max", val: string) => void;
  filters: Record<string, { value?: string; min?: string; max?: string }>;
  selected: Set<string>;
  toggle: (stat: Stat) => void;
}

const numberInputClass =
  "w-20 bg-neutral-800 border border-neutral-700 rounded text-sm px-1 focus:outline-none focus:ring-1 focus:ring-blue-400";

export const StatRow: React.FC<StatRowProps> = ({
                                                  stat,
                                                  nested,
                                                  updateFilter,
                                                  filters,
                                                  selected,
                                                  toggle,
                                                }) => {
  const statKey =
    "skill" in stat && stat.skill
      ? `skill:${stat.skill.toLowerCase()}`
      : `id:${stat.stat_id}`;
  const isSocket = stat.stat_id === StatId.Socket;
  const isCorrupted = stat.stat_id === StatId.Corrupted;
  const isEthereal = stat.stat_id === StatId.Ethereal;
  const isSkill = "skill" in stat;
  const isUnknownSkill = isSkill && (
    !skillNameToIdMap[stat.skill.toLowerCase()] &&
    !classSkillNameToIdMap[stat.skill.toLowerCase()] &&
    !classSubSkillNameToIdMap[stat.skill.toLowerCase()]);
  const isUnknown = (statIdToProperty[stat.stat_id] === undefined && !isSkill) || isUnknownSkill;

  return (
    <div className="border-b border-neutral-800 pb-2">
    <label
      key={statKey}
      className={cn(`flex flex-row gap-1 ${nested ? "pl-6" : ""} justify-between`)}
    >
      <div className="flex items-center gap-2 cursor-pointer select-none">
        <Checkbox
          checked={selected.has(statKey)}
          onCheckedChange={() => toggle(stat)}
          disabled={isUnknown}
        />

        <div className={"flex flex-row items-center"}>
          {isUnknown &&
              <div className={"flex flex-row gap-2 items-center"}>
                   <span
                     className={cn("flex-1 text-sm text-gray-500")}>
                     {stat.name}
                     {stat.value !== undefined && `: ${stat.value}`}
                     {!isSocket && stat.range && stat.value !== undefined && ` (${stat.range.min}-${stat.range.max})`}
                   </span>
                  <Badge variant={'destructive'}>
                    Unknown
                  </Badge>
              </div>
         }

          {!isUnknown &&
              <span
                className={cn(
                  "flex-1 text-sm text-gray-100",
                  { "text-gray-500 line-through": isUnknown },
                  { "text-red-500": isCorrupted },
                  { "text-gray-100": !isCorrupted && !isUnknown },
                )}
              >
                {stat.name}
                {stat.value !== undefined && `: ${stat.value}`}
                {!isSocket && stat.range && stat.value !== undefined && ` (${stat.range.min}-${stat.range.max})`}
        </span>}

          {stat.corrupted && <span className={'text-red-500'}>*</span>}
        </div>

      </div>

      {!isCorrupted && !isEthereal && selected.has(statKey) && (
        <div className="flex items-center gap-2 pl-8">
          <>
            <input
              type="number"
              className={numberInputClass}
              placeholder="min"
              value={filters[statKey]?.min ?? ""}
              onChange={(e) => updateFilter(statKey, "min", e.target.value)}
            />
            <span>-</span>
            <input
              type="number"
              className={numberInputClass}
              placeholder="max"
              value={filters[statKey]?.max ?? ""}
              onChange={(e) => updateFilter(statKey, "max", e.target.value)}
            />
          </>
        </div>
      )}
    </label>
    </div>
  );
};
