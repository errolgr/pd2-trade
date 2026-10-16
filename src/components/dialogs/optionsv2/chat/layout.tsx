import React from 'react';
import { SettingsSection } from '../settings-ui';
import { ChatForm } from './chat-form';

export default function SettingsChat() {
  return (
    <SettingsSection title="Chat"
      description="Configure chat and whisper notification settings.">
      <ChatForm />
    </SettingsSection>
  );
}
