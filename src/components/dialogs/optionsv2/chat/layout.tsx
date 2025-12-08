import { Separator } from '@/components/ui/separator';
import React from 'react';
import { ChatForm } from './chat-form';

export default function SettingsChat() {
  return (
    <div className="flex flex-col gap-y-6">
      <div>
        <h3 className="text-lg font-medium">Chat</h3>
        <p className="text-sm text-muted-foreground">
          Configure chat and whisper notification settings.
        </p>
      </div>
      <Separator />
      <ChatForm />
    </div>
  );
}

