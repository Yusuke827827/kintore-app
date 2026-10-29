import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
// npm run build      → Web版（GitHub Pages・ホーム画面に追加できるPWA）
// npm run build:app  → iPhoneアプリ版（Capacitor に入れる。PWA の仕組みは使わない）
export default defineConfig(({ mode }) => {
  const app = mode === 'app'
  return {
    base: app ? './' : '/kintore-app/',
    plugins: [
      react(),
      !app &&
        VitePWA({
          registerType: 'autoUpdate',
          workbox: {
            // 規約・プライバシーポリシーはアプリ本体ではなく、そのページを開く
            navigateFallbackDenylist: [/privacy\.html$/, /terms\.html$/],
          },
          manifest: {
            name: '筋トレ記録アプリ',
            short_name: '筋トレ記録',
            description: 'エニタイムフィットネス野田キャンパス店での筋トレ記録アプリ',
            theme_color: '#111827',
            background_color: '#111827',
            display: 'standalone',
            start_url: './',
            scope: './',
            icons: [
              { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
              { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
            ],
          },
        }),
    ],
  }
})
