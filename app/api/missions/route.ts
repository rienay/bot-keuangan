import { NextResponse } from 'next/server';
import { getAllTransactionsForWeb } from '@/lib/googleSheets';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ── Definisi semua misi ──────────────────────────────────────────────────────
export interface Mission {
  id: string;
  title: string;
  desc: string;
  stiker: string; // filename stiker reward
  stikerAlt: string;
  xp: number;
  unlocked: boolean;
  progress?: number; // 0–100
  progressLabel?: string;
}

function computeMissions(txs: any[], goals: any[], debts: any[]): Mission[] {
  const totalTx = txs.filter((t) => !isTransfer(t)).length;
  const pengeluaran = txs.filter((t) => !isTransfer(t) && t.type === 'Pengeluaran');
  const pemasukan = txs.filter((t) => !isTransfer(t) && t.type === 'Pemasukan');

  // ─ Hitung streak harian ─
  const days = new Set<string>();
  txs.forEach((t) => { if (t.date) days.add(String(t.date).slice(0, 10)); });
  const sortedDays = Array.from(days).sort().reverse();
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < sortedDays.length; i++) {
    const d = new Date(sortedDays[i]);
    const diff = Math.round((today.getTime() - d.getTime()) / 864e5);
    if (diff === i || diff === i + 1) streak++;
    else break;
  }

  // ─ Pengeluaran minggu ini vs minggu lalu ─
  const now = new Date();
  const dow = (now.getDay() + 6) % 7;
  const startThisWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow).getTime();
  const startLastWeek = startThisWeek - 7 * 864e5;
  const spendThisWeek = pengeluaran.reduce((s, t) => {
    const d = parseDate(t.date)?.getTime() || 0;
    return d >= startThisWeek ? s + t.amount : s;
  }, 0);
  const spendLastWeekSameDay = pengeluaran.reduce((s, t) => {
    const d = parseDate(t.date)?.getTime() || 0;
    return d >= startLastWeek && d < startLastWeek + (dow + 1) * 864e5 ? s + t.amount : s;
  }, 0);

  // ─ Budget bulan ini ─
  // (tidak ada budget di sini, cek lewat totalTx saja)

  // ─ Goals ─
  const hasGoal = goals.length > 0;
  const halfGoal = goals.some((g: any) => g.saved >= g.target * 0.5 && g.saved < g.target);
  const completedGoal = goals.some((g: any) => g.saved >= g.target);

  // ─ Utang ─
  const noActiveDebt = debts.filter((d: any) => d.status === 'Belum Lunas').length === 0 && debts.length > 0;

  const missions: Mission[] = [
    {
      id: 'first_tx',
      title: 'Langkah Pertama',
      desc: 'Catat transaksi pertamamu!',
      stiker: 'ha.jpg',
      stikerAlt: 'Kucing kaget kegirangan',
      xp: 10,
      unlocked: totalTx >= 1,
      progress: Math.min(100, totalTx * 100),
      progressLabel: `${Math.min(1, totalTx)}/1 transaksi`,
    },
    {
      id: 'five_tx',
      title: 'Rajin Mencatat',
      desc: 'Catat 5 transaksi. Konsisten itu kunci!',
      stiker: 'cling.jpg',
      stikerAlt: 'Kucing bersemangat',
      xp: 25,
      unlocked: totalTx >= 5,
      progress: Math.min(100, (totalTx / 5) * 100),
      progressLabel: `${Math.min(5, totalTx)}/5 transaksi`,
    },
    {
      id: 'twenty_tx',
      title: 'Jagoan Keuangan',
      desc: 'Sudah 20 transaksi tercatat. Luar biasa!',
      stiker: 'hah.jpg',
      stikerAlt: 'Kucing takjub',
      xp: 50,
      unlocked: totalTx >= 20,
      progress: Math.min(100, (totalTx / 20) * 100),
      progressLabel: `${Math.min(20, totalTx)}/20 transaksi`,
    },
    {
      id: 'hemat_week',
      title: 'Minggu Hemat',
      desc: 'Pengeluaran minggu ini lebih sedikit dari minggu lalu!',
      stiker: 'yopyu.jpg',
      stikerAlt: 'Kucing pawing cantik',
      xp: 30,
      unlocked: spendLastWeekSameDay > 0 && spendThisWeek < spendLastWeekSameDay,
      progress: spendLastWeekSameDay > 0
        ? Math.min(100, Math.round((1 - spendThisWeek / spendLastWeekSameDay) * 100))
        : 0,
      progressLabel: spendLastWeekSameDay > 0
        ? spendThisWeek < spendLastWeekSameDay
          ? 'Hemat minggu ini!'
          : `Masih lebih boros ${Math.round(((spendThisWeek - spendLastWeekSameDay) / spendLastWeekSameDay) * 100)}%`
        : 'Belum ada data minggu lalu',
    },
    {
      id: 'first_goal',
      title: 'Punya Mimpi',
      desc: 'Buat tujuan tabungan pertamamu.',
      stiker: 'kuro.jpg',
      stikerAlt: 'Kucing croissant serius',
      xp: 20,
      unlocked: hasGoal,
      progress: hasGoal ? 100 : 0,
      progressLabel: hasGoal ? 'Goal sudah ada!' : 'Belum ada goal',
    },
    {
      id: 'half_goal',
      title: 'Separuh Jalan',
      desc: 'Tabungan salah satu goalmu sudah 50%!',
      stiker: 'slurp.jpg',
      stikerAlt: 'Kucing slurp',
      xp: 40,
      unlocked: halfGoal || completedGoal,
      progress: halfGoal || completedGoal ? 100 : 0,
      progressLabel: completedGoal ? 'Goal tercapai!' : halfGoal ? '50% goal tercapai!' : 'Belum 50%',
    },
    {
      id: 'complete_goal',
      title: 'Goal Tercapai!',
      desc: 'Yeay! Salah satu tujuan tabunganmu berhasil!',
      stiker: 'emuch.jpg',
      stikerAlt: 'Kucing emush bahagia',
      xp: 100,
      unlocked: completedGoal,
      progress: completedGoal ? 100 : 0,
      progressLabel: completedGoal ? 'Selamat!' : 'Belum tercapai',
    },
    {
      id: 'streak_7',
      title: 'Konsisten 7 Hari',
      desc: 'Catat transaksi 7 hari berturut-turut.',
      stiker: 'slekedung.jpg',
      stikerAlt: 'Kucing cemberut tapi keren',
      xp: 60,
      unlocked: streak >= 7,
      progress: Math.min(100, (streak / 7) * 100),
      progressLabel: `${Math.min(7, streak)}/7 hari streak`,
    },
    {
      id: 'no_debt',
      title: 'Bebas Utang',
      desc: 'Semua utang/piutang sudah beres!',
      stiker: 'eumm.jpg',
      stikerAlt: 'Kucing manggut puas',
      xp: 45,
      unlocked: noActiveDebt,
      progress: noActiveDebt ? 100 : 0,
      progressLabel: noActiveDebt ? 'Bebas utang!' : 'Masih ada utang aktif',
    },
    {
      id: 'has_income',
      title: 'Ada Pemasukan',
      desc: 'Catat pemasukan pertamamu. Rezeki harus dicatat!',
      stiker: 'apelo.jpg',
      stikerAlt: 'Kucing berdoa',
      xp: 15,
      unlocked: pemasukan.length >= 1,
      progress: Math.min(100, pemasukan.length * 100),
      progressLabel: `${Math.min(1, pemasukan.length)}/1 pemasukan`,
    },
    {
      id: 'fifty_tx',
      title: 'Legend',
      desc: 'Wow! 50 transaksi? Kamu serius banget nih.',
      stiker: 'punanas.jpg',
      stikerAlt: 'Kucing bananas',
      xp: 150,
      unlocked: totalTx >= 50,
      progress: Math.min(100, (totalTx / 50) * 100),
      progressLabel: `${Math.min(50, totalTx)}/50 transaksi`,
    },
    {
      id: 'transfer_done',
      title: 'Atur Dompet',
      desc: 'Lakukan transfer antar dompet atau pos pertamamu.',
      stiker: 'ikan.jpg',
      stikerAlt: 'Kucing ikan',
      xp: 20,
      unlocked: txs.some((t) => isTransfer(t)),
      progress: txs.some((t) => isTransfer(t)) ? 100 : 0,
      progressLabel: txs.some((t) => isTransfer(t)) ? 'Transfer tercatat!' : 'Belum ada transfer',
    },
    {
      id: 'godong',
      title: 'Hemat Makan',
      desc: 'Transaksi kategori makanan kurang dari 10 kali bulan ini.',
      stiker: 'godong.jpg',
      stikerAlt: 'Kucing daun hijau',
      xp: 35,
      unlocked: (() => {
        const n = new Date();
        const foodTx = pengeluaran.filter((t) => {
          const d = parseDate(t.date);
          return d && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear()
            && /makan|minum|konsumsi|resto|cafe|food|jajan|kopi/i.test(t.category);
        });
        return foodTx.length < 10 && foodTx.length > 0;
      })(),
      progress: (() => {
        const n = new Date();
        const count = pengeluaran.filter((t) => {
          const d = parseDate(t.date);
          return d && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear()
            && /makan|minum|konsumsi|resto|cafe|food|jajan|kopi/i.test(t.category);
        }).length;
        return count === 0 ? 0 : count < 10 ? 100 : Math.round(((10 - Math.min(count, 10)) / 10) * 100);
      })(),
      progressLabel: (() => {
        const n = new Date();
        const count = pengeluaran.filter((t) => {
          const d = parseDate(t.date);
          return d && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear()
            && /makan|minum|konsumsi|resto|cafe|food|jajan|kopi/i.test(t.category);
        }).length;
        return count === 0 ? 'Belum ada transaksi makan' : count < 10 ? `${count}x makan bulan ini - hemat!` : `${count}x makan, kurangi ya!`;
      })(),
    },
    {
      id: 'ehem',
      title: 'Anti Jajan',
      desc: 'Tidak ada pengeluaran hiburan bulan ini. Serius amat!',
      stiker: 'ehem.jpg',
      stikerAlt: 'Kucing ngambek lucu',
      xp: 40,
      unlocked: (() => {
        const n = new Date();
        return pengeluaran.filter((t) => {
          const d = parseDate(t.date);
          return d && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear()
            && /hiburan|date|nonton|kencan|wisata|liburan/i.test(t.category);
        }).length === 0 && totalTx >= 5;
      })(),
      progress: totalTx >= 5 ? 100 : Math.min(100, (totalTx / 5) * 100),
      progressLabel: 'Tidak jajan hiburan bulan ini',
    },
    {
      id: 'eak',
      title: 'Tanggal Tua Survive',
      desc: 'Masih punya saldo di atas 0 di akhir bulan.',
      stiker: 'eak.jpg',
      stikerAlt: 'Kucing kaget panik',
      xp: 55,
      unlocked: (() => {
        const n = new Date();
        const isLastWeek = n.getDate() >= 24;
        if (!isLastWeek) return false;
        let bal = 0;
        txs.forEach((t) => { bal += t.type === 'Pemasukan' ? t.amount : -t.amount; });
        return bal > 0;
      })(),
      progress: 0,
      progressLabel: new Date().getDate() >= 24 ? 'Tanggal tua, cek saldo!' : `Misi aktif di tanggal 24+`,
    },
    {
      id: 'hemp',
      title: 'Disiplin Budget',
      desc: 'Budget bulanan tidak terlampaui. Terkontrol banget!',
      stiker: 'hemp.jpg',
      stikerAlt: 'Kucing tegas berbowo merah',
      xp: 70,
      unlocked: false, // akan di-check dari bud data di page
      progress: 0,
      progressLabel: 'Cek di halaman budget',
    },
    {
      id: 'alamak',
      title: 'Alamak!',
      desc: 'Budget sudah terlampaui tapi kamu masih nyoba. Semangat!',
      stiker: 'alamak.jpg',
      stikerAlt: 'Kucing tomaat terbang',
      xp: 5,
      unlocked: false,
      progress: 0,
      progressLabel: 'Semoga tidak terbuka ya!',
    },
  ];

  return missions;
}

