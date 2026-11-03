import { afterEach, describe, expect, it, vi } from 'vitest';
import { PERMISSIONS, ui } from '@pd2-trader/plugin-sdk';
import { PluginBroker, PluginKv } from './broker';
import { PluginManager, missingGrants } from './manager';
import { FAILURE_LIMIT, WATCHDOG_INTERVAL_MS, WATCHDOG_TIMEOUT_MS } from './budget';
import { fakeLauncher, fakeServices, makeBundle, memoryPersistence, programs } from './test-harness';
import type { HostServices, PluginBundle } from './types';

const input = {
  item: { name: 'Shako', base: 'Shako', quality: 'unique', isRuneword: false, ethereal: false, corrupted: false, sockets: 0, itemLevel: 80, stats: [] },
  mode: { ladder: true, hardcore: false },
  price: null,
};

let manager: PluginManager;

async function startWith(
  bundle: PluginBundle,
  opts: { services?: HostServices; now?: () => number; grant?: { permissions?: string[]; network?: string[] } } = {},
) {
  manager = new PluginManager();
  const persistence = memoryPersistence();
  const launcher = fakeLauncher();
  const onAutoDisabled = vi.fn();
  const services = opts.services ?? fakeServices();
  await manager.start({ services, persistence, launchSandbox: launcher, now: opts.now, onAutoDisabled });
  const installing = manager.install(bundle, { kind: 'marketplace', sha256: 'x', signature: 'y' });
  await vi.waitFor(() => expect(manager.getSnapshot().consent).not.toBeNull());
  manager.answerConsent(manager.getSnapshot().consent!.id, true);
  await installing;
  if (opts.grant) {
    // Simulate a narrower stored grant (e.g. consented before the manifest grew).
    const id = bundle.manifest.id;
    persistence.settings.installed[id].granted = {
      permissions: (opts.grant.permissions ?? []) as never,
      network: opts.grant.network ?? [],
    };
    manager.shutdown();
    await manager.start({ services, persistence, launchSandbox: launcher, now: opts.now, onAutoDisabled });
  }
  await vi.waitFor(() => expect(manager.getSnapshot().plugins[0]?.status).toBe('running'));
  return { persistence, launcher, onAutoDisabled, services };
}

afterEach(() => {
  manager?.shutdown();
  programs.clear();
  vi.useRealTimers();
});

/** Runs `body` inside the plugin and returns what it resolved/rejected with. */
function probe(name: string, body: (sdk: Parameters<Parameters<typeof programs.set>[1]>[0]) => Promise<unknown>) {
  const result: { value?: unknown; error?: string; done: boolean } = { done: false };
  programs.set(name, (sdk) => {
    sdk.commands.register('run', async () => {
      try {
        result.value = await body(sdk);
      } catch (error) {
        result.error = (error as Error).message;
      }
      result.done = true;
    });
  });
  return result;
}

