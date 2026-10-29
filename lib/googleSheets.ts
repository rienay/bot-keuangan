import { google } from 'googleapis';
import { getGoogleAuth } from './googleAuth';
import {
  ParsedTransaction,
  SummaryReport,
  GlobalSummaryReport,
  BookSummary,
  ExpenseDetail,
  TransferBalanceParams,
  TransferBalanceResult,
  WebFinanceData,
  WebTransactionItem,
  WalletBalances,
  BudgetInfo,
  MonthlyStatsItem,
  MonthlyComparisonReport,
} from './types';

export const DEFAULT_BOOK_NAME = 'Tabungan';

const SHEET_COLUMNS = [
  'Tanggal',
  'Jenis',
  'Kategori',
  'Nominal',
  'Keterangan',
  'Link Nota',
  'Waktu Input',
  'Dompet',
];

const SESSION_SHEET_NAME = '_Sessions';
export const BUDGET_SHEET_NAME = '_Budget';

function getSpreadsheetId(): string {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEET_ID belum dikonfigurasi di file .env');
  }
  return spreadsheetId;
}

// In-memory cache untuk sesi buku aktif pengguna (chatId -> bookName)
const activeBookCache = new Map<string, string>();
// In-memory cache daftar sheets dengan timestamp (TTL 30 detik)
let cachedSheetList: { list: string[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 30_000;

/**
 * Membersihkan nama sheet agar valid di Google Sheets
 */
export function sanitizeBookName(rawName: string): string {
  return rawName
    .trim()
    .replace(/[\\/\?\*\[\]:]/g, '') // Karakter terlarang di Google Sheets
    .replace(/\s+/g, ' ')
    .slice(0, 30);
}

/**
 * Memastikan header kolom sudah dibuat di Google Sheet jika masih kosong.
 */
export async function ensureHeaderRow(sheetName: string = DEFAULT_BOOK_NAME): Promise<void> {
  const auth = getGoogleAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = getSpreadsheetId();

  // Jika mencari Tabungan, tetapi tab di Google Sheets masih 'Kas', otomatis rename ke 'Tabungan'
  if (sheetName.toLowerCase() === DEFAULT_BOOK_NAME.toLowerCase()) {
    try {
      const meta = await sheets.spreadsheets.get({ spreadsheetId });
      const hasDefaultSheet = meta.data.sheets?.some(
        (s) => s.properties?.title?.toLowerCase() === DEFAULT_BOOK_NAME.toLowerCase()
      );
      const oldKasSheet = meta.data.sheets?.find(
        (s) => s.properties?.title?.toLowerCase() === 'kas'
      );
      if (!hasDefaultSheet && oldKasSheet && oldKasSheet.properties?.sheetId !== undefined) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [
              {
                updateSheetProperties: {
                  properties: {
                    sheetId: oldKasSheet.properties.sheetId,
                    title: DEFAULT_BOOK_NAME,
                  },
                  fields: 'title',
                },
              },
            ],
          },
        });
        cachedSheetList = null;
      }
    } catch (e) {
      // Abaikan jika gagal rename, lanjutkan get biasa
    }
  }

  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${sheetName}'!A1:H1`,
    });

    const values = res.data.values;
    if (!values || values.length === 0 || values[0].length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${sheetName}'!A1:H1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [SHEET_COLUMNS],
        },
      });
    } else if (values[0].length < 8) {
      // Header belum ada kolom Dompet (H1), tambahkan H1 = 'Dompet'
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${sheetName}'!H1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [['Dompet']],
        },
      });
    }
  } catch (error: any) {
    // Jika sheet belum ada, buatkan sheet baru
    if (
      error?.message?.includes('Unable to parse range') ||
      error?.message?.includes('not found')
    ) {
      try {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [
              {
                addSheet: {
                  properties: { title: sheetName },
                },
              },
            ],
          },
        });
        // Tulis header
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `'${sheetName}'!A1:H1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [SHEET_COLUMNS],
          },
        });
        // Invalidate cache sheet list
        cachedSheetList = null;
      } catch (innerErr) {
        console.error(`Gagal membuat sheet baru '${sheetName}':`, innerErr);
        throw innerErr;
      }
    } else {
      throw error;
    }
  }
}

/**
 * Mengambil daftar seluruh buku/kegiatan yang ada di spreadsheet.
 * Mengabaikan tab internal (_Sessions) dan tab default kosong.
 */
export async function getAllSheetBooks(forceRefresh = false): Promise<string[]> {
  const now = Date.now();
  if (!forceRefresh && cachedSheetList && now - cachedSheetList.timestamp < CACHE_TTL_MS) {
    return cachedSheetList.list;
  }

  const auth = getGoogleAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = getSpreadsheetId();

  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetsList = meta.data.sheets || [];

  const validBooks: string[] = [];
  for (const s of sheetsList) {
    const title = s.properties?.title;
    if (!title) continue;
    // Abaikan sheet internal yang diawali underscore
    if (title.startsWith('_')) continue;
    if (title.toLowerCase() === 'sheet1') continue;
    if (
      title.toLowerCase() === 'anggota' ||
      title.toLowerCase() === 'kas_anggota' ||
      title.toLowerCase() === 'dashboard'
    )
      continue;
    validBooks.push(title);
  }

  // Pastikan Tabungan (DEFAULT_BOOK_NAME) ada dalam list
  const hasDefault = validBooks.some((b) => b.toLowerCase() === DEFAULT_BOOK_NAME.toLowerCase());
  if (!hasDefault) {
    validBooks.unshift(DEFAULT_BOOK_NAME);
  } else {
    // Taruh Tabungan di urutan pertama
    const defIdx = validBooks.findIndex((b) => b.toLowerCase() === DEFAULT_BOOK_NAME.toLowerCase());
    if (defIdx > 0) {
      const [item] = validBooks.splice(defIdx, 1);
      validBooks.unshift(item);
    }
  }

  cachedSheetList = { list: validBooks, timestamp: now };
  return validBooks;
}

/**
 * Membuat sheet buku/kegiatan baru jika belum ada.
 */
export async function createSheetBook(
  rawName: string
): Promise<{ created: boolean; bookName: string }> {
  const cleanName = sanitizeBookName(rawName);
  if (!cleanName) {
    throw new Error('Nama kegiatan tidak boleh kosong.');
  }

  const books = await getAllSheetBooks(true);
  const existing = books.find((b) => b.toLowerCase() === cleanName.toLowerCase());
  if (existing) {
    return { created: false, bookName: existing };
  }

  const auth = getGoogleAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = getSpreadsheetId();

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          addSheet: {
            properties: { title: cleanName },
          },
        },
      ],
    },
  });

  // Tulis header kolom
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${cleanName}'!A1:G1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [SHEET_COLUMNS],
    },
  });

  cachedSheetList = null;
  return { created: true, bookName: cleanName };
}

/**
 * Memastikan sheet _Sessions tersedia untuk menyimpan status buku aktif per pengguna
 */
async function ensureSessionSheet(): Promise<void> {
  const auth = getGoogleAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = getSpreadsheetId();

  try {
    await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${SESSION_SHEET_NAME}'!A1:C1`,
    });
  } catch (error: any) {
    if (
      error?.message?.includes('Unable to parse range') ||
      error?.message?.includes('not found')
    ) {
      try {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [
              {
                addSheet: {
                  properties: { title: SESSION_SHEET_NAME },
                },
              },
            ],
          },
        });
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `'${SESSION_SHEET_NAME}'!A1:C1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [['Chat ID', 'Active Book', 'Updated At']],
          },
        });
      } catch (e) {
        console.warn('Gagal membuat session sheet:', e);
      }
    }
  }
}

/**
 * Mengambil nama buku aktif untuk pengguna tertentu
 */
export async function getUserActiveBook(chatId: number | string): Promise<string> {
  const strId = String(chatId);
  if (activeBookCache.has(strId)) {
    return activeBookCache.get(strId)!;
  }

  try {
    await ensureSessionSheet();
    const auth = getGoogleAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = getSpreadsheetId();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${SESSION_SHEET_NAME}'!A2:B`,
    });

    const rows = res.data.values || [];
    for (const row of rows) {
      if (row[0] && String(row[0]).trim() === strId && row[1]) {
        const book = String(row[1]).trim();
        activeBookCache.set(strId, book);
        return book;
      }
    }
  } catch (err) {
    console.warn('Gagal membaca active book dari sheet, fallback default:', err);
  }

  activeBookCache.set(strId, DEFAULT_BOOK_NAME);
  return DEFAULT_BOOK_NAME;
}

