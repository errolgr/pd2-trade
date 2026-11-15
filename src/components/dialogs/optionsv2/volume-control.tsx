import { Play, Volume1, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormControl } from '@/components/ui/form';
import { Slider } from '@/components/ui/slider';
import { Tip } from '@/components/ui/tooltip';
import { playNotificationSound } from '@/hooks/useSocketNotifications';
import { useTranslation } from '@/i18n';

interface VolumeControlProps {
  /** 0–100. */
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  ariaLabel?: string;
}

/**
 * A settings row's volume control: speaker icon, 0–100 slider, and Test, which plays the notification sound at the
 * slider's volume (saved or not) so the level can be judged without waiting for a real notification.
 */
export function VolumeControl({ value, onChange, disabled, ariaLabel }: VolumeControlProps) {
  const { t } = useTranslation('common');
  const VolumeIcon = value === 0 ? VolumeX : value < 50 ? Volume1 : Volume2;
  return (
    <div className="flex w-[320px] items-center gap-3">
      <VolumeIcon aria-hidden
        className="size-4 shrink-0 text-muted-foreground" />
      <FormControl>
        <Slider
          aria-label={ariaLabel}
          min={0}
          max={100}
          step={1}
          value={[value]}
          onValueChange={(next) => onChange(next[0])}
          disabled={disabled}
          className="flex-1"
        />
      </FormControl>
      <Tip label={disabled ? undefined : t('actions.testSoundTitle')}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => playNotificationSound(value)}
        >
          <Play className="size-3.5" />
          {t('actions.test')}
        </Button>
      </Tip>
    </div>
  );
}
