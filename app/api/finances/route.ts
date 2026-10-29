import { NextResponse } from 'next/server';
import { getAllTransactionsForWeb } from '@/lib/googleSheets';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const book = searchParams.get('book') || 'Tabungan';
    const force = searchParams.get('force') === 'true' || searchParams.has('_t');
    const data = await getAllTransactionsForWeb(book, force);
    return NextResponse.json(
      { success: true, data },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error: any) {
    console.error('Error fetching web finances:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal memuat data keuangan' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  }
}