/**
 * Mengubah nama buku aktif untuk pengguna tertentu
 */
export async function setUserActiveBook(
  chatId: number | string,
  bookName: string
): Promise<void> {
  const strId = String(chatId);
  activeBookCache.set(strId, bookName);

  // Simpan secara persisten ke sheet _Sessions
  try {
    await ensureSessionSheet();
    const auth = getGoogleAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = getSpreadsheetId();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${SESSION_SHEET_NAME}'!A2:C`,
    });

    const rows = res.data.values || [];
    let existingRowIndex = -1;

    for (let i = 0; i < rows.length; i++) {
      if (rows[i][0] && String(rows[i][0]).trim() === strId) {
        existingRowIndex = i + 2; // baris ke- (1-indexed + header)
        break;
      }
    }

    const nowJakarta = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      dateStyle: 'short',
      timeStyle: 'medium',
    }).format(new Date());

    if (existingRowIndex > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${SESSION_SHEET_NAME}'!B${existingRowIndex}:C${existingRowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[bookName, nowJakarta]],
        },
      });
    } else {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `'${SESSION_SHEET_NAME}'!A:C`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [[strId, bookName, nowJakarta]],
        },
      });
    }
  } catch (err) {
    console.error('Gagal menyimpan sesi aktif pengguna ke Google Sheet:', err);
  }
}

/**
 * Menambahkan data transaksi ke baris baru Google Sheets pada buku/halaman tertentu
 */
export async function appendTransaction(
  tx: ParsedTransaction,
  sheetName: string = DEFAULT_BOOK_NAME
): Promise<number | null> {
  await ensureHeaderRow(sheetName);

  const auth = getGoogleAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = getSpreadsheetId();

  const nowJakarta = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date());

  const formattedDate = tx.date.startsWith("'") ? tx.date : `'${tx.date}`;

  const defaultWallet = tx.wallet || (tx.type === 'Pemasukan' ? 'Bank' : 'Cash');

  const rowValues = [
    formattedDate,
    tx.type,
    tx.category,
    tx.amount,
    tx.description,
    tx.noteLink || '-',
    nowJakarta,
    defaultWallet,
  ];

  const res = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `'${sheetName}'!A:H`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [rowValues],
    },
  });

  const updatedRange = res.data.updates?.updatedRange;
  if (updatedRange) {
    const match = updatedRange.match(/!A(\d+)/);
    if (match) {
      return parseInt(match[1], 10);
    }
  }
  return null;
}

/**
 * Membantu normalisasi berbagai format tanggal ke YYYY-MM
 */
