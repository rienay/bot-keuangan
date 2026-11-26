import { NextResponse } from 'next/server';
import { parseTextMessage } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { text } = await request.json();
    if (!text || !String(text).trim()) {
      return NextResponse.json({ success: false, error: 'Teks tidak boleh kosong' }, { status: 400 });
    }
    const parsed = await parseTextMessage(String(text).trim());
    return NextResponse.json({ success: true, parsed });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal memproses teks dengan AI' },
      { status: 500 }
    );
  }
}
