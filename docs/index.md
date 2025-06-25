---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "PD2 Trader"
  text: "A powerful tool for Project Diablo 2 players: price check, quick list, and more!"
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
    image: https://i.imgur.com/F8qoHCw.png
  - title: Quick List
    details: List your items for trade quickly and efficiently.
    image: https://i.imgur.com/4eHHz6a.jpeg
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
Instantly check the value of your items in-game with a single hotkey.
<a href="https://i.imgur.com/F8qoHCw.png" target="_blank" rel="noopener noreferrer">
  <img src="https://i.imgur.com/F8qoHCw.png" alt="Item Price Check" style="max-width: 100%; margin-top: 0.5rem;" />
</a>

#### Quick List
List your items for trade quickly and efficiently.
<a href="https://i.imgur.com/4eHHz6a.jpeg" target="_blank" rel="noopener noreferrer">
  <img src="https://i.imgur.com/4eHHz6a.jpeg" alt="Quick List" style="max-width: 100%; margin-top: 0.5rem;" />
</a>

#### Rune Exchange
Easily compare and trade runes with up-to-date exchange rates.
<a href="https://i.imgur.com/YvGC9Du.png" target="_blank" rel="noopener noreferrer">
  <img src="https://i.imgur.com/YvGC9Du.png" alt="Rune Exchange" style="max-width: 100%; margin-top: 0.5rem;" />
</a>

For more information, use the links above or explore the sidebar.