export function normalizeDateToYearMonth(val: any): string {
  if (!val) return '';
  const str = String(val).trim().replace(/^'/, '');

  if (/^\d{5}$/.test(str)) {
    const serial = parseInt(str, 10);
    const date = new Date((serial - 25569) * 86400 * 1000);
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }

  const ymd = str.match(/^(\d{4})[/-](\d{1,2})/);
  if (ymd) {
    return `${ymd[1]}-${ymd[2].padStart(2, '0')}`;
  }

  const dmy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, '0')}`;
  }

  return str;
}

/**
 * Memperbarui link foto nota di kolom F pada baris tertentu
 */
export async function updateTransactionNoteLink(
  rowNumber: number,
  noteLink: string,
  sheetName: string = DEFAULT_BOOK_NAME
): Promise<void> {
  const auth = getGoogleAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = getSpreadsheetId();

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${sheetName}'!F${rowNumber}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[noteLink]],
    },
  });
}

/**
 * Mengambil rekap transaksi untuk 1 buku/halaman tertentu
 */
export async function getMonthSummary(
  yearMonthPrefix?: string,
  customLabel?: string,
  sheetName: string = DEFAULT_BOOK_NAME
): Promise<SummaryReport & { bookName: string }> {
  await ensureHeaderRow(sheetName);

  const auth = getGoogleAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = getSpreadsheetId();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${sheetName}'!A2:H`,
  });

  const rows = res.data.values || [];
  let totalPengeluaran = 0;
  let totalPemasukan = 0;
  let count = 0;
  const categoryExpenses: Record<string, number> = {};
  const categoryIncome: Record<string, number> = {};
  const expenseDetails: ExpenseDetail[] = [];
  const incomeDetails: ExpenseDetail[] = [];
  const walletBalances: WalletBalances = {
    Bank: 0,
    'E-Wallet': 0,
    Cash: 0,
    total: 0,
  };

  const isAllTime = !yearMonthPrefix;

  for (const row of rows) {
    const [tglRaw, jenis, katRaw, nominalRaw, keteranganRaw, noteLinkRaw, , dompetRaw] = row;
    if (!tglRaw || !nominalRaw) continue;

    const cleanNominal =
      typeof nominalRaw === 'number'
        ? nominalRaw
        : parseFloat(String(nominalRaw).replace(/[^0-9.-]+/g, '')) || 0;

    const isPengeluaran = jenis?.toLowerCase().includes('pengeluaran');
    const isPemasukan = jenis?.toLowerCase().includes('pemasukan');
    const kategori = katRaw?.trim() || 'Lain-lain';
    const keterangan = keteranganRaw ? String(keteranganRaw).trim() : '';
    const noteLink = noteLinkRaw ? String(noteLinkRaw).trim() : '';
    let wallet = dompetRaw ? String(dompetRaw).trim() : (isPemasukan ? 'Bank' : 'Cash');
    if (!['Bank', 'E-Wallet', 'Cash'].includes(wallet)) {
      wallet = 'Bank';
    }
    const walletKey = wallet as 'Bank' | 'E-Wallet' | 'Cash';

    const cleanDate = String(tglRaw).trim().replace(/^'/, '');

    if (!isAllTime) {
      const ym = normalizeDateToYearMonth(cleanDate);
      if (ym !== yearMonthPrefix) {
        continue;
      }
    }

    if (isPengeluaran) {
      totalPengeluaran += cleanNominal;
      categoryExpenses[kategori] = (categoryExpenses[kategori] || 0) + cleanNominal;
      walletBalances[walletKey] -= cleanNominal;
      count++;
      expenseDetails.push({
        date: cleanDate,
        category: kategori,
        nominal: cleanNominal,
        description: keterangan,
        noteLink: noteLink && noteLink !== '-' ? noteLink : undefined,
        wallet,
      });
    } else if (isPemasukan) {
      totalPemasukan += cleanNominal;
      categoryIncome[kategori] = (categoryIncome[kategori] || 0) + cleanNominal;
      walletBalances[walletKey] += cleanNominal;
      count++;
      incomeDetails.push({
        date: cleanDate,
        category: kategori,
        nominal: cleanNominal,
        description: keterangan,
        noteLink: noteLink && noteLink !== '-' ? noteLink : undefined,
        wallet,
      });
    }
  }

  walletBalances.total = walletBalances.Bank + walletBalances['E-Wallet'] + walletBalances.Cash;

  const periodeLabel = isAllTime
    ? 'Semua Transaksi (Keseluruhan)'
    : customLabel || yearMonthPrefix || '';

  return {
    isAllTime,
    periodeLabel,
    totalPengeluaran,
    totalPemasukan,
    saldo: totalPemasukan - totalPengeluaran,
    count,
    categoryExpenses,
    categoryIncome,
    expenseDetails,
    incomeDetails,
    bookName: sheetName,
    walletBalances,
  };
}

/**
 * Mengambil rekap transaksi KESELURUHAN (Semua Tab / Kegiatan + Kas Utama)
 */
export async function getAllSheetsSummary(
  yearMonthPrefix?: string,
  customLabel?: string
): Promise<GlobalSummaryReport> {
  const books = await getAllSheetBooks();

  let totalPengeluaran = 0;
  let totalPemasukan = 0;
  let count = 0;
  const categoryExpenses: Record<string, number> = {};
  const categoryIncome: Record<string, number> = {};
  const booksSummary: BookSummary[] = [];

  const isAllTime = !yearMonthPrefix;

  for (const book of books) {
    try {
      const bSummary = await getMonthSummary(yearMonthPrefix, customLabel, book);

      booksSummary.push({
        bookName: book,
        totalPengeluaran: bSummary.totalPengeluaran,
        totalPemasukan: bSummary.totalPemasukan,
        saldo: bSummary.saldo,
        count: bSummary.count,
      });

      totalPengeluaran += bSummary.totalPengeluaran;
      totalPemasukan += bSummary.totalPemasukan;
      count += bSummary.count;

      for (const [cat, val] of Object.entries(bSummary.categoryExpenses)) {
        categoryExpenses[cat] = (categoryExpenses[cat] || 0) + val;
      }
      for (const [cat, val] of Object.entries(bSummary.categoryIncome)) {
        categoryIncome[cat] = (categoryIncome[cat] || 0) + val;
      }
    } catch (err) {
      console.warn(`Gagal membaca summary untuk sheet '${book}':`, err);
    }
  }

  const periodeLabel = isAllTime
    ? 'Semua Transaksi (Keseluruhan)'
    : customLabel || yearMonthPrefix || '';

  return {
    isAllTime,
    periodeLabel,
    totalPengeluaran,
    totalPemasukan,
    saldo: totalPemasukan - totalPengeluaran,
    count,
    categoryExpenses,
    categoryIncome,
    books: booksSummary,
  };
}

/**
 * Memindahkan saldo dari satu buku/kegiatan ke buku lainnya.
 * Mencatat 'Pengeluaran' pada buku asal dan 'Pemasukan' pada buku tujuan.
 */
