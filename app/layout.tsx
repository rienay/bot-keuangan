import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '💕 Dashboard Tabungan & Keuangan Kita - Nabung Date',
  description: 'Portal catatan tabungan dan keuangan berdua: pantau saldo tabungan, pemasukan, pengeluaran, dan bukti struk nota bersama.',
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
