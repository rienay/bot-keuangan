import { GoogleGenerativeAI } from '@google/generative-ai';
import { ParsedTransaction } from './types';

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY belum dikonfigurasi di file .env');
  }
  return new GoogleGenerativeAI(apiKey);
}

// Format tanggal ke YYYY-MM-DD sesuai zona waktu lokal (Asia/Jakarta)
export function getLocalTodayDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

const GEMINI_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.8-flash'];

/**
 * Memanggil Gemini dengan fallback berantai antar model (gemini-3.6-flash -> gemini-3.5-flash -> gemini-3.5-flash-lite)
 * untuk mengatasi 429 Too Many Requests atau 503 Service Unavailable pada free tier.
 */
async function generateWithFallback(contents: any): Promise<any> {
  const genAI = getGeminiClient();
  let lastError: any = null;

  for (const modelName of GEMINI_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      return await model.generateContent(contents);
    } catch (err: any) {
      lastError = err;
      const isRateLimitOrTemporary =
        err?.status === 429 ||
        err?.message?.includes('429') ||
        err?.message?.includes('quota') ||
        err?.message?.includes('Too Many Requests') ||
        err?.status === 503 ||
        err?.message?.includes('503') ||
        err?.message?.includes('high demand') ||
        err?.message?.includes('temporarily unavailable');

      if (isRateLimitOrTemporary) {
        console.warn(`[Gemini] Model ${modelName} limit/beban tinggi, otomatis mencoba model cadangan...`);
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}

/**
 * Ekstraksi transaksi dari pesan teks bahasa natural
 */
export async function parseTextMessage(
  text: string,
  referenceDate: Date = new Date()
): Promise<ParsedTransaction | null> {


  const todayStr = getLocalTodayDateString(referenceDate);

  const prompt = `Kamu adalah asisten keuangan pribadi yang sangat pintar dalam menganalisis catatan keuangan dalam Bahasa Indonesia.
Tanggal referensi hari ini adalah: ${todayStr} (Zona Waktu: Asia/Jakarta).

Tugasmu adalah menganalisis pesan dari pengguna dan mengekstrak rincian transaksi dalam format JSON murni.

Aturan Penting:
1. Nominal: Ubah kata seperti "35rb", "35k", "35 ribu", "1.5jt", "1,5 juta", "200.000" menjadi angka murni (integer). Contoh: "35rb" -> 35000, "1.5jt" -> 1500000.
2. Tanggal:
   - Jika pengguna menyebutkan "kemarin", hitung tanggal H-1 dari ${todayStr}.
   - Jika "kemarin lusa", H-2.
   - Jika tanggal spesifik seperti "tgl 5 agustus", "10/09/2026", "2 hari lalu", konversikan ke format standar YYYY-MM-DD.
   - Jika tidak ada tanggal yang disebut, gunakan tanggal hari ini: ${todayStr}.
3. Tipe:
   - "Pemasukan": jika ada uang masuk (gaji, bonus, tabungan bersama, freelance, hadiah/THR, penjualan bisnis/sampingan).
   - "Pengeluaran": jika ada uang keluar (makanan/minuman, kencan/ngedate, belanja kebutuhan, bensin/transportasi, tagihan/kos, perawatan).
4. Kategori: WAJIB pilih salah satu kategori keuangan pribadi & tabungan berdua berikut yang paling relevan:
   Jika Pemasukan:
   - "Gaji": untuk gaji bulanan, upah kerja, lembur, payroll kantor.
   - "Bonus": untuk bonus kerja, insentif, tunjangan, THR, reward.
   - "Tabungan": untuk setoran tabungan berdua, uang yang disisihkan untuk ditabung bersama.
   - "Bisnis & Sampingan": untuk hasil jualan, freelance, proyek sampingan, side hustle.
   - "Investasi": untuk dividen, return reksadana/saham, bunga simpanan.
   - "Hadiah": untuk uang kado ulang tahun, angpau, pemberian keluarga/teman.
   - "Lain-lain": untuk pemasukan lainnya.

   Jika Pengeluaran:
   - "Makanan & Minuman": untuk sarapan, makan siang/malam, ngopi, jajan, cafe, resto, kulineran, groceries belanja bahan masakan/sayur/buah, pesan makan online (GoFood, ShopeeFood, GrabFood).
   - "Kencan & Hiburan": untuk kencan/ngedate bareng pasangan, nonton bioskop (XXI/CGV), jalan-jalan, liburan/wisata, tiket masuk tempat wisata, nonton konser, karaoke, staycation.
   - "Belanja & Kebutuhan": untuk pakaian, baju, celana, sepatu, outfit, tas, skincare, makeup/kosmetik, belanja online e-commerce (Shopee, Tokopedia, TikTok Shop), perlengkapan rumah/kos, barang pribadi.
   - "Transportasi": untuk bensin motor/mobil, servis/ganti oli kendaraan, parkir, tarif tol, ojek online (Gojek, Grab, Maxim), tiket KRL/busway/kereta/pesawat.
   - "Tagihan & Langganan": untuk token listrik PLN, tagihan air PDAM, WiFi internet rumah, pulsa, kuota paket data, sewa kos/kontrakan, langganan aplikasi (Netflix, Spotify, YouTube Premium).
   - "Kesehatan & Perawatan": untuk obat apotek, vitamin, periksa dokter/klinik, potong rambut/barbershop, salon/facial, gym/olahraga.
   - "Hadiah & Donasi": untuk kado pasangan/teman/keluarga, amplop kondangan/pernikahan, sedekah/zakat/infaq, traktiran.
   - "Pendidikan": untuk buku bacaan, kursus online, pelatihan, webinar.
   - "Pindah Uang": untuk tarik tunai ATM atau top up e-wallet antar dompet sendiri.
   - "Lain-lain": untuk pengeluaran tak terduga lainnya.
5. Keterangan: Deskripsi singkat dan jelas tentang transaksi tersebut (sertakan nama orang yang berutang/piutang jika ada di pesan).
6. Dompet (wallet): Deteksi metode atau penyimpanan saldo jika disebut eksplisit oleh pengguna:
   - Jika pengguna menyebut nama bank spesifik (seperti BCA, Mandiri, BRI, BNI, Jago, Seabank, dll), gunakan format: "Bank - <NamaBank>" (contoh: "Bank - BCA", "Bank - Mandiri").
   - Jika pengguna menyebut nama e-wallet spesifik (seperti DANA, GoPay, OVO, ShopeePay, LinkAja, dll), gunakan format: "E-Wallet - <NamaEwallet>" (contoh: "E-Wallet - Dana", "E-Wallet - GoPay").
   - Jika pengguna menyebut cash / tunai / uang fisik, gunakan: "Cash".
   - Jika TIDAK disebut secara spesifik sama sekali: kembalikan wallet: null (jangan menebak, biarkan pengguna memilih langsung lewat tombol bot).

Pesan pengguna: "${text}"

Kembalikan respon JSON persis dengan struktur berikut:
{
  "type": "Pengeluaran" | "Pemasukan",
  "amount": number,
  "category": string,
  "description": string,
  "date": "YYYY-MM-DD",
  "wallet": string | null
}

Jika pesan tersebut bukan catatan keuangan (misal cuma menyapa "halo"), kembalikan JSON: null.`;

  try {
    const result = await generateWithFallback(prompt);
    const responseText = result.response.text().trim();
    if (!responseText || responseText === 'null') {
      return null;
    }
    const parsed = JSON.parse(responseText) as ParsedTransaction;
    if (!parsed || !parsed.amount || !parsed.type) {
      return null;
    }
    return parsed;
  } catch (error) {
    console.error('Error saat parsing teks dengan Gemini:', error);
    throw error;
  }
}

/**
 * Ekstraksi transaksi dari foto nota/struk belanja (OCR Multimodal)
 */
export async function parseReceiptImage(
  imageBuffer: Buffer,
  mimeType: string,
  caption?: string,
  referenceDate: Date = new Date()
): Promise<ParsedTransaction | null> {
  const todayStr = getLocalTodayDateString(referenceDate);

  const prompt = `Analisis foto ini. Foto ini bisa berupa berbagai macam bukti transaksi keuangan:
1. BUKTI TRANSFER BANK / E-WALLET / QRIS (BCA Mobile, Mandiri Livin, BRImo, BNI, Seabank, Bank Jago, GoPay, OVO, DANA, ShopeePay, Flip, dll).
2. STRUK KASIR / NOTA MESIN PRINT (struk minimarket, resto, toko, SPBU, tiket, parkir, dll).
3. NOTA TULISAN TANGAN / BON WARUNG / KUITANSI KERTAS (bon toko kelontong, pasar, toko ATK, toko bangunan/kayu, kuitansi manual, nota sewa/rental alat).
4. INVOICE / FAKTUR RESMI (lembar tagihan, purchase order, surat jalan dengan harga).

Tanggal referensi hari ini: ${todayStr} (WIB).
Caption teks dari pengguna (SANGAT PENTING jika ada): "${caption || '-'}"

Tugas Analisis:
1. NOMINAL (amount):
   - Ambil jumlah uang transaksi (Nominal Transfer, Total Bayar, Grand Total, Jumlah).
   - Pastikan angka murni (integer/number), jangan ambil saldo sisa, biaya admin saja, atau nomor rekening/referensi.
2. TIPE (type):
   - "Pengeluaran": jika bukti transfer keluar (kirim uang, pembayaran, transfer ke rekening lain, bayar QRIS, belanja).
   - "Pemasukan": jika bukti transfer masuk (terima dana, transfer masuk, top up dari pihak lain).
3. TANGGAL (date):
   - Baca tanggal transaksi yang tertera pada bukti transfer / struk (format YYYY-MM-DD).
   - Jika tanggal pada gambar tidak terbaca, gunakan tanggal hari ini: ${todayStr}.
4. KETERANGAN (description):
   - Jika Bukti Transfer: sebutkan bank/e-wallet dan nama penerima/pengirim serta berita/catatan transfer jika ada. Contoh: "Transfer BCA ke Budi (Konsumsi)", "QRIS Resto Padang", "Transfer Masuk dari Ahmad".
   - Jika Struk Belanja: nama toko dan barang utama (contoh: "Indomaret", "SPBU Pertamina").
   - Utamakan informasi dari Caption pengguna jika pengguna menuliskan catatan tambahan.
5. KATEGORI (category): WAJIB pilih salah satu kategori pribadi & pasangan yang paling relevan:
   - "Makanan & Minuman": struk resto, warung makan, cafe, minimarket belanja makanan/snack/minuman (Indomaret, Alfamart, Superindo, dll).
   - "Kencan & Hiburan": struk tiket bioskop (XXI, CGV), tiket rekreasi/wisata, hiburan, hotel/staycation berdua.
   - "Belanja & Kebutuhan": struk toko baju/fashion, kosmetik/skincare (Guardian, Watsons), perabotan rumah/kos, barang elektronik, belanja e-commerce.
   - "Transportasi": struk SPBU Pertamina/Shell, karcis parkir, struk tarif tol, tiket transportasi umum, struk Gojek/Grab.
   - "Tagihan & Langganan": struk bayar listrik PLN, WiFi internet, pulsa, PDAM, sewa kos.
   - "Kesehatan & Perawatan": struk apotek/obat, klinik, salon, potong rambut.
   - "Tabungan": bukti transfer tabungan, setoran simpanan bersama.
   - "Gaji": bukti transfer penerimaan gaji atau upah.
   - "Lain-lain": jika tidak ada yang cocok.
6. DOMPET (wallet):
   - Jika bukti transfer m-banking terlihat jelas nama banknya (BCA, Mandiri, BRI, BNI, Seabank, Jago, dll): "Bank - <NamaBank>" (contoh: "Bank - BCA").
   - Jika bukti pembayaran / transfer e-wallet terlihat jelas (GoPay, DANA, OVO, ShopeePay, dll): "E-Wallet - <NamaEwallet>" (contoh: "E-Wallet - Dana").
   - Jika struk belanja fisik kasir toko/minimarket/tunai: "Cash".
   - Jika tidak dapat dipastikan atau tidak tertulis: null.

Kembalikan respon JSON persis dengan struktur berikut:
{
  "type": "Pengeluaran" | "Pemasukan",
  "amount": number,
  "category": string,
  "description": string,
  "date": "YYYY-MM-DD",
  "wallet": string | null
}

Jika gambar sama sekali bukan bukti transfer, bukan struk/nota, dan tidak ada nominal transaksi finansial, kembalikan JSON: null.`;

  try {
    const result = await generateWithFallback([
      prompt,
      {
        inlineData: {
          data: imageBuffer.toString('base64'),
          mimeType: mimeType || 'image/jpeg',
        },
      },
    ]);

    const responseText = result.response.text().trim();
    if (!responseText || responseText === 'null') {
      return null;
    }
    const parsed = JSON.parse(responseText) as ParsedTransaction;
    if (!parsed || !parsed.amount) {
      return null;
    }
    return parsed;
  } catch (error) {
    console.error('Error saat parsing gambar nota dengan Gemini:', error);
    throw error;
  }
}