describe('broker permissions', () => {
  it('rejects capabilities the manifest does not declare', async () => {
    const result = probe('p1', (sdk) => sdk.storage.set('k', 1));
    await startWith(makeBundle({ id: 'com.test.p1', commands: [{ id: 'run', title: 'Run' }] }, 'p1'));
    await manager.runCommand('com.test.p1', 'run');
    expect(result.error).toMatch(/storage:local/);
  });

  it('rejects a declared permission the user did not grant', async () => {
    const result = probe('p2', (sdk) => sdk.stash.summary());
    await startWith(
      makeBundle({ id: 'com.test.p2', permissions: ['stash:read'], commands: [{ id: 'run', title: 'Run' }] }, 'p2'),
      { grant: { permissions: [] } },
    );
    await manager.runCommand('com.test.p2', 'run');
    expect(result.error).toMatch(/stash:read/);
  });

  it('serves a granted capability', async () => {
    const result = probe('p3', async (sdk) => {
      await sdk.storage.set('k', { a: 1 });
      return sdk.storage.get('k');
    });
    await startWith(makeBundle({ id: 'com.test.p3', permissions: ['storage:local'], commands: [{ id: 'run', title: 'Run' }] }, 'p3'));
    await manager.runCommand('com.test.p3', 'run');
    expect(result).toMatchObject({ value: { a: 1 }, done: true });
  });

  it.each(['tauri.invoke', 'auth.token', 'input.pressKey', 'fs.readFile', 'clipboard.write'])(
    'has no broker method for the never-grantable %s',
    async (method) => {
      const broker = new PluginBroker({
        manifest: makeBundle({ id: 'com.test.p4', permissions: [...PERMISSIONS] }).manifest,
        granted: { permissions: [...PERMISSIONS], network: [] },
        services: fakeServices(),
        kv: new PluginKv('com.test.p4', memoryPersistence()),
        settings: () => ({}),
        openPanel: () => {},
        postToPanel: () => {},
      });
      await expect(broker.handle(method, {})).rejects.toThrow(/Unknown method/);
    },
  );

  it('enforces the storage quota', async () => {
    const result = probe('p5', (sdk) => sdk.storage.set('big', 'x'.repeat(6 * 1024 * 1024)));
    await startWith(makeBundle({ id: 'com.test.p5', permissions: ['storage:local'], commands: [{ id: 'run', title: 'Run' }] }, 'p5'));
    await manager.runCommand('com.test.p5', 'run');
    expect(result.error).toMatch(/quota/i);
  });

  it('rate-limits notifications', async () => {
    const result = probe('p6', async (sdk) => {
      for (let i = 0; i < 4; i++) await sdk.notify({ title: `n${i}` });
    });
    const services = fakeServices();
    await startWith(
      makeBundle({ id: 'com.test.p6', permissions: ['notifications'], commands: [{ id: 'run', title: 'Run' }] }, 'p6'),
      { services },
    );
    await manager.runCommand('com.test.p6', 'run');
    expect(services.toasts).toEqual(['n0', 'n1', 'n2']);
    expect(result.error).toMatch(/rate limited/i);
  });
});

describe('proxied fetch', () => {
  const fetchProgram = (url: string) => probe(`fetch:${url}`, (sdk) => sdk.fetch(url).then((r) => r.status));

  it('rejects hosts not declared in manifest.network', async () => {
    const httpFetch = vi.fn(async () => new Response('ok'));
    const result = fetchProgram('https://evil.example.org/steal');
    await startWith(
      makeBundle(
        { id: 'com.test.f1', network: ['api.example.com'], commands: [{ id: 'run', title: 'Run' }] },
        'fetch:https://evil.example.org/steal',
      ),
      { services: fakeServices({ httpFetch }) },
    );
    await manager.runCommand('com.test.f1', 'run');
    expect(result.error).toMatch(/not declared/);
    expect(httpFetch).not.toHaveBeenCalled();
  });

  it('rejects http:// and declared hosts the user did not consent to', async () => {
    const httpFetch = vi.fn(async () => new Response('ok'));
    const plain = fetchProgram('http://api.example.com/x');
    await startWith(
      makeBundle({ id: 'com.test.f2', network: ['api.example.com'], commands: [{ id: 'run', title: 'Run' }] }, 'fetch:http://api.example.com/x'),
      { services: fakeServices({ httpFetch }) },
    );
    await manager.runCommand('com.test.f2', 'run');
    expect(plain.error).toMatch(/https/);

    manager.shutdown();
    const unconsented = fetchProgram('https://api.example.com/x');
    await startWith(
      makeBundle({ id: 'com.test.f3', network: ['api.example.com'], commands: [{ id: 'run', title: 'Run' }] }, 'fetch:https://api.example.com/x'),
      { services: fakeServices({ httpFetch }), grant: { network: [] } },
    );
    await manager.runCommand('com.test.f3', 'run');
    expect(unconsented.error).toMatch(/manifest.network/);
    expect(httpFetch).not.toHaveBeenCalled();
  });

  it('fetches a consented host without credentials and refuses redirects', async () => {
    const httpFetch = vi.fn(async (url: string, init: RequestInit) =>
      url.endsWith('/moved') ? new Response(null, { status: 302, headers: { location: 'https://evil.example.org' } }) : new Response(`${init.credentials}`),
    );
    const ok = fetchProgram('https://api.example.com/data');
    await startWith(
      makeBundle({ id: 'com.test.f4', network: ['api.example.com'], commands: [{ id: 'run', title: 'Run' }] }, 'fetch:https://api.example.com/data'),
      { services: fakeServices({ httpFetch }) },
    );
    await manager.runCommand('com.test.f4', 'run');
    expect(ok.value).toBe(200);
    expect(httpFetch.mock.calls[0][1]).toMatchObject({ credentials: 'omit', redirect: 'manual' });

    manager.shutdown();
    const moved = fetchProgram('https://api.example.com/moved');
    await startWith(
      makeBundle({ id: 'com.test.f5', network: ['api.example.com'], commands: [{ id: 'run', title: 'Run' }] }, 'fetch:https://api.example.com/moved'),
      { services: fakeServices({ httpFetch }) },
    );
    await manager.runCommand('com.test.f5', 'run');
    expect(moved.error).toMatch(/Redirects/);
  });
});

