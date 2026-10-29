import { NextResponse } from 'next/server';
import { getBudgetInfo, setBookBudget, DEFAULT_BOOK_NAME } from '@/lib/googleSheets';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const book = searchParams.get('book') || DEFAULT_BOOK_NAME;
    const month = searchParams.get('month') || undefined;

    const data = await getBudgetInfo(book, month);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching budget:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal memuat budget' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const book = body.book || DEFAULT_BOOK_NAME;
    const month = body.month || new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
    }).format(new Date()).slice(0, 7);
    const amount = parseFloat(String(body.amount || 0));

    if (isNaN(amount) || amount < 0) {
      return NextResponse.json(
        { success: false, error: 'Nominal budget tidak valid' },
        { status: 400 }
      );
    }

    await setBookBudget(book, month, amount);
    const updated = await getBudgetInfo(book, month);

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Error setting budget:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal menyimpan budget' },
      { status: 500 }
    );
  }
}

