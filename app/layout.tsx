import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '💕 Tabungan & Keuangan Kita',
  description: 'Portal catatan tabungan dan keuangan berdua: pantau saldo tabungan, pemasukan, pengeluaran, dan bukti struk nota bersama.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#F2F2F7',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