describe('slots and budgets', () => {
  it('renders a valid tree and rejects an invalid one', async () => {
    let tree: unknown = ui.section('Craft value', [ui.row('Runes', '2 HR', 'success')]);
    programs.set('slot', (sdk) => sdk.slots.register('priceCheck.section', () => tree as never));
    await startWith(makeBundle({ id: 'com.test.s1', permissions: ['items:read'], slots: ['priceCheck.section'] }, 'slot'));
    await expect(manager.callSlot('priceCheck.section', input)[0].result).resolves.toMatchObject({ title: 'Craft value' });

    tree = { type: 'section', title: 'x', children: [{ type: 'html', html: '<img src=x onerror=alert(1)>' }] };
    await expect(manager.callSlot('priceCheck.section', input)[0].result).rejects.toThrow(/Invalid/);

    let deep: unknown = { type: 'text', text: 'leaf' };
    for (let i = 0; i < 10; i++) deep = { type: 'list', items: [deep] };
    tree = { type: 'section', title: 'deep', children: [deep] };
    await expect(manager.callSlot('priceCheck.section', input)[0].result).rejects.toThrow(/deeper/);
    expect(manager.getSnapshot().plugins[0].failures).toBe(2);
  });

  it('does not call a slot whose permission is not granted', async () => {
    const handler = vi.fn(() => null);
    programs.set('nogrant', (sdk) => sdk.slots.register('priceCheck.section', handler));
    await startWith(makeBundle({ id: 'com.test.s2', permissions: ['items:read'], slots: ['priceCheck.section'] }, 'nogrant'), {
      grant: { permissions: [] },
    });
    expect(manager.callSlot('priceCheck.section', input)).toHaveLength(0);
    expect(handler).not.toHaveBeenCalled();
  });

  it(`auto-disables after ${FAILURE_LIMIT} timeouts within the window`, async () => {
    programs.set('slow', (sdk) => sdk.slots.register('priceCheck.section', () => new Promise(() => {})));
    const { onAutoDisabled, launcher } = await startWith(
      makeBundle({ id: 'com.test.slow', permissions: ['items:read'], slots: ['priceCheck.section'] }, 'slow'),
    );
    const calls = Array.from({ length: FAILURE_LIMIT }, () => manager.callSlot('priceCheck.section', input)[0].result);
    for (const call of calls) await expect(call).rejects.toThrow(/Timed out after 300 ms/);
    const view = manager.getSnapshot().plugins[0];
    expect(view.status).toBe('disabled');
    expect(view.installed.disabledReason).toBe('failures');
    expect(onAutoDisabled).toHaveBeenCalledWith(expect.objectContaining({ id: 'com.test.slow' }), 'failures');
    expect(launcher.destroyed).toBe(1);
    expect(manager.callSlot('priceCheck.section', input)).toHaveLength(0);
  });

  it('keeps a plugin whose failures are spread beyond the window', async () => {
    let now = 0;
    programs.set('flaky', (sdk) =>
      sdk.slots.register('priceCheck.section', () => {
        throw new Error('boom');
      }),
    );
    await startWith(makeBundle({ id: 'com.test.flaky', permissions: ['items:read'], slots: ['priceCheck.section'] }, 'flaky'), {
      now: () => now,
    });
    for (let i = 0; i < FAILURE_LIMIT + 2; i++) {
      now += 3 * 60 * 1000;
      await expect(manager.callSlot('priceCheck.section', input)[0].result).rejects.toThrow('boom');
    }
    expect(manager.getSnapshot().plugins[0].status).toBe('running');
  });

  it('terminates a worker that stops answering the watchdog', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
    programs.set('hang', (sdk) => sdk.slots.register('priceCheck.section', () => null));
    const { launcher } = await startWith(
      makeBundle({ id: 'com.test.hang', permissions: ['items:read'], slots: ['priceCheck.section'] }, 'hang'),
    );
    // Simulate a runaway loop: the worker side no longer processes messages.
    // @ts-expect-error reaching into the runtime for the test
    manager.runtimes.get('com.test.hang').instance.opts.port.postMessage = () => {};
    await vi.advanceTimersByTimeAsync(WATCHDOG_INTERVAL_MS + WATCHDOG_TIMEOUT_MS + 10);
    expect(launcher.destroyed).toBe(1);
    expect(manager.getSnapshot().plugins[0].status).toBe('error');
    expect(manager.getSnapshot().plugins[0].error).toMatch(/Unresponsive/);
  });
});

