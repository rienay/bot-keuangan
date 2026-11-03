import { NextRequest, NextResponse } from 'next/server';
import {
  getDebtsSummary,
  addDebtItem,
  settleDebt,
  deleteDebt,
  DEFAULT_BOOK_NAME,
} from '@/lib/googleSheets';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const book = searchParams.get('book') || DEFAULT_BOOK_NAME;

    const summary = await getDebtsSummary(book === 'Semua' ? undefined : book);
    return NextResponse.json({ success: true, data: summary });
  } catch (err: any) {
    console.error('Error in GET /api/debts:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Gagal mengambil data utang/piutang' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action || 'add';

    if (action === 'settle') {
      const { debtId, amount } = body;
      if (!debtId) {
        return NextResponse.json({ success: false, error: 'debtId harus disertakan' }, { status: 400 });
      }
      const updated = await settleDebt(debtId, amount ? parseFloat(amount) : undefined);
      if (!updated) {
        return NextResponse.json({ success: false, error: 'Data utang/piutang tidak ditemukan' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: updated });
    }

    if (action === 'delete') {
      const { debtId } = body;
      if (!debtId) {
        return NextResponse.json({ success: false, error: 'debtId harus disertakan' }, { status: 400 });
      }
      const ok = await deleteDebt(debtId);
      return NextResponse.json({ success: ok });
    }

    // Default: Add debt item
    const { book, type, person, amount, description, wallet, date } = body;
    if (!type || !person || !amount) {
      return NextResponse.json(
        { success: false, error: 'Tipe (Utang/Piutang), nama pihak, dan nominal wajib diisi' },
        { status: 400 }
      );
    }

    const created = await addDebtItem({
      book: book || DEFAULT_BOOK_NAME,
      type: type === 'Utang' ? 'Utang' : 'Piutang',
      person: String(person).trim(),
      amount: parseFloat(amount),
      description,
      wallet,
      date,
    });

    return NextResponse.json({ success: true, data: created });
  } catch (err: any) {
    console.error('Error in POST /api/debts:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Gagal memproses utang/piutang' }, { status: 500 });
  }
}

