import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Puzzle } from 'lucide-react';
import { PANEL_KIT_CSS, type PanelToHost, type HostToPanel } from '@pd2-trader/plugin-sdk';
import { PanelChrome, PanelSurface, EmptyState } from '@pd2-trader/ui';
import { claimKeyboard, usePanel, type PluginPanelId } from '@/overlay';
import { useTranslation } from '@/i18n';
import { pluginHost } from '../host/manager';
import { panelSrcdoc, parsePanelHtml } from '../host/sandbox';
import { currentThemeInfo, watchTheme } from '../host/theme';
import { usePluginHost } from './hooks';

/**
 * A plugin-owned panel (B7): host chrome (title, drag, close) around a sandboxed srcdoc iframe running the
 * plugin's panel HTML with the theme kit. Unmounted while closed (PRD R2: no idle iframes).
 */
export function PluginPanelPage({ pluginId, panel }: { pluginId: string; panel: string }) {
  const { t } = useTranslation('plugins');
  const { close, payload, payloadVersion } = usePanel<PluginPanelId>();
  const host = usePluginHost();
  const view = host.plugins.find((p) => p.installed.id === pluginId);
  const running = !!view && view.installed.enabled;
  // Re-boot the frame when the plugin is (hot-)reloaded with new panel HTML.
  const html = running ? pluginHost.panelHtml(pluginId, panel) : null;
  const frameRef = useRef<HTMLIFrameElement>(null);
  const portRef = useRef<MessagePort | null>(null);
  const payloadRef = useRef(payload);
  useLayoutEffect(() => {
    payloadRef.current = payload;
  });
  const doc = useMemo(() => (html === null ? null : parsePanelHtml(html)), [html]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || !doc) return;
    const channel = new MessageChannel();
    const port = channel.port1;
    const send = (message: HostToPanel) => port.postMessage(message);
    const connection = pluginHost.connectPanel(pluginId, panel, (data) => send({ t: 'message', data }));
    if (!connection) return;
    let booted = false;
    const onWindowMessage = (event: MessageEvent) => {
      if (event.source !== frame.contentWindow || booted) return;
      if ((event.data as { t?: string } | null)?.t !== 'pd2:loaded') return;
      booted = true;
      frame.contentWindow?.postMessage(
        { t: 'pd2:boot-panel', css: PANEL_KIT_CSS, body: doc.body, scripts: doc.scripts },
        '*',
        [channel.port2],
      );
      send({ t: 'theme', theme: currentThemeInfo() });
      send({ t: 'payload', data: payloadRef.current });
    };
    port.onmessage = (event: MessageEvent) => {
      const message = event.data as PanelToHost;
      switch (message?.t) {
        case 'call':
          connection.call(message.method, message.params).then(
            (value) => send({ t: 'result', id: message.id, ok: true, value }),
            (error: unknown) =>
              send({
                t: 'result',
                id: message.id,
                ok: false,
                error: error instanceof Error ? error.message : String(error),
              }),
          );
          break;
        case 'toWorker':
          connection.toWorker(message.data);
          break;
        case 'keyboard':
          void claimKeyboard();
          break;
        case 'close':
          close();
          break;
      }
    };
    window.addEventListener('message', onWindowMessage);
    const stopTheme = watchTheme((theme) => send({ t: 'theme', theme }));
    portRef.current = port;
    frame.setAttribute('srcdoc', panelSrcdoc()); // see createSandboxFrame
    return () => {
      window.removeEventListener('message', onWindowMessage);
      stopTheme();
      connection.disconnect();
      port.close();
      portRef.current = null;
      frame.removeAttribute('srcdoc');
    };
  }, [pluginId, panel, doc, close]);

  useEffect(() => {
    if (payloadVersion > 0) portRef.current?.postMessage({ t: 'payload', data: payload } satisfies HostToPanel);
  }, [payload, payloadVersion]);

  const title = view?.manifest?.name ?? view?.installed.name ?? pluginId;
  return (
    <PanelSurface className="flex h-full w-full flex-col">
      <PanelChrome title={title}
        icon={<Puzzle />}
        onClose={close} />
      {doc ? (
        <iframe
          ref={frameRef}
          title={t('panel.frameTitle', { name: title })}
          sandbox="allow-scripts"
          referrerPolicy="no-referrer"
          className="min-h-0 w-full flex-1 border-0 bg-transparent"
        />
      ) : (
        <div className="flex flex-1 items-center justify-center p-4">
          <EmptyState
            icon={<Puzzle />}
            title={t('panel.unavailable')}
            description={t('panel.unavailableHint')}
            compact
          />
        </div>
      )}
    </PanelSurface>
  );
}
