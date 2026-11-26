import { NextResponse } from 'next/server';
import { createSheetBook, deleteSheetBook, getAllSheetBooks } from '@/lib/googleSheets';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const books = await getAllSheetBooks(true);
    return NextResponse.json({ success: true, books });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Gagal memuat pos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, name } = body || {};

    if (action === 'create') {
      const res = await createSheetBook(String(name || ''));
      return NextResponse.json({ success: true, bookName: res.bookName });
    }

    if (action === 'delete') {
      const res = await deleteSheetBook(String(name || ''));
      if (!res.success) {
        return NextResponse.json({ success: false, error: res.message }, { status: 400 });
      }
      return NextResponse.json({ success: true, bookName: res.bookName, message: res.message });
    }

    return NextResponse.json({ success: false, error: 'Aksi tidak valid' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Gagal memproses pos' }, { status: 500 });
  }
}