export async function transferBookBalance(
  params: TransferBalanceParams
): Promise<TransferBalanceResult> {
  const cleanSource = sanitizeBookName(params.sourceBook);
  const cleanTarget = sanitizeBookName(params.targetBook);

  if (!cleanSource || !cleanTarget) {
    throw new Error('Nama buku asal dan buku tujuan tidak valid.');
  }

  if (cleanSource.toLowerCase() === cleanTarget.toLowerCase()) {
    throw new Error('Buku asal dan buku tujuan tidak boleh sama.');
  }

  const books = await getAllSheetBooks();
  const sourceExists = books.find((b) => b.toLowerCase() === cleanSource.toLowerCase());
  if (!sourceExists) {
    throw new Error(`Buku asal "${cleanSource}" tidak ditemukan.`);
  }

  const targetExists = books.find((b) => b.toLowerCase() === cleanTarget.toLowerCase());
  if (!targetExists) {
    throw new Error(`Buku tujuan "${cleanTarget}" tidak ditemukan.`);
  }

  if (params.amount <= 0) {
    throw new Error('Nominal pemindahan saldo harus lebih dari 0.');
  }

  const [sourceSummary, targetSummary] = await Promise.all([
    getMonthSummary(undefined, undefined, sourceExists),
    getMonthSummary(undefined, undefined, targetExists),
  ]);

  if (sourceSummary.saldo < params.amount) {
    throw new Error(
      `Saldo buku "${sourceExists}" tidak mencukupi. Sisa saldo saat ini: Rp ${sourceSummary.saldo.toLocaleString('id-ID')}, nominal yang ingin dipindah: Rp ${params.amount.toLocaleString('id-ID')}`
    );
  }

  const todayStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const sourceDesc = params.description
    ? `Pindah saldo ke ${targetExists} (${params.description})`
    : `Pindah saldo ke buku ${targetExists}`;

  const targetDesc = params.description
    ? `Pindah saldo dari ${sourceExists} (${params.description})`
    : `Pindah saldo dari buku ${sourceExists}`;

  // 1. Catat Pengeluaran di buku asal
  await appendTransaction(
    {
      date: todayStr,
      type: 'Pengeluaran',
      category: 'Pindah Saldo',
      amount: params.amount,
      description: sourceDesc,
    },
    sourceExists
  );

  // 2. Catat Pemasukan di buku tujuan
  await appendTransaction(
    {
      date: todayStr,
      type: 'Pemasukan',
      category: 'Pindah Saldo',
      amount: params.amount,
      description: targetDesc,
    },
    targetExists
  );

  return {
    success: true,
    sourceBook: sourceExists,
    targetBook: targetExists,
    amount: params.amount,
    sourceBalanceBefore: sourceSummary.saldo,
    sourceBalanceAfter: sourceSummary.saldo - params.amount,
    targetBalanceBefore: targetSummary.saldo,
    targetBalanceAfter: targetSummary.saldo + params.amount,
    date: todayStr,
  };
}

// In-memory cache untuk transaksi web (key: bookName, value: { data: WebFinanceData, timestamp: number })
const webFinanceCache = new Map<string, { data: WebFinanceData; timestamp: number }>();
const WEB_CACHE_TTL_MS = 20_000; // 20 detik

/**
 * Mengambil seluruh data transaksi dan agregasi statistik untuk ditampilkan di Website Dashboard Keuangan
 */
export async function getAllTransactionsForWeb(targetBook: string = 'Semua'): Promise<WebFinanceData> {
  const normalizedTarget = targetBook.trim().toLowerCase();
  const now = Date.now();
  const cacheKey = normalizedTarget;

  const cached = webFinanceCache.get(cacheKey);
  if (cached && now - cached.timestamp < WEB_CACHE_TTL_MS) {
    return cached.data;
  }

  const books = await getAllSheetBooks();
  const auth = getGoogleAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = getSpreadsheetId();

  const isAll = normalizedTarget === 'semua' || normalizedTarget === 'all' || normalizedTarget === '';

  const allBookPromises = books.map(async (book) => {
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `'${book}'!A2:H`,
      });
      return { book, rows: res.data.values || [] };
    } catch (e) {
      console.warn(`Gagal fetch transactions untuk web dari ${book}:`, e);
      return { book, rows: [] };
    }
  });

  const allBookResults = await Promise.all(allBookPromises);

  // Hitung saldo masing-masing pos buku untuk label tab web
  const bookBalances: Record<string, number> = {};
  for (const { book, rows } of allBookResults) {
    let inc = 0;
    let exp = 0;
    for (const r of rows) {
      const [tglRaw, jenisRaw, , nominalRaw] = r;
      if (!tglRaw || !nominalRaw) continue;
      const cleanNom =
        typeof nominalRaw === 'number'
          ? nominalRaw
          : parseFloat(String(nominalRaw).replace(/[^0-9.-]+/g, '')) || 0;
      if (cleanNom <= 0) continue;
      if (String(jenisRaw || '').toLowerCase().includes('pemasukan')) {
        inc += cleanNom;
      } else {
        exp += cleanNom;
      }
    }
    bookBalances[book] = inc - exp;
  }

  const results = isAll
    ? allBookResults
    : allBookResults.filter((b) => b.book.toLowerCase() === normalizedTarget);

  const allItems: WebTransactionItem[] = [];
  let totalPemasukan = 0;
  let totalPengeluaran = 0;
  const categoryExpenses: Record<string, number> = {};
  const categoryIncome: Record<string, number> = {};
  const walletBalances: WalletBalances = {
    Bank: 0,
    'E-Wallet': 0,
    Cash: 0,
    total: 0,
  };

  let globalId = 1;

  for (const { book, rows } of results) {
    for (let rIdx = 0; rIdx < rows.length; rIdx++) {
      const row = rows[rIdx];
      const [tglRaw, jenisRaw, katRaw, nominalRaw, keteranganRaw, noteLinkRaw, waktuRaw, dompetRaw] = row;
      if (!tglRaw || !nominalRaw) continue;

      const cleanNominal =
        typeof nominalRaw === 'number'
          ? nominalRaw
          : parseFloat(String(nominalRaw).replace(/[^0-9.-]+/g, '')) || 0;

      if (cleanNominal <= 0) continue;

      const jenis = String(jenisRaw || '').toLowerCase().includes('pemasukan')
        ? ('Pemasukan' as const)
        : ('Pengeluaran' as const);

      const kategori = katRaw ? String(katRaw).trim() : 'Lain-lain';
      const keterangan = keteranganRaw ? String(keteranganRaw).trim() : '';
      const cleanDate = String(tglRaw).trim().replace(/^'/, '');
      const noteLink = noteLinkRaw && String(noteLinkRaw).startsWith('http') ? String(noteLinkRaw).trim() : undefined;
      const inputTime = waktuRaw ? String(waktuRaw).trim() : undefined;
      let wallet = dompetRaw ? String(dompetRaw).trim() : (jenis === 'Pemasukan' ? 'Bank' : 'Cash');
      if (!['Bank', 'E-Wallet', 'Cash'].includes(wallet)) {
        wallet = 'Bank';
      }
      const walletKey = wallet as 'Bank' | 'E-Wallet' | 'Cash';

      // Ekstrak PIC jika ada di keterangan, e.g. (PIC: @username) atau (PIC: nama)
      let pic: string | undefined;
      const picMatch = keterangan.match(/[\(\[]\s*PIC\s*:\s*([^\]\)]+)[\)\]]/i);
      if (picMatch) {
        pic = picMatch[1].trim();
      }

      if (jenis === 'Pemasukan') {
        totalPemasukan += cleanNominal;
        categoryIncome[kategori] = (categoryIncome[kategori] || 0) + cleanNominal;
        walletBalances[walletKey] += cleanNominal;
      } else {
        totalPengeluaran += cleanNominal;
        categoryExpenses[kategori] = (categoryExpenses[kategori] || 0) + cleanNominal;
        walletBalances[walletKey] -= cleanNominal;
      }

      allItems.push({
        id: `${book}-${rIdx + 2}-${globalId++}`,
        book,
        date: cleanDate,
        type: jenis,
        category: kategori,
        amount: cleanNominal,
        description: keterangan,
        noteLink,
        pic,
        inputTime,
        wallet,
      });
    }
  }

  walletBalances.total = walletBalances.Bank + walletBalances['E-Wallet'] + walletBalances.Cash;

  // Urutkan transaksi dari tanggal terbaru ke terlama
  allItems.sort((a, b) => {
    return b.date.localeCompare(a.date);
  });

  const nowJakarta = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date());

  const monthlyComparison = buildMonthlyComparison(allItems);
  const activeBookForBudget = isAll ? DEFAULT_BOOK_NAME : (books.find((b) => b.toLowerCase() === normalizedTarget) || DEFAULT_BOOK_NAME);
  const budget = await getBudgetInfo(activeBookForBudget);

  const data: WebFinanceData = {
    books: ['Semua', ...books],
    activeBook: isAll ? 'Semua' : (books.find((b) => b.toLowerCase() === normalizedTarget) || 'Semua'),
    bookBalances,
    transactions: allItems,
    stats: {
      totalPemasukan,
      totalPengeluaran,
      saldo: totalPemasukan - totalPengeluaran,
      count: allItems.length,
      categoryExpenses,
      categoryIncome,
      walletBalances,
    },
    budget,
    monthlyComparison,
    lastUpdated: nowJakarta,
  };

  webFinanceCache.set(cacheKey, { data, timestamp: now });
  return data;
}

