---
title: Download
---

<script setup>
import { useData } from 'vitepress'

const { theme } = useData()
</script>

You can download PD2 Trader here. Any other mirrors are not known
to the developer, downloading from them may be unsafe.

| Download link                                                                                                                                                                                                                                                              | Automatic updates | Startup time |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ------------ |
| <a :href="`${theme.github.releasesUrl}/download/app-v${theme.appVersion}/PD2.Trader_${theme.appVersion}_x64-setup.exe`">Windows 10+</a>                                                                                                                                    | ✔                 | Fast         |
| <a :href="`${theme.github.releasesUrl}/download/app-v${theme.appVersion}/PD2.Trader_${theme.appVersion}_amd64.AppImage`">Linux (AppImage)</a> <span class="bg-orange-100 text-orange-800 border border-orange-300 rounded px-1.5 py-0.5 text-xs font-semibold">BETA</span> | ✔                 | Fast         |
| <a :href="`${theme.github.releasesUrl}/download/app-v${theme.appVersion}/PD2.Trader-${theme.appVersion}-1.x86_64.rpm`">Linux (RPM)</a> <span class="bg-orange-100 text-orange-800 border border-orange-300 rounded px-1.5 py-0.5 text-xs font-semibold">BETA</span>        | ✘ (manual)        | Fast         |
| <a :href="`${theme.github.releasesUrl}/download/app-v${theme.appVersion}/PD2.Trader_${theme.appVersion}_amd64.deb`">Linux (DEB)</a> <span class="bg-orange-100 text-orange-800 border border-orange-300 rounded px-1.5 py-0.5 text-xs font-semibold">BETA</span>           | ✘ (manual)        | Fast         |

Latest version is <span class="bg-gray-100 border rounded px-1">{{ theme.appVersion }}</span>

\*The app is unsigned, which means you'll have to bypass security
warnings on Windows to open it.{:.text-sm}

---

### Requirements

- PD2 display mode
  - ✔ Fullscreen
  - ✔ Windowed
- PD2 language
  - ✔ English

**In order for PD2 Trader to have access to the Diablo II window, it must be started with Administrator rights, the app will automatically request for permissions.**
