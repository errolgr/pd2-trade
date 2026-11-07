import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Form } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { SimCharacterPicker } from '@/components/custom/SimCharacterPicker';
import { useOptions } from '@/hooks/useOptions';
import { useSimLadderCharacters } from '@/hooks/useSimLadderCharacters';
import { preferredSimCharacter } from '@/lib/sim-characters';
import { legacySimCharacter, rememberLegacySimCharacter, SIM_GOALS, type SimGoal } from '@/lib/sim-preferences';
import { SettingsGroup, SettingsRow } from '../settings-ui';

export function SimulatorSettings() {
  const { settings, updateSettings } = useOptions();
  // SettingsRow's label and description read a form context; these rows save straight to settings
  const form = useForm();
  const token = settings.pd2Token ?? '';
  const characters = useSimLadderCharacters(token, settings.account ?? '');
  const legacy = legacySimCharacter();
  const list = characters.status === 'ok' ? characters.data : [];
  const character = preferredSimCharacter(list, settings.simCharacter || legacy);
  const goal = settings.simGoal ?? 'quick_sim';

  useEffect(() => {
    if (!settings.simCharacter && legacy) updateSettings({ simCharacter: legacy });
  }, [legacy, settings.simCharacter, updateSettings]);

  const chooseCharacter = (name: string) => {
    rememberLegacySimCharacter(name);
    updateSettings({ simCharacter: name });
  };

  return (
    <Form {...form}>
      <SettingsGroup title="Horadric Sim">
        <SettingsRow
          settingKey="simCharacter"
          label="Default character"
          description="Used by Sim actions in price check, market and Net Worth. Ladder characters only."
          control={
            characters.status === 'loading' ? (
              <Skeleton className="h-9 w-[260px]" />
            ) : characters.status === 'ok' && character ? (
              <SimCharacterPicker
                characters={list}
                value={character}
                onChange={chooseCharacter}
                className="w-[260px]"
              />
            ) : (
              <span className="text-xs text-muted-foreground">
                {token ? 'No ladder characters found' : 'Sign in first'}
              </span>
            )
          }
        />
        <SettingsRow
          settingKey="simGoal"
          label="Default goal"
          description="Preselected when an item or stash is sent to Horadric Sim."
          control={
            <Select value={goal}
              onValueChange={(value) => updateSettings({ simGoal: value as SimGoal })}>
              <SelectTrigger className="w-[260px]"
                aria-label="Default simulator goal">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SIM_GOALS.map((option) => (
                  <SelectItem key={option.value}
                    value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />
      </SettingsGroup>
    </Form>
  );
}
