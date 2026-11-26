import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Keuangan Kita',
    short_name: 'Keuangan',
    description: 'Catatan tabungan dan keuangan berdua, dipisah per pos.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F3F5F2',
    theme_color: '#0F766E',
    lang: 'id',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