export interface RecentTransactionItem {
  rowNumber: number;
  date: string;
  type: string;
  category: string;
  amount: number;
  description: string;
  noteLink: string;
  hasPhoto: boolean;
  createdAt: string;
}

/**
 * Mengambil transaksi terbaru untuk mengecek status foto nota pada buku/sheet tertentu
 */
export async function getRecentTransactionsWithNotes(
  sheetName: string = DEFAULT_BOOK_NAME,
  limit: number = 8
): Promise<RecentTransactionItem[]> {
  await ensureHeaderRow(sheetName);

  const auth = getGoogleAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = getSpreadsheetId();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${sheetName}'!A2:G`,
  });

  const rows = res.data.values || [];
  const items: RecentTransactionItem[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const [tglRaw, jenisRaw, katRaw, nominalRaw, keteranganRaw, noteLinkRaw, waktuRaw] = row;
    if (!tglRaw && !nominalRaw) continue;

    const cleanNominal = typeof nominalRaw === 'number'
      ? nominalRaw
      : parseInt(String(nominalRaw || 0).replace(/[^0-9]/g, ''), 10) || 0;

    const link = String(noteLinkRaw || '').trim();
    const hasPhoto = link.startsWith('http://') || link.startsWith('https://');

    items.push({
      rowNumber: i + 2,
      date: String(tglRaw || '').replace(/^'/, ''),
      type: String(jenisRaw || ''),
      category: String(katRaw || ''),
      amount: cleanNominal,
      description: String(keteranganRaw || '-'),
      noteLink: link,
      hasPhoto,
      createdAt: String(waktuRaw || '-'),
    });
  }

  // Ambil transaksi paling baru (dari baris paling bawah)
  return items.slice(-limit).reverse();
}

/**
 * Mengambil detail 1 baris transaksi tertentu berdasarkan rowNumber
 */
export async function getTransactionByRow(
  sheetName: string = DEFAULT_BOOK_NAME,
  rowNumber: number
): Promise<RecentTransactionItem | null> {
  const auth = getGoogleAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = getSpreadsheetId();

  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${sheetName}'!A${rowNumber}:G${rowNumber}`,
    });

    const rows = res.data.values || [];
    if (rows.length === 0) return null;

    const [tglRaw, jenisRaw, katRaw, nominalRaw, keteranganRaw, noteLinkRaw, waktuRaw] = rows[0];
    const cleanNominal = typeof nominalRaw === 'number'
      ? nominalRaw
      : parseInt(String(nominalRaw || 0).replace(/[^0-9]/g, ''), 10) || 0;
    const link = String(noteLinkRaw || '').trim();

    return {
      rowNumber,
      date: String(tglRaw || '').replace(/^'/, ''),
      type: String(jenisRaw || ''),
      category: String(katRaw || ''),
      amount: cleanNominal,
      description: String(keteranganRaw || '-'),
      noteLink: link,
      hasPhoto: link.startsWith('http://') || link.startsWith('https://'),
      createdAt: String(waktuRaw || '-'),
    };
  } catch {
    return null;
  }
}

/**
 * Mencari baris transaksi di Google Sheets yang cocok dengan kriteria (tanpa foto atau berdasarkan nominal/keterangan)
 */
