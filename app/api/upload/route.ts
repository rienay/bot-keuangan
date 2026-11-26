import { NextResponse } from 'next/server';
import { uploadReceiptToDrive } from '@/lib/googleDrive';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ success: false, error: 'File foto tidak ditemukan' }, { status: 400 });
    }
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileName = `nota_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const url = await uploadReceiptToDrive(buffer, fileName, file.type || 'image/jpeg');
    if (!url) {
      return NextResponse.json({ success: false, error: 'Gagal mengunggah foto ke Google Drive' }, { status: 500 });
    }
    return NextResponse.json({ success: true, url });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Gagal mengunggah foto' }, { status: 500 });
  }
}
