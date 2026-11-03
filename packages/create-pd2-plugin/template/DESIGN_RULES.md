# Design rules for PD2 Trader plugins

A plugin should look and behave like the rest of the overlay in all 21 themes and at every window opacity. The
platform enforces most of this: slot output is plain JSON the host renders with its own components, and panels
get the theme as CSS variables. These rules cover the rest. AI tools: read `llms.txt` (same rules, terse).

## How a plugin is built

| Part      | Where it runs                                          | What you write                                           |
| --------- | ------------------------------------------------------ | -------------------------------------------------------- |
| Worker    | Web Worker in a sandboxed frame, no DOM, no network    | `src/worker.ts`: slot handlers, commands, event handlers |
| Slots     | Inside core surfaces (price check, market, chat, …)    | JSON trees built with `ui.*`; the host renders them      |
| Panels    | Their own overlay window, sandboxed iframe             | `src/*.html` + plain TS, theme kit classes               |
| Manifest  | `pd2-plugin.json`                                      | id, slots, commands, permissions, settings               |

Everything goes through `import { sdk, ui } from '@pd2-trader/plugin-sdk'` in the worker and `window.pd2` in
panels. There is no other way to reach the host.

## Slots: declarative UI only

Slot handlers return nodes from `ui.*`. You never write DOM, classes or colors for a slot.

| Node      | Builder                              | Limits                                                  |
| --------- | ------------------------------------ | ------------------------------------------------------- |
| `section` | `ui.section(title, children)`        | title 1–80 chars, ≤ 50 children                         |
| `row`     | `ui.row(label, value, tone?)`        | label 1–80, value ≤ 300                                 |
| `badge`   | `ui.badge(text, tone = 'default')`   | text 1–40                                               |
| `text`    | `ui.text(text, { tone?, size? })`    | ≤ 300 chars, size `sm` or `md`                          |
| `price`   | `ui.price(amount, unit?, trend?)`    | unit `hr` (default), `rune`, `gold`; trend `up`/`down`/`flat` |
| `button`  | `ui.button(label, commandId, args?)` | label 1–40; command from `manifest.commands`; args JSON ≤ 2 KB |
| `divider` | `ui.divider()`                       |                                                         |
| `list`    | `ui.list(items)`                     | ≤ 50 items                                              |

Whole tree: depth ≤ 6, ≤ 200 nodes. Output that fails validation is not rendered and counts as a failure.

**Tones** (meaning, not hue): `default`, `muted` (secondary info), `success` (good deal, price up, done),
`warning` (stale, partial, worse deal), `danger` (errors, scams), and the item quality tones `q-unique`,
`q-set`, `q-rare`, `q-magic`, `q-crafted`, `q-rune`. Use `q-*` only for item names and item meaning.

| Slot                 | Return                                                       | Needs         |
| -------------------- | ------------------------------------------------------------ | ------------- |
| `priceCheck.section` | `ui.section(...)` or `null`                                  | `items:read`  |
| `priceCheck.badge`   | `ui.badge(...)` or `null`                                    | `items:read`  |
| `market.column`      | `{ title, cells: { [rowId]: { text, tone? } } }` or `null`    | `prices:read` |
| `market.filter`      | `{ label, keep: rowId[] }` or `null`                         | `prices:read` |
| `market.sort`        | `{ label, scores: { [rowId]: number } }` (higher first) or `null` | `prices:read` |
| `market.rowAction`   | up to 3 `ui.button(...)` (args default to the row id)        | `prices:read` |
| `chat.decorate`      | `{ tags: badge[] (≤ 3), highlight?: tone }` or `null`        | `chat:read`   |
| `chat.action`        | up to 3 `ui.button(...)`                                     | `chat:read`   |
| `networth.tab`       | `{ title, content: node[] }` or `null`                       | `stash:read`  |
| `networth.metric`    | `{ label, value: price or text node }` or `null`             | `stash:read`  |
| `ticker.widget`      | up to 4 badge/text/price nodes or `null`                     | none          |
| `settings.section`   | no handler: the host renders `manifest.settings` as a form   | none          |

Short text (titles, labels, column titles): ≤ 40 characters unless noted. Return `null` when you have nothing
useful to add: an empty section is noise.

## Panels: theme kit only

The host injects the theme kit CSS and sets every theme token as a CSS variable on `:root`
(`var(--foreground)`, `var(--border)`, `var(--q-unique)`…), and updates them live when the theme changes.

