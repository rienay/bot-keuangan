import { NextResponse } from 'next/server';
import { appendTransaction, updateTransactionRow, clearTransactionRow, resolveBook, getRegisteredWallets, DEFAULT_BOOK_NAME } from '@/lib/googleSheets';

export const dynamic = 'force-dynamic';
const fail = (e: any, status = 500) => NextResponse.json({ success: false, error: e?.message || 'Terjadi kesalahan' }, { status });

export async function GET() {
  try {
    const w = await getRegisteredWallets();
    return NextResponse.json({ success: true, wallets: ['Cash', ...w.banks.map((b) => `Bank - ${b}`), ...w.ewallets.map((e) => `E-Wallet - ${e}`)] });
  } catch (e) { return fail(e); }
}

export async function POST(req: Request) {
  try {
    const b = await req.json();
    const book = await resolveBook(b.book || DEFAULT_BOOK_NAME);
    const row = Number(b.row);
    if (b.action === 'delete') {
      await clearTransactionRow(book, row);
      return NextResponse.json({ success: true });
    }
    const amount = Math.round(Number(b.amount));
    if (!(amount > 0)) return fail({ message: 'Nominal harus lebih dari 0' }, 400);
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
    const tx = {
      type: b.type === 'Pemasukan' ? ('Pemasukan' as const) : ('Pengeluaran' as const),
      category: String(b.category || 'Lain-lain').trim().slice(0, 60),
      amount,
      description: String(b.description || '').trim().slice(0, 200),
      date: /^\d{4}-\d{2}-\d{2}$/.test(b.date) ? b.date : today,
      wallet: String(b.wallet || 'Cash').trim().slice(0, 60),
    };
    if (b.action === 'edit') await updateTransactionRow(book, row, tx);
    else await appendTransaction(tx, book);
    return NextResponse.json({ success: true });
  } catch (e) { return fail(e); }
}
