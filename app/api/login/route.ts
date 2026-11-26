import { NextResponse } from 'next/server';
import { getAllSheetBooks } from '@/lib/googleSheets';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { name } = await req.json();
    const q = String(name || '').trim().toLowerCase();
    if (!q) {
      return NextResponse.json({ success: false, error: 'Masukkan nama pos terlebih dahulu' }, { status: 400 });
    }
    const books = await getAllSheetBooks(true);
    const match = books.find((b) => !b.startsWith('_') && b.toLowerCase() === q);
    if (!match) {
      return NextResponse.json({ success: false, error: 'Nama pos tidak ditemukan. Cek ejaannya lagi ya.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, bookName: match });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Gagal memverifikasi pos' }, { status: 500 });
  }
}