- Compose with the kit classes: `pd2-stack`, `pd2-row`, `pd2-grid`, `pd2-tile`, `pd2-title`, `pd2-label`,
  `pd2-value`, `pd2-muted`, `pd2-badge` (+ `data-tone="success|warning|danger"`), `pd2-button`
  (+ `pd2-button-secondary`), `pd2-input`, `pd2-divider`, `pd2-skeleton`, text colors `tone-muted`,
  `tone-success`, `tone-warning`, `tone-danger`, `q-unique`, `q-set`, `q-rare`, `q-magic`, `q-crafted`, `q-rune`.
- Extra CSS (a `<style>` block or a local stylesheet) may use **CSS variables only**: no hex, `rgb()`, `hsl()`,
  `oklch()` or named colors. `color-mix(in oklab, var(--success) 15%, transparent)` is fine.
- Leave the background transparent: the panel chrome follows the window-opacity setting.
- Show loading with `pd2-skeleton`, errors with `tone-danger` text, empty states with `pd2-muted` text.
- Set text with `textContent`, never `innerHTML` with data.
- The panel can't use the network, remote scripts, fonts or images; `pd2-plugin build` inlines your local
  `<script src>` and `<link rel="stylesheet">` and rejects remote ones.

Panel bridge (`window.pd2`): `onTheme(fn)`, `onPayload(fn)` (data from `sdk.panels.open(panel, payload)`),
`onMessage(fn)` (data from `sdk.panels.post(panel, data)`), `post(data)` (to the worker's
`sdk.panels.onMessage`), `call(method, params)` (broker call with your permissions, e.g.
`pd2.call('prices.runes')`), `close()`.

## Copy

Sentence case, short, no exclamation marks. Numbers: `1.25 HR`, `≈ 1.4 Ber`. Say what happened and what to do
("Could not load prices. Try again."), never raw stack traces.

## Permissions

Ask only for what you use; each one is shown to the user at install.

| Permission        | Grants                                                     | User consent | Review               |
| ----------------- | ---------------------------------------------------------- | ------------ | -------------------- |
| `prices:read`     | pd2-trader price/market data (`sdk.prices.*`)              | Silent       | Auto                 |
| `items:read`      | Price-checked items (price-check slots, `item.priceChecked`) | Silent     | Auto                 |
| `chat:read`       | Chat messages, including whispers (chat slots, `chat.message`) | Prompt   | Auto                 |
| `stash:read`      | Stash / net worth summary for the signed-in account        | Prompt       | Manual               |
| `account:profile` | Account name and characters                                | Prompt       | Manual               |
| `network:<host>`  | `sdk.fetch` to a host listed in `manifest.network`         | Prompt       | Manual for new hosts |
| `storage:local`   | `sdk.storage`, namespaced key-value store, 5 MB            | Silent       | Auto                 |
| `notifications`   | `sdk.notify` toasts (3 per minute)                         | Silent       | Auto                 |

Never available: the PD2 login token, game input / key presses, the filesystem, clipboard writes, Tauri
commands. An update that adds permissions or hosts waits until the user approves it again.

## Budgets

- A slot handler has **300 ms**. Late answers show a skeleton, then an error chip.
- **5 failures (timeouts, crashes, invalid output) within 10 minutes disable the plugin.**
- Commands have 5 s. A worker that stops answering the host's ping for 2 s is terminated.
- **Never fetch inside a slot handler.** Load data at startup and refresh on a timer; answer from memory.
- No `eval`, `new Function`, string timers or loading remote code: review rejects them (and the sandbox CSP
  blocks them).

## Develop

```sh
npm install
npm run dev          # builds to dist/, rebuilds on save, serves http://localhost:5199/
```

In the overlay: **Settings → Plugins → Load unpacked**, enter `http://localhost:5199/`. The plugin reloads when
you save. In the desktop app you can also load a folder: `npm run dev -- --outdir "<AppConfig>/plugins-dev/<name>"`
(macOS: `~/Library/Application Support/com.pd2-trader.app`, Windows: `%APPDATA%\com.pd2-trader.app`) and load
`plugins-dev/<name>`. Other port: `npm run dev -- --port 5200`.

`npm run build` writes the bundle (`dist/manifest.json`, `dist/worker.js`, `dist/panels/*.html`) that the
marketplace builds from your tagged source. `npm run lint` checks these rules.
