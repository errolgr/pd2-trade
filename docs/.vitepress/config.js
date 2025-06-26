import { defineConfig } from 'vitepress'

const BASE = '/pd2-trade/'

export default defineConfig({
  title: 'PD2 Trader',
  description: 'App for price-checking items in Project Diablo 2',
  base: BASE,
  mpa: true,
  head: [
    ['link', { rel: 'shortcut icon', type: 'image/png', href: `${BASE}favicon.png` }],
  ],
  markdown: {
    theme: 'light-plus',
    attrs: {
      leftDelimiter: '{:',
      rightDelimiter: '}'
    }
  },
  themeConfig: {
    appVersion: '0.2.3',
    github: {
      releasesUrl: 'https://github.com/errolgr/pd2-trade/releases'
    },
    socialLinks: [
      {
        text: 'Discord',
        color: '#7289DA',
        link: 'https://discord.gg/Yj7p3rMyRk'
      },
      {
        text: 'Buy me a coffee',
        color: '#6F4E37',
        link: 'https://buymeacoffee.com/errolgreen'
      },
      {
        text: 'GitHub',
        color: '#181717',
        link: 'https://github.com/errolgr/pd2-trade'
      }
    ],
    sidebar: [
      {
        items: [{
          text: 'Download',
          link: '/download'
        }, {
          text: 'Quick Start',
          link: '/quick-start'
        }]
      },
      {
        items: [{
          text: 'Common issues',
          link: '/issues'
        }, {
          text: 'FAQ',
          link: '/faq'
        }]
      }
    ]
  }
})