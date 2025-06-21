import {useOptions} from "@/hooks/useOptions";
import {useNavigate} from "react-router-dom";
import {Button} from "@/components/ui/button";
import {getCurrentWebviewWindow} from "@tauri-apps/api/webviewWindow";
import {X} from "lucide-react";
import React, {useEffect, useState} from "react";
import {getVersion} from "@tauri-apps/api/app";
import {changeLog} from "@/assets/changeLog";
import {Card} from "@/components/ui/card";


export default function ChangelogPage() {
  const {settings, updateSettings} = useOptions();
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);

  useEffect(() => {
    getVersion().then((version) => {
      setCurrentVersion(version);
      if (version && settings.lastSeenVersion !== version) {
        updateSettings({lastSeenVersion: version});
      }
    });
  }, []);

  const entries = currentVersion ? changeLog[currentVersion] : [];

  if (!currentVersion || !entries) return null;

  return (
    <Card className={'w-screen h-screen'}>
      <div className="py-10 px-4">
      <div className={'flex flex-row justify-between items-center mb-4'}>
        <h1 className="text-xl font-bold">What&#39;s New (v{currentVersion})</h1>
        <Button variant="ghost"
          size="icon"
          onClick={() => getCurrentWebviewWindow().close()}
          className="self-start cursor-pointer">
          <X className="h-4 w-4 "/>
        </Button>
      </div>

      <ul className="list-disc space-y-2 pl-6">
        {entries.map((entry, idx) => (
          <li key={idx}>{entry}</li>
        ))}
      </ul>
    </div>
    </Card>
  )
}