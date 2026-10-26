---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: 'PD2 Trader'
  text: 'A powerful tool for Project Diablo 2 players: price check, quick list, and more!'
  tagline: Effortlessly check item prices, manage your trades, and optimize your PD2 experience.
  image:
    src: https://i.imgur.com/tGkknQX.png
    alt: PD2 Trader Logo
  actions:
    - theme: brand
      text: Download
      link: /download
    - theme: alt
      text: Quick Start
      link: /quick-start
    - theme: alt
      text: FAQ
      link: /faq
    - theme: alt
      text: Common Issues
      link: /issues

features:
  - title: Item Price Check
    details: Instantly check the value of your items in-game with a single hotkey.
    image: https://i.imgur.com/8vSvw6F.png
  - title: Quick List
    details: List your items for trade quickly and efficiently.
    image: https://i.imgur.com/jN3Tc4O.jpeg
  - title: Manage Listings
    details: Easily manage, update, and view all your items currently listed on the PD2 marketplace from a dedicated tab.
    image: https://i.imgur.com/VQ8gNuf.jpeg
  - title: Net Worth
    details: Instantly calculate the value of your stash (Ctrl+X) and track it over the season.
    image: https://i.imgur.com/wCqiZpj.png
  - title: Rune Exchange
    details: Easily compare and trade runes with up-to-date exchange rates.
    image: https://i.imgur.com/YvGC9Du.png
---

<script setup>
import { useData } from 'vitepress'

const { theme } = useData()
</script>

<div style="display: flex; justify-content: center;">
  <img src="https://i.imgur.com/tGkknQX.png" alt="Logo" width="250" />
</div>

<div style="text-align: center; font-size: 1.0rem; margin-top: -1.5rem; margin-bottom: 1.5rem;">
  PD2 Trader is a desktop app designed for Project Diablo 2 players. It helps you quickly check item prices and list items for trade.
</div>

<div style="display: flex; justify-content: center; margin: 2rem 0;">
  <a :href="`${theme.github.releasesUrl}/download/app-v${theme.appVersion}/PD2.Trader_${theme.appVersion}_x64-setup.exe`"
     class="vp-button"
     style="font-size: 1.25rem; padding: 0.5em 2em; background: #18181b; color: #f4f4f5; border-radius: 0.2em; text-decoration: none; box-shadow: 0 2px 8px rgba(0,0,0,0.12); transition: background 0.2s; border: 1px solid #333;"
     onmouseover="this.style.background='#27272a'"
     onmouseout="this.style.background='#18181b'">
    Installer
  </a>
</div>

### 🚀 Main Features

#### Item Price Check

Instantly check the value of your items in-game with a single hotkey. The **Copy image** button in the price check title bar copies the item as a PD2-style tooltip with its price (average, listings) to your clipboard, ready to paste into Discord or a trade post. The tooltip is drawn like the game's: name, runes, defense or damage, requirements, every property in the game's order (socketed runes, gems and jewels included) and the set's items. Lines the clipboard can't tell are left out rather than guessed: durability, chance to block, and the required level of rare and crafted items.

Every stat shows its roll range exactly like the PD2 tooltip with stat ranges on (e.g. `[25 - 50]`), and the min/max fill stays inside it. Damage pairs ("Adds 4-14 fire damage") are one row with separate min and max damage filters.

<a href="https://i.imgur.com/8vSvw6F.png" target="_blank" rel="noopener noreferrer">
<img src="https://i.imgur.com/8vSvw6F.png" alt="Item Price Check" style="max-width: 100%; margin-top: 0.5rem;" />
</a>

#### Quick List

List your items for trade quickly and efficiently.
<a href="https://i.imgur.com/jN3Tc4O.jpeg" target="_blank" rel="noopener noreferrer">
<img src="https://i.imgur.com/jN3Tc4O.jpeg" alt="Quick List" style="max-width: 100%; margin-top: 0.5rem;" />
</a>

#### Manage Listings

Easily manage, update, and view all your items currently listed on the PD2 marketplace from a dedicated tab.
<a href="https://i.imgur.com/VQ8gNuf.jpeg" target="_blank" rel="noopener noreferrer">
<img src="https://i.imgur.com/VQ8gNuf.jpeg" alt="Manage Listings" style="max-width: 100%; margin-top: 0.5rem;" />
</a>

#### Net Worth

Instantly calculate the value of your stash (Ctrl+X): runes, currency, uniques and more, with history over the season.
<a href="https://i.imgur.com/wCqiZpj.png" target="_blank" rel="noopener noreferrer">
<img src="https://i.imgur.com/wCqiZpj.png" alt="Net Worth" style="max-width: 100%; margin-top: 0.5rem;" />
</a>

#### Net Worth Ticker

Track your net worth while you play: a small in-game ticker shows your total in HR, the change this session and HR per hour. Click it for a mini panel with a session chart, recent snapshots and session start/stop. Optional toasts tell you what changed (e.g. `+1.2 HR · Ber, 2× Ist`), and a hotkey takes a snapshot on demand. Turn it on under Settings → Net Worth, then pin it to a corner of the game or drag it anywhere on screen.

#### Corrupted Zone Timer

Know where to farm without leaving the game: a small in-game timer shows the zones corrupted in Hell games made right now (monster level 85, more density, more Worldstone Shards and Tier 1 maps) and a countdown to the next 15-minute rotation. Click it for the upcoming zones and their start times. A game keeps the zones it was made with, so make a new game after the switch. Optional notifications pop up a toast when the zone changes, for every zone or only the ones you follow. Turn it on under Settings → Interface, then pin it to a corner of the game or drag it anywhere on screen.

#### Builds

See what the ladder plays without leaving the game: the Builds panel shows the most played classes, skills and gear of level 80+ characters, and each character's gear, skills and build timeline. Open your own characters for gear-up suggestions priced in HR, a trader's build from the chat, or the builds that wear an item from its price check. Set a Builds hotkey in Settings → Hotkeys (unbound by default).

#### Rune Exchange

Easily compare and trade runes with up-to-date exchange rates.
<a href="https://i.imgur.com/YvGC9Du.png" target="_blank" rel="noopener noreferrer">
<img src="https://i.imgur.com/YvGC9Du.png" alt="Rune Exchange" style="max-width: 100%; margin-top: 0.5rem;" />
</a>

#### Themes

Make the overlay your own: choose from 21 color themes (11 dark, 10 light) in Settings → Interface, applied instantly to every panel.

Panels are opaque by default; the Window transparency slider in Settings → Interface lets the game show through their backgrounds (up to 90%).