export async function findMatchingTransactionRow(
  sheetName: string = DEFAULT_BOOK_NAME,
  criteria: {
    amount?: number;
    description?: string;
    date?: string;
  }
): Promise<RecentTransactionItem | null> {
  await ensureHeaderRow(sheetName);

  const auth = getGoogleAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = getSpreadsheetId();

  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${sheetName}'!A2:G`,
    });

    const rows = res.data.values || [];
    if (rows.length === 0) return null;

    let candidateWithoutPhoto: RecentTransactionItem | null = null;
    let candidateAny: RecentTransactionItem | null = null;

    // Scan dari baris paling bawah (transaksi terbaru)
    for (let i = rows.length - 1; i >= 0; i--) {
      const row = rows[i];
      const [tglRaw, jenisRaw, katRaw, nominalRaw, keteranganRaw, noteLinkRaw, waktuRaw] = row;
      if (!tglRaw && !nominalRaw) continue;

      const cleanNominal = typeof nominalRaw === 'number'
        ? nominalRaw
        : parseInt(String(nominalRaw || 0).replace(/[^0-9]/g, ''), 10) || 0;

      const rowDesc = String(keteranganRaw || '').toLowerCase();
      const link = String(noteLinkRaw || '').trim();
      const hasPhoto = link.startsWith('http://') || link.startsWith('https://');

      // 1. Cek kecocokan nominal jika disediakan
      if (criteria.amount !== undefined && criteria.amount > 0) {
        if (cleanNominal !== criteria.amount) continue;
      }

      // 2. Cek kecocokan deskripsi jika ada
      if (criteria.description) {
        const critDesc = criteria.description.toLowerCase().trim();
        const cleanCrit = critDesc.replace(/\(pic:[^)]+\)/gi, '').trim();
        const cleanRow = rowDesc.replace(/\(pic:[^)]+\)/gi, '').trim();

        const words = cleanCrit.split(/\s+/).filter((w) => w.length > 2);
        const matchScore = words.filter((w) => cleanRow.includes(w)).length;

        if (words.length > 0 && matchScore === 0 && !cleanRow.includes(cleanCrit) && !cleanCrit.includes(cleanRow)) {
          continue;
        }
      }

      const item: RecentTransactionItem = {
        rowNumber: i + 2,
        date: String(tglRaw || '').replace(/^'/, ''),
        type: String(jenisRaw || ''),
        category: String(katRaw || ''),
        amount: cleanNominal,
        description: String(keteranganRaw || '-'),
        noteLink: link,
        hasPhoto,
        createdAt: String(waktuRaw || '-'),
      };

      // Prioritaskan transaksi yang belum memiliki foto
      if (!hasPhoto) {
        return item;
      }

      if (!candidateAny) {
        candidateAny = item;
      }
    }

    return candidateWithoutPhoto || candidateAny;
  } catch (err) {
    console.warn('Gagal mencari transaksi matching:', err);
    return null;
  }
}

/**
 * Mencari baris transaksi di semua buku/sheet jika tidak ditemukan di sheet utama
 */
export async function findMatchingTransactionRowAcrossBooks(
  primarySheet: string,
  criteria: {
    amount?: number;
    description?: string;
    date?: string;
  }
): Promise<{ item: RecentTransactionItem; bookName: string } | null> {
  // 1. Coba di primarySheet (buku aktif) terlebih dahulu
  const foundPrimary = await findMatchingTransactionRow(primarySheet, criteria);
  if (foundPrimary) {
    return { item: foundPrimary, bookName: primarySheet };
  }

  // 2. Jika tidak ditemukan, cari di semua sheet buku lainnya
  try {
    const allBooks = await getAllSheetBooks();
    for (const book of allBooks) {
      if (book.toLowerCase() === primarySheet.toLowerCase()) continue;
      const foundOther = await findMatchingTransactionRow(book, criteria);
      if (foundOther) {
        return { item: foundOther, bookName: book };
      }
    }
  } catch (err) {
    console.warn('Gagal mencari di sheet lain:', err);
  }

  return null;
}

/**
 * Memperbarui sumber dompet (Bank / E-Wallet / Cash) pada baris tertentu di Google Sheets
 */
export async function updateTransactionWallet(
  sheetName: string,
  rowIndex: number,
  wallet: string
): Promise<boolean> {
  const auth = getGoogleAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = getSpreadsheetId();

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${sheetName}'!H${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[wallet]],
    },
  });

  return true;
}

/**
 * Mengambil ringkasan saldo per dompet (Bank, E-Wallet, Cash)
 */
export async function getWalletBalances(sheetName: string = DEFAULT_BOOK_NAME): Promise<WalletBalances> {
  await ensureHeaderRow(sheetName);

  const auth = getGoogleAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = getSpreadsheetId();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${sheetName}'!A2:H`,
  });

  const rows = res.data.values || [];
  const balances: WalletBalances = {
    Bank: 0,
    'E-Wallet': 0,
    Cash: 0,
    total: 0,
  };

  for (const row of rows) {
    const [, jenisRaw, , nominalRaw, , , , dompetRaw] = row;
    if (!nominalRaw) continue;

    const nominal =
      typeof nominalRaw === 'number'
        ? nominalRaw
        : parseFloat(String(nominalRaw).replace(/[^0-9.-]+/g, '')) || 0;

    const isPengeluaran = jenisRaw?.toLowerCase().includes('pengeluaran');
    const isPemasukan = jenisRaw?.toLowerCase().includes('pemasukan');
    let wallet = dompetRaw ? String(dompetRaw).trim() : (isPemasukan ? 'Bank' : 'Cash');
    if (!['Bank', 'E-Wallet', 'Cash'].includes(wallet)) {
      wallet = 'Bank';
    }

    const key = wallet as 'Bank' | 'E-Wallet' | 'Cash';
    if (isPemasukan) {
      balances[key] += nominal;
    } else if (isPengeluaran) {
      balances[key] -= nominal;
    }
  }

  balances.total = balances.Bank + balances['E-Wallet'] + balances.Cash;
  return balances;
}

/**
 * Memindahkan uang antar dompet (Bank <-> E-Wallet <-> Cash)
 * Mencatat 1 Pengeluaran di dompet asal dan 1 Pemasukan di dompet tujuan.
 */
