import React, {useEffect} from 'react';
import { useOptions } from '@/hooks/useOptions';
import imgPath from '../../../../assets/img.png'
import { getVersion } from '@tauri-apps/api/app';

export function AboutForm() {
  const { settings, isLoading, updateSettings } = useOptions();
  const [version, setVersion] = React.useState<string | null>(null);
  // Show a loading indicator until settings have loaded.
  if (isLoading || !settings) {
    return null;
  }

  useEffect(() => {
    getVersion().then(setVersion)
  }, []);

  return (
    <div className={'flex flex-col gap-4'}>
      <div className={'flex flex-col gap-1 items-center'}>
        <img src={imgPath}
          style={{width: 50}}/>
        <span style={{fontFamily: 'DiabloFont', fontSize: '24px', fontWeight: 'bold'}}>PD2 Trader</span>
        <span className={'text-md'}>Version: {version}</span>
      </div>

      <div className={'flex flex-col items-center gap-1'}>
        <div className={'text-md'}>
          Contact me on the Offical PD2 Discord
        </div>
        <div className={'text-sm text-gray-400'}>
          @Doreet
        </div>
      </div>

    </div>
  );
}
