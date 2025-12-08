import { openOverDiabloWindow, attachWindowCloseHandler } from './window';

let chatWindowRef: any = null;

export async function openChatOverlay() {
  if (!chatWindowRef) {
    chatWindowRef = await openOverDiabloWindow('Chat', '/chat', {
      decorations: false,
      transparent: true,
      skipTaskbar: true,
      alwaysOnTop: true,
      shadow: false,
      focus: true,
      focusable: true,
      width: 1000,
      height: 700,
    });
    
    if (chatWindowRef) {
      attachWindowCloseHandler(chatWindowRef, () => {
        chatWindowRef = null;
      });
    }
  } else {
    await chatWindowRef.show();
    await chatWindowRef.setFocus();
  }
  
  return chatWindowRef;
}

