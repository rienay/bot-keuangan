import { NextResponse } from 'next/server';
import { transferBookBalance, transferWalletMoney, resolveBook } from '@/lib/googleSheets';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const b = await req.json();
    const amount = Math.round(Number(b.amount));
    if (!(amount > 0)) throw new Error('Nominal harus lebih dari 0');
    if (b.mode === 'book') {
      await transferBookBalance({ sourceBook: String(b.book), targetBook: String(b.toBook), amount, description: b.description || undefined });
    } else {
      await transferWalletMoney({ bookName: await resolveBook(b.book), fromWallet: String(b.from), toWallet: String(b.to), amount, senderName: 'Web' });
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Gagal memindahkan saldo' }, { status: 400 });
  }
}