function isTransfer(t: any) {
  const s = `${t.category || ''} ${t.description || ''}`.toLowerCase();
  return !!t.isTransfer || /pindah uang|pindah saldo|transfer saldo/.test(s);
}

function parseDate(s: string): Date | null {
  const c = String(s || '').trim().replace(/^'/, '');
  let m = c.match(/^(\d{4})[-/.\s](\d{1,2})[-/.\s](\d{1,2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = c.match(/^(\d{1,2})[-/.\s](\d{1,2})[-/.\s](\d{4})/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  const d = new Date(c);
  return isNaN(d.getTime()) ? null : d;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const book = searchParams.get('book') || 'Tabungan';

    // Ambil data transaksi
    const data = await getAllTransactionsForWeb(book, false);
    const txs = data.transactions ?? [];

    // Ambil goals & debts dari API
    let goals: any[] = [];
    let debts: any[] = [];
    try {
      const baseUrl = new URL(request.url).origin;
      const [gRes, dRes] = await Promise.all([
        fetch(`${baseUrl}/api/goals?book=${encodeURIComponent(book)}`, { cache: 'no-store' }),
        fetch(`${baseUrl}/api/debts?book=${encodeURIComponent(book)}`, { cache: 'no-store' }),
      ]);
      const gJson = await gRes.json();
      const dJson = await dRes.json();
      if (gJson.success) goals = gJson.goals ?? [];
      if (dJson.success) debts = dJson.items ?? [];
    } catch { /* goals/debts opsional */ }

    const missions = computeMissions(txs, goals, debts);
    const unlocked = missions.filter((m) => m.unlocked);
    const totalXp = unlocked.reduce((s, m) => s + m.xp, 0);

    return NextResponse.json(
      { success: true, missions, totalXp, unlockedCount: unlocked.length },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal memuat misi' },
      { status: 500 }
    );
  }
}