describe('events', () => {
  it('delivers permission-gated events only to plugins holding the permission', async () => {
    const seen: string[] = [];
    programs.set('listen', (sdk) => {
      sdk.events.on('chat.message', (m) => void seen.push(`chat:${m.text}`));
      sdk.events.on('game.focus', (e) => void seen.push(`focus:${e.focused}`));
    });
    await startWith(makeBundle({ id: 'com.test.ev', permissions: ['chat:read'] }, 'listen'), { grant: { permissions: [] } });
    manager.emit('chat.message', { id: '1', channel: 'trade', direction: 'in', sender: 'a', text: 'wts shako', at: '' });
    manager.emit('game.focus', { focused: true });
    await vi.waitFor(() => expect(seen).toEqual(['focus:true']));
  });
});

describe('consent and kill switch', () => {
  it('installs nothing when the user cancels consent', async () => {
    manager = new PluginManager();
    await manager.start({ services: fakeServices(), persistence: memoryPersistence(), launchSandbox: fakeLauncher() });
    const installing = manager.install(makeBundle({ id: 'com.test.c1', permissions: ['chat:read'] }), { kind: 'dev', location: 'x', transport: 'url' });
    await vi.waitFor(() => expect(manager.getSnapshot().consent?.manifest.id).toBe('com.test.c1'));
    manager.answerConsent(manager.getSnapshot().consent!.id, false);
    await expect(installing).resolves.toBe(false);
    expect(manager.getSnapshot().plugins).toHaveLength(0);
  });

  it('holds an update that adds permissions or hosts until re-consent', async () => {
    programs.set('v', () => {});
    await startWith(makeBundle({ id: 'com.test.up', permissions: ['prices:read'] }, 'v'));
    const source = { kind: 'marketplace' as const, sha256: 's', signature: 'g' };
    const same = makeBundle({ id: 'com.test.up', version: '1.1.0', permissions: ['prices:read'] }, 'v');
    await expect(manager.applyUpdate(same, source)).resolves.toBe('updated');
    const grown = makeBundle({ id: 'com.test.up', version: '1.2.0', permissions: ['prices:read', 'chat:read'], network: ['api.x.com'] }, 'v');
    await expect(manager.applyUpdate(grown, source)).resolves.toBe('held');
    const installed = manager.getSnapshot().plugins[0].installed;
    expect(installed.version).toBe('1.1.0');
    expect(installed.pendingUpdate?.version).toBe('1.2.0');
    expect(missingGrants(grown.manifest, installed.granted)).toEqual({ permissions: ['chat:read'], network: ['api.x.com'] });
  });

  it('disables a blocklisted version immediately and restores it when unlisted', async () => {
    programs.set('b', () => {});
    const { launcher, onAutoDisabled } = await startWith(makeBundle({ id: 'com.test.bl' }, 'b'));
    manager.applyBlocklist([{ id: 'com.test.bl', versions: ['1.0.0'], reason: 'malware' }]);
    expect(manager.getSnapshot().plugins[0]).toMatchObject({ status: 'disabled', installed: { disabledReason: 'blocklisted' } });
    expect(launcher.destroyed).toBe(1);
    expect(onAutoDisabled).toHaveBeenCalledWith(expect.anything(), 'blocklisted');
    await manager.setEnabled('com.test.bl', true);
    expect(manager.getSnapshot().plugins[0].status).toBe('disabled');
    manager.applyBlocklist([]);
    await vi.waitFor(() => expect(manager.getSnapshot().plugins[0].status).toBe('running'));
  });

  it('refuses a plugin built for another SDK major', async () => {
    manager = new PluginManager();
    await manager.start({ services: fakeServices(), persistence: memoryPersistence(), launchSandbox: fakeLauncher() });
    await expect(
      manager.install(makeBundle({ id: 'com.test.sdk2', sdk: '^2.0.0' }), { kind: 'dev', location: 'x', transport: 'url' }),
    ).rejects.toThrow(/needs SDK/);
  });
});
