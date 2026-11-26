import { NextResponse } from 'next/server';
import { getGoals, addGoal, changeGoal, resolveBook } from '@/lib/googleSheets';

export const dynamic = 'force-dynamic';
const fail = (e: any, status = 500) => NextResponse.json({ success: false, error: e?.message || 'Terjadi kesalahan' }, { status });

export async function GET(req: Request) {
  try {
    const book = new URL(req.url).searchParams.get('book') || undefined;
    return NextResponse.json({ success: true, goals: await getGoals(book === 'Semua' ? undefined : book) });
  } catch (e) { return fail(e); }
}

export async function POST(req: Request) {
  try {
    const b = await req.json();
    if (b.action === 'add') {
      const target = Math.round(Number(b.target));
      if (!String(b.name || '').trim() || !(target > 0)) return fail({ message: 'Isi nama dan target' }, 400);
      await addGoal({ book: await resolveBook(b.book), name: String(b.name).trim().slice(0, 80), target, due: /^\d{4}-\d{2}-\d{2}$/.test(b.due) ? b.due : '' });
    } else if (b.action === 'deposit') {
      const amount = Math.round(Number(b.amount));
      if (!(amount > 0)) return fail({ message: 'Nominal harus lebih dari 0' }, 400);
      await changeGoal(String(b.id), 'deposit', amount);
    } else if (b.action === 'delete') {
      await changeGoal(String(b.id), 'delete');
    }
    return NextResponse.json({ success: true });
  } catch (e) { return fail(e); }
}