export async function transferWalletMoney(params: {
  bookName?: string;
  fromWallet: string;
  toWallet: string;
  amount: number;
  senderName: string;
}): Promise<{
  success: boolean;
  fromWallet: string;
  toWallet: string;
  amount: number;
  balances: WalletBalances;
}> {
  const sheetName = params.bookName || DEFAULT_BOOK_NAME;
  await ensureHeaderRow(sheetName);

  const cleanFrom = params.fromWallet.trim();
  const cleanTo = params.toWallet.trim();

  if (cleanFrom.toLowerCase() === cleanTo.toLowerCase()) {
    throw new Error('Dompet asal dan tujuan tidak boleh sama.');
  }
  if (params.amount <= 0) {
    throw new Error('Nominal pindah uang harus lebih dari Rp 0.');
  }

  const todayStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  // 1. Catat Pengeluaran dari Dompet Asal
  const outTx: ParsedTransaction = {
    type: 'Pengeluaran',
    amount: params.amount,
    category: 'Pindah Uang',
    description: `Pindah uang ke ${cleanTo} (PIC: ${params.senderName})`,
    date: todayStr,
    wallet: cleanFrom,
  };
  await appendTransaction(outTx, sheetName);

  // 2. Catat Pemasukan ke Dompet Tujuan
  const inTx: ParsedTransaction = {
    type: 'Pemasukan',
    amount: params.amount,
    category: 'Pindah Uang',
    description: `Terima pindah uang dari ${cleanFrom} (PIC: ${params.senderName})`,
    date: todayStr,
    wallet: cleanTo,
  };
  await appendTransaction(inTx, sheetName);

  const balances = await getWalletBalances(sheetName);

  return {
    success: true,
    fromWallet: cleanFrom,
    toWallet: cleanTo,
    amount: params.amount,
    balances,
  };
}






// ============================================================
// HELPER KOMPARASI BULANAN (MONTH-OVER-MONTH)
// ============================================================

function parseYearMonth(dateStr: string): { key: string; label: string } | null {
  if (!dateStr) return null;
  const cleaned = String(dateStr).trim().replace(/^'/, '');
  // Format YYYY-MM-DD
  const ymd = cleaned.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (ymd) {
    const y = ymd[1];
    const m = ymd[2].padStart(2, '0');
    const key = `${y}-${m}`;
    const dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
    const label = new Intl.DateTimeFormat('id-ID', { year: 'numeric', month: 'long' }).format(dateObj);
    return { key, label };
  }
  // Format DD-MM-YYYY
  const dmy = cleaned.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (dmy) {
    const y = dmy[3];
    const m = dmy[2].padStart(2, '0');
    const key = `${y}-${m}`;
    const dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
    const label = new Intl.DateTimeFormat('id-ID', { year: 'numeric', month: 'long' }).format(dateObj);
    return { key, label };
  }
  return null;
}

function buildMonthlyComparison(items: WebTransactionItem[]): MonthlyComparisonReport {
  const monthMap = new Map<string, { label: string; income: number; expense: number }>();

  for (const item of items) {
    const parsed = parseYearMonth(item.date);
    if (!parsed) continue;
    const existing = monthMap.get(parsed.key) || { label: parsed.label, income: 0, expense: 0 };
    if (item.type === 'Pemasukan') {
      existing.income += item.amount;
    } else {
      existing.expense += item.amount;
    }
    monthMap.set(parsed.key, existing);
  }

  const sortedKeys = Array.from(monthMap.keys()).sort();
  const months: MonthlyStatsItem[] = [];

  let highestIncomeMonth: { month: string; monthLabel: string; amount: number } | undefined;
  let highestExpenseMonth: { month: string; monthLabel: string; amount: number } | undefined;
  let lowestExpenseMonth: { month: string; monthLabel: string; amount: number } | undefined;

  let totalIncomeAll = 0;
  let totalExpenseAll = 0;

  for (let i = 0; i < sortedKeys.length; i++) {
    const key = sortedKeys[i];
    const data = monthMap.get(key)!;
    const balance = data.income - data.expense;

    totalIncomeAll += data.income;
    totalExpenseAll += data.expense;

    if (!highestIncomeMonth || data.income > highestIncomeMonth.amount) {
      if (data.income > 0) {
        highestIncomeMonth = { month: key, monthLabel: data.label, amount: data.income };
      }
    }

    if (!highestExpenseMonth || data.expense > highestExpenseMonth.amount) {
      if (data.expense > 0) {
        highestExpenseMonth = { month: key, monthLabel: data.label, amount: data.expense };
      }
    }

    if (data.expense > 0) {
      if (!lowestExpenseMonth || data.expense < lowestExpenseMonth.amount) {
        lowestExpenseMonth = { month: key, monthLabel: data.label, amount: data.expense };
      }
    }

    let expenseChangePercent: number | undefined;
    if (i > 0) {
      const prevExpense = monthMap.get(sortedKeys[i - 1])!.expense;
      if (prevExpense > 0) {
        expenseChangePercent = Math.round(((data.expense - prevExpense) / prevExpense) * 100);
      }
    }

    months.push({
      month: key,
      monthLabel: data.label,
      income: data.income,
      expense: data.expense,
      balance,
      expenseChangePercent,
    });
  }

  const averageMonthlyIncome = months.length > 0 ? Math.round(totalIncomeAll / months.length) : 0;
  const averageMonthlyExpense = months.length > 0 ? Math.round(totalExpenseAll / months.length) : 0;

  return {
    months: months.reverse(),
    highestIncomeMonth,
    highestExpenseMonth,
    lowestExpenseMonth,
    averageMonthlyIncome,
    averageMonthlyExpense,
  };
}

// ============================================================
// MANAJEMEN ANGGARAN & BUDGET BULANAN (_Budget)
// ============================================================

async function ensureBudgetSheet(sheets: any, spreadsheetId: string) {
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const exists = meta.data.sheets?.some(
      (s: any) => s.properties?.title?.toLowerCase() === BUDGET_SHEET_NAME.toLowerCase()
    );
    if (!exists) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: BUDGET_SHEET_NAME,
                  hidden: false,
                },
              },
            },
          ],
        },
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${BUDGET_SHEET_NAME}'!A1:D1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [['Buku', 'Bulan', 'Nominal', 'Diupdate']],
        },
      });
    }
  } catch (err) {
    console.warn('Gagal ensureBudgetSheet:', err);
  }
}

