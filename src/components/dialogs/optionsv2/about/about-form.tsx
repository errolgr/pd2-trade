import React, {useEffect, useState} from 'react';
import { useOptions } from '@/hooks/useOptions';
import imgPath from '../../../../assets/img.png'
import { getVersion } from '@tauri-apps/api/app';
import { useUpdater } from '@/hooks/useUpdater';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { isTauri } from '@tauri-apps/api/core';
import { Loader2, RefreshCw } from 'lucide-react';

export function AboutForm() {
  const { settings, isLoading, updateSettings } = useOptions();
  const [version, setVersion] = React.useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const { checkForUpdates, downloadUpdate } = useUpdater();

  // Show a loading indicator until settings have loaded.
  if (isLoading || !settings) {
    return null;
  }

  useEffect(() => {
    getVersion().then(setVersion)
  }, []);

  const handleCheckForUpdates = async () => {
    if (!isTauri()) return;
    
    setIsChecking(true);
    try {
      const update = await checkForUpdates();
      setUpdateInfo(update);
      setLastChecked(new Date());
    } catch (error) {
      console.error('Failed to check for updates:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleUpdateNow = async () => {
    if (updateInfo?.available) {
      await downloadUpdate(updateInfo);
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return `${diffInSeconds} seconds ago`;
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
  };

  return (
    <div className={'flex flex-col gap-4 flex flex-col items-center'}>
      <div className={'flex flex-col gap-1 items-center'}>
        <img src={imgPath}
          style={{width: 50}}/>
        <span style={{fontFamily: 'DiabloFont', fontSize: '24px', fontWeight: 'bold'}}>PD2 Trader</span>
        <span className={'text-md'}>Version: {version}</span>
      </div>

      {isTauri() && (
        <Card className="p-4 border-2 border-dashed w-60">
          <div className="flex flex-col gap-3">
            {updateInfo?.available ? (
              <div className="flex flex-col gap-2">
                <div className="text-center font-medium text-green-600">
                  Update Available (v{updateInfo.version})
                </div>
                <Button 
                  onClick={handleUpdateNow}
                  className="w-full"
                  variant="default"
                >
                  Update Now (v{updateInfo.version})
                </Button>
              </div>
            ) : (
              <div className="text-center font-medium">
                You have the latest version
              </div>
            )}
            
            {lastChecked && (
              <div className="text-center text-sm">
                Last checked: {formatTimeAgo(lastChecked)}
              </div>
            )}
            
            <Button 
              onClick={handleCheckForUpdates}
              disabled={isChecking}
              variant="outline"
              size="sm"
              className="w-full"
            >
              {isChecking ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Check for Updates
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

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