export async function setBookBudget(bookName: string, month: string, amount: number): Promise<void> {
  const auth = getGoogleAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = getSpreadsheetId();
  await ensureBudgetSheet(sheets, spreadsheetId);

  const cleanBook = sanitizeBookName(bookName) || DEFAULT_BOOK_NAME;
  const cleanMonth = month.trim();
  const nowJakarta = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date());

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${BUDGET_SHEET_NAME}'!A2:D`,
  });

  const rows = res.data.values || [];
  let foundRowIndex = -1;

  for (let i = 0; i < rows.length; i++) {
    const [b, m] = rows[i];
    if (
      String(b || '').trim().toLowerCase() === cleanBook.toLowerCase() &&
      String(m || '').trim().toLowerCase() === cleanMonth.toLowerCase()
    ) {
      foundRowIndex = i + 2;
      break;
    }
  }

  if (foundRowIndex > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${BUDGET_SHEET_NAME}'!C${foundRowIndex}:D${foundRowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[amount, nowJakarta]],
      },
    });
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${BUDGET_SHEET_NAME}'!A:D`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[cleanBook, cleanMonth, amount, nowJakarta]],
      },
    });
  }

  // Bersihkan cache web
  webFinanceCache.clear();
}

export async function getBookBudget(bookName: string, month: string): Promise<number | null> {
  const auth = getGoogleAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = getSpreadsheetId();
  await ensureBudgetSheet(sheets, spreadsheetId);

  const cleanBook = sanitizeBookName(bookName) || DEFAULT_BOOK_NAME;
  const cleanMonth = month.trim();

  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${BUDGET_SHEET_NAME}'!A2:C`,
    });
    const rows = res.data.values || [];
    let exactMatch: number | null = null;
    let defaultMatch: number | null = null;

    for (const row of rows) {
      const [b, m, nominal] = row;
      const bStr = String(b || '').trim().toLowerCase();
      const mStr = String(m || '').trim().toLowerCase();
      const num = parseFloat(String(nominal || '').replace(/[^0-9.-]+/g, '')) || 0;

      if (bStr === cleanBook.toLowerCase() && mStr === cleanMonth.toLowerCase()) {
        exactMatch = num;
        break;
      }
      if (bStr === cleanBook.toLowerCase() && mStr === 'default') {
        defaultMatch = num;
      }
    }

    return exactMatch !== null ? exactMatch : defaultMatch;
  } catch (err) {
    console.warn('Gagal getBookBudget:', err);
    return null;
  }
}

export async function getBudgetInfo(bookName: string, targetMonth?: string): Promise<BudgetInfo> {
  const d = new Date();
  const currentMonthKey = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
  }).format(d).slice(0, 7);

  const month = targetMonth || currentMonthKey;
  const [y, m] = month.split('-');
  const dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
  const monthLabel = new Intl.DateTimeFormat('id-ID', {
    year: 'numeric',
    month: 'long',
  }).format(dateObj);

  const cleanBook = sanitizeBookName(bookName) || DEFAULT_BOOK_NAME;
  const budgetAmount = (await getBookBudget(cleanBook, month)) || 0;

  const summary = await getMonthSummary(month, monthLabel, cleanBook);
  const spent = summary.totalPengeluaran;
  const remaining = budgetAmount - spent;
  const percentage = budgetAmount > 0 ? Math.round((spent / budgetAmount) * 100) : 0;

  let status: BudgetInfo['status'] = 'none';
  if (budgetAmount > 0) {
    if (percentage >= 100) {
      status = 'overbudget';
    } else if (percentage >= 80) {
      status = 'warning';
    } else if (percentage >= 50) {
      status = 'half';
    } else {
      status = 'safe';
    }
  }

  return {
    book: cleanBook,
    month,
    monthLabel,
    amount: budgetAmount,
    spent,
    remaining,
    percentage,
    status,
  };
}

export async function checkBudgetThresholdAlert(
  bookName: string,
  newExpenseAmount: number
): Promise<{
  alertType: 'half' | 'warning' | 'overbudget' | null;
  alertMessage: string | null;
  budgetInfo: BudgetInfo;
}> {
  const budgetInfo = await getBudgetInfo(bookName);
  if (!budgetInfo || budgetInfo.amount <= 0) {
    return { alertType: null, alertMessage: null, budgetInfo };
  }

  const previousSpent = budgetInfo.spent - newExpenseAmount;
  const prevPct = Math.round((previousSpent / budgetInfo.amount) * 100);
  const currPct = budgetInfo.percentage;

  let alertType: 'half' | 'warning' | 'overbudget' | null = null;
  let alertMessage: string | null = null;

  const formatRp = (num: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);

  if (currPct >= 100 && prevPct < 100) {
    alertType = 'overbudget';
    alertMessage =
      `🛑 *PERINGATAN: BUDGET BULAN INI HABIS / OVERBUDGET!*\n` +
      `Pengeluaran telah mencapai *${currPct}%* dari budget ${formatRp(budgetInfo.amount)}.\n` +
      `Total belanja bulan ini: *${formatRp(budgetInfo.spent)}* (Melebihi budget: ${formatRp(Math.abs(budgetInfo.remaining))})!`;
  } else if (currPct >= 80 && prevPct < 80) {
    alertType = 'warning';
    alertMessage =
      `🚨 *PERINGATAN: BUDGET HAMPIR HABIS (${currPct}%)!*\n` +
      `Pengeluaran bulan ini sudah mencapai *${currPct}%* dari budget ${formatRp(budgetInfo.amount)}.\n` +
      `Sisa budget yang aman digunakan tinggal *${formatRp(budgetInfo.remaining)}* lagi!`;
  } else if (currPct >= 50 && prevPct < 50) {
    alertType = 'half';
    alertMessage =
      `⚠️ *PERHATIAN: BUDGET SUDAH TERSERAP SETENGAH (50%)!*\n` +
      `Pengeluaran bulan ini telah mencapai *${currPct}%* dari budget ${formatRp(budgetInfo.amount)}.\n` +
      `Sisa budget tersedia: *${formatRp(budgetInfo.remaining)}*.`;
  }

  return { alertType, alertMessage, budgetInfo };
}
