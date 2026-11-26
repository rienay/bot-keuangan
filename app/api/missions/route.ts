import { NextResponse } from 'next/server';
import { getAllTransactionsForWeb } from '@/lib/googleSheets';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ── Definisi semua misi ──────────────────────────────────────────────────────
export interface Mission {
  id: string;
  title: string;
  desc: string;
  stiker: string; // filename stiker reward (.png transparan)
  stikerAlt: string;
  xp: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  quote: string;
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
  const settledDebtCount = debts.filter((d: any) => d.status === 'Lunas').length;

  // ─ Statistik tambahan untuk misi baru ─
  const totalIn = pemasukan.reduce((s, t) => s + t.amount, 0);
  const totalOut = pengeluaran.reduce((s, t) => s + t.amount, 0);
  const netBalance = txs.reduce((s, t) => s + (t.type === 'Pemasukan' ? t.amount : -t.amount), 0);
  const dayCounts = new Map<string, number>();
  txs.forEach((t) => { const k = String(t.date || '').slice(0, 10); if (k) dayCounts.set(k, (dayCounts.get(k) || 0) + 1); });
  const maxTxInOneDay = Math.max(0, ...Array.from(dayCounts.values()));
  const uniqueDays = dayCounts.size;
  const uniqueWallets = new Set(txs.map((t) => t.wallet || 'Cash')).size;
  const foodCount = pengeluaran.filter((t) => /makan|minum|konsumsi|resto|cafe|food|jajan|kopi/i.test(`${t.category} ${t.description}`)).length;
  const drinkCount = pengeluaran.filter((t) => /kopi|es|boba|minum|teh|matcha/i.test(`${t.category} ${t.description}`)).length;
  const hasGift = pengeluaran.some((t) => /hadiah|donasi|sedekah|amal|kado|kasih/i.test(`${t.category} ${t.description}`));
  const hasTransport = pengeluaran.some((t) => /transport|bensin|parkir|ojek|grab|gojek|kereta/i.test(`${t.category} ${t.description}`));
  const hasBill = pengeluaran.some((t) => /tagihan|listrik|wifi|pulsa|langganan|internet/i.test(`${t.category} ${t.description}`));
  const hasSelfCare = pengeluaran.some((t) => /didik|buku|kursus|kuliah|sekolah|cantik|skincare|salon|sehat|obat|dokter/i.test(`${t.category} ${t.description}`));
  const hasBigSpend = pengeluaran.some((t) => t.amount >= 500000);
  const hasSmallShop = pengeluaran.some((t) => /belanja|shopping|pasar|kebutuhan/i.test(t.category) && t.amount > 0 && t.amount < 50000);
  const hasEarlyBird = txs.some((t) => { const d = parseDate(t.date); return d && d.getDate() <= 5; });
  const hasWeekend = txs.some((t) => { const d = parseDate(t.date); return d && (d.getDay() === 0 || d.getDay() === 6); });
  const hasCash = txs.some((t) => /cash|tunai/i.test(t.wallet || 'Cash'));
  const hasDigital = txs.some((t) => !/cash|tunai/i.test(t.wallet || 'Cash'));

  const missions: Mission[] = [
    {
      id: 'first_tx',
      title: 'Langkah Pertama',
      desc: 'Catat transaksi pertamamu!',
      stiker: 'ha.png',
      stikerAlt: 'Kucing kaget kegirangan',
      xp: 10,
      rarity: 'common',
      quote: 'Haa?! Kamu baru mulai nyatet! Semangat!',
      unlocked: totalTx >= 1,
      progress: Math.min(100, totalTx * 100),
      progressLabel: `${Math.min(1, totalTx)}/1 transaksi`,
    },
    {
      id: 'five_tx',
      title: 'Rajin Mencatat',
      desc: 'Catat 5 transaksi. Konsisten itu kunci!',
      stiker: 'cling.png',
      stikerAlt: 'Kucing bersemangat',
      xp: 25,
      rarity: 'common',
      quote: 'Cling! Catatanmu makin rapi nih!',
      unlocked: totalTx >= 5,
      progress: Math.min(100, (totalTx / 5) * 100),
      progressLabel: `${Math.min(5, totalTx)}/5 transaksi`,
    },
    {
      id: 'twenty_tx',
      title: 'Jagoan Keuangan',
      desc: 'Sudah 20 transaksi tercatat. Luar biasa!',
      stiker: 'hah.png',
      stikerAlt: 'Kucing takjub',
      xp: 50,
      rarity: 'rare',
      quote: 'Hah? Udah 20 transaksi?! Keren banget!',
      unlocked: totalTx >= 20,
      progress: Math.min(100, (totalTx / 20) * 100),
      progressLabel: `${Math.min(20, totalTx)}/20 transaksi`,
    },
    {
      id: 'hemat_week',
      title: 'Minggu Hemat',
      desc: 'Pengeluaran minggu ini lebih sedikit dari minggu lalu!',
      stiker: 'yopyu.png',
      stikerAlt: 'Kucing pawing cantik',
      xp: 30,
      rarity: 'rare',
      quote: 'Yopyu! Kamu hemat banget minggu ini!',
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
      stiker: 'kuro.png',
      stikerAlt: 'Kucing croissant serius',
      xp: 20,
      rarity: 'common',
      quote: 'Fokus ke tujuan tabunganmu, jangan jajan mulu!',
      unlocked: hasGoal,
      progress: hasGoal ? 100 : 0,
      progressLabel: hasGoal ? 'Goal sudah ada!' : 'Belum ada goal',
    },
    {
      id: 'half_goal',
      title: 'Separuh Jalan',
      desc: 'Tabungan salah satu goalmu sudah 50%!',
      stiker: 'slurp.png',
      stikerAlt: 'Kucing slurp',
      xp: 40,
      rarity: 'rare',
      quote: 'Slurp~ setengah jalan lagi menuju goal!',
      unlocked: halfGoal || completedGoal,
      progress: halfGoal || completedGoal ? 100 : 0,
      progressLabel: completedGoal ? 'Goal tercapai!' : halfGoal ? '50% goal tercapai!' : 'Belum 50%',
    },
    {
      id: 'complete_goal',
      title: 'Goal Tercapai!',
      desc: 'Yeay! Salah satu tujuan tabunganmu berhasil!',
      stiker: 'emuch.png',
      stikerAlt: 'Kucing emush bahagia',
      xp: 100,
      rarity: 'legendary',
      quote: 'Emuch! Goal tercapai, saatnya rayakan!',
      unlocked: completedGoal,
      progress: completedGoal ? 100 : 0,
      progressLabel: completedGoal ? 'Selamat!' : 'Belum tercapai',
    },
    {
      id: 'streak_7',
      title: 'Konsisten 7 Hari',
      desc: 'Catat transaksi 7 hari berturut-turut.',
      stiker: 'slekedung.png',
      stikerAlt: 'Kucing cemberut tapi keren',
      xp: 60,
      rarity: 'epic',
      quote: '7 hari berturut-turut? Gokil disiplinmu!',
      unlocked: streak >= 7,
      progress: Math.min(100, (streak / 7) * 100),
      progressLabel: `${Math.min(7, streak)}/7 hari streak`,
    },
    {
      id: 'no_debt',
      title: 'Bebas Utang',
      desc: 'Semua utang/piutang sudah beres!',
      stiker: 'eumm.png',
      stikerAlt: 'Kucing manggut puas',
      xp: 45,
      rarity: 'rare',
      quote: 'Eumm, hidup tenang tanpa utang~',
      unlocked: noActiveDebt,
      progress: noActiveDebt ? 100 : 0,
      progressLabel: noActiveDebt ? 'Bebas utang!' : 'Masih ada utang aktif',
    },
    {
      id: 'has_income',
      title: 'Ada Pemasukan',
      desc: 'Catat pemasukan pertamamu. Rezeki harus dicatat!',
      stiker: 'apelo.png',
      stikerAlt: 'Kucing berdoa',
      xp: 15,
      rarity: 'common',
      quote: 'Semoga rezekinya makin lancar terus ya!',
      unlocked: pemasukan.length >= 1,
      progress: Math.min(100, pemasukan.length * 100),
      progressLabel: `${Math.min(1, pemasukan.length)}/1 pemasukan`,
    },
    {
      id: 'fifty_tx',
      title: 'Legend',
      desc: 'Wow! 50 transaksi? Kamu serius banget nih.',
      stiker: 'punanas.png',
      stikerAlt: 'Kucing bananas',
      xp: 150,
      rarity: 'legendary',
      quote: 'Kamu resmi jadi Legend Keuangan!',
      unlocked: totalTx >= 50,
      progress: Math.min(100, (totalTx / 50) * 100),
      progressLabel: `${Math.min(50, totalTx)}/50 transaksi`,
    },
    {
      id: 'transfer_done',
      title: 'Atur Dompet',
      desc: 'Lakukan transfer antar dompet atau pos pertamamu.',
      stiker: 'ikan.png',
      stikerAlt: 'Kucing ikan',
      xp: 20,
      rarity: 'common',
      quote: 'Saldo pindah rapi, dompet aman terkendali!',
      unlocked: txs.some((t) => isTransfer(t)),
      progress: txs.some((t) => isTransfer(t)) ? 100 : 0,
      progressLabel: txs.some((t) => isTransfer(t)) ? 'Transfer tercatat!' : 'Belum ada transfer',
    },
    {
      id: 'godong',
      title: 'Hemat Makan',
      desc: 'Transaksi kategori makanan kurang dari 10 kali bulan ini.',
      stiker: 'godong.png',
      stikerAlt: 'Kucing daun hijau',
      xp: 35,
      rarity: 'rare',
      quote: 'Makan secukupnya, dompet pun tersenyum!',
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
      stiker: 'ehem.png',
      stikerAlt: 'Kucing ngambek lucu',
      xp: 40,
      rarity: 'epic',
      quote: 'Ehem... tahan godaan jajan ya!',
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
      stiker: 'eak.png',
      stikerAlt: 'Kucing kaget panik',
      xp: 55,
      rarity: 'epic',
      quote: 'Eak! Tanggal tua tapi masih aman!',
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
      stiker: 'hemp.png',
      stikerAlt: 'Kucing tegas berbowo merah',
      xp: 70,
      rarity: 'epic',
      quote: 'Hemp! Budget aman, kamu hebat!',
      unlocked: false, // akan di-check dari bud data di page
      progress: 0,
      progressLabel: 'Cek di halaman budget',
    },
    {
      id: 'alamak',
      title: 'Alamak!',
      desc: 'Budget sudah terlampaui tapi kamu masih nyoba. Semangat!',
      stiker: 'alamak.png',
      stikerAlt: 'Kucing tomaat terbang',
      xp: 5,
      rarity: 'common',
      quote: 'Alamak! Rem dikit ya belanjanya!',
      unlocked: false,
      progress: 0,
      progressLabel: 'Semoga tidak terbuka ya!',
    },
    {
      id: 'money_wing',
      title: 'Sultan Bersayap',
      desc: 'Saldo total mencapai Rp 1.000.000 atau lebih!',
      stiker: 'money_cat.png',
      stikerAlt: 'Kucing uang bersayap',
      xp: 120,
      rarity: 'legendary',
      quote: 'Wuss! Uangnya jangan sampai terbang ya!',
      unlocked: netBalance >= 1000000,
      progress: Math.min(100, Math.max(0, Math.round((netBalance / 1000000) * 100))),
      progressLabel: netBalance >= 1000000 ? 'Saldo di atas 1jt!' : `Saldo ${Math.max(0, Math.round((netBalance / 1000000) * 100))}% menuju 1jt`,
    },
    {
      id: 'on_fire',
      title: 'On Fire!',
      desc: 'Catat minimal 3 transaksi dalam 1 hari.',
      stiker: 'fire_cat.png',
      stikerAlt: 'Kucing api membara',
      xp: 55,
      rarity: 'epic',
      quote: 'Semangat membara! Rajin banget nyatetnya!',
      unlocked: maxTxInOneDay >= 3,
      progress: Math.min(100, Math.round((maxTxInOneDay / 3) * 100)),
      progressLabel: `Maks ${Math.min(3, maxTxInOneDay)}/3 transaksi sehari`,
    },
    {
      id: 'cat_shark',
      title: 'Hiu Pemburu Hemat',
      desc: 'Belanja kebutuhan di bawah Rp 50.000.',
      stiker: 'cat_shark.png',
      stikerAlt: 'Kucing hiu',
      xp: 35,
      rarity: 'rare',
      quote: 'Hiu hemat siap berburu diskon!',
      unlocked: hasSmallShop,
      progress: hasSmallShop ? 100 : 0,
      progressLabel: hasSmallShop ? 'Belanja hemat tercatat!' : 'Belum ada belanja < 50rb',
    },
    {
      id: 'dimsum_cat',
      title: 'Pecinta Dimsum',
      desc: 'Catat 3 transaksi makanan atau jajan.',
      stiker: 'el_gato_dimsum.png',
      stikerAlt: 'Kucing dimsum',
      xp: 25,
      rarity: 'common',
      quote: 'Makan enak boleh, asal tetap dicatat!',
      unlocked: foodCount >= 3,
      progress: Math.min(100, Math.round((foodCount / 3) * 100)),
      progressLabel: `${Math.min(3, foodCount)}/3 transaksi makan`,
    },
    {
      id: 'love_cat',
      title: 'Si Paling Sayang',
      desc: 'Catat transaksi hadiah, kado, atau donasi.',
      stiker: 'love_cat.png',
      stikerAlt: 'Kucing imut bertopi beruang',
      xp: 40,
      rarity: 'rare',
      quote: 'Berbagi itu bikin hati adem!',
      unlocked: hasGift,
      progress: hasGift ? 100 : 0,
      progressLabel: hasGift ? 'Kebaikan tercatat!' : 'Belum ada catatan hadiah/donasi',
    },
    {
      id: 'cry_cat',
      title: 'Dompet Menjerit',
      desc: 'Ada satu pengeluaran minimal Rp 500.000.',
      stiker: 'cry_cat.png',
      stikerAlt: 'Kucing menangis',
      xp: 30,
      rarity: 'rare',
      quote: 'Huhu... semoga belinya barang penting ya!',
      unlocked: hasBigSpend,
      progress: hasBigSpend ? 100 : 0,
      progressLabel: hasBigSpend ? 'Pengeluaran besar tercatat' : 'Belum ada pengeluaran >= 500rb',
    },
    {
      id: 'banana_cat',
      title: 'Banana Cat',
      desc: 'Catat 10 transaksi total.',
      stiker: 'banana_cat.png',
      stikerAlt: 'Kucing pisang',
      xp: 30,
      rarity: 'common',
      quote: 'Hihi, udah 10 transaksi aja nih!',
      unlocked: totalTx >= 10,
      progress: Math.min(100, Math.round((totalTx / 10) * 100)),
      progressLabel: `${Math.min(10, totalTx)}/10 transaksi`,
    },
    {
      id: 'onion_ring',
      title: 'Camilan Santai',
      desc: 'Catat transaksi makanan/jajan pertamamu.',
      stiker: 'onion_ring_cat.png',
      stikerAlt: 'Kucing onion ring',
      xp: 15,
      rarity: 'common',
      quote: 'Ngemil dulu biar semangat kerja!',
      unlocked: foodCount >= 1,
      progress: Math.min(100, foodCount * 100),
      progressLabel: `${Math.min(1, foodCount)}/1 jajan tercatat`,
    },
    {
      id: 'meow_yellow',
      title: 'Surplus Ceria',
      desc: 'Total pemasukan lebih besar dari total pengeluaran.',
      stiker: 'meow_yellow.png',
      stikerAlt: 'Kucing kuning ceria',
      xp: 40,
      rarity: 'rare',
      quote: 'Meow! Pemasukan lebih besar dari pengeluaran!',
      unlocked: totalIn > totalOut && totalIn > 0,
      progress: totalIn > 0 ? (totalIn > totalOut ? 100 : Math.round((totalIn / Math.max(1, totalOut)) * 100)) : 0,
      progressLabel: totalIn > totalOut ? 'Cashflow positif!' : 'Kejar pemasukan > pengeluaran',
    },
    {
      id: 'grace_ivers',
      title: 'Multi Dompet',
      desc: 'Gunakan minimal 2 dompet berbeda.',
      stiker: 'grace_ivers.png',
      stikerAlt: 'Kucing manis elegan',
      xp: 25,
      rarity: 'common',
      quote: 'Pisah dompet bikin keuangan lebih rapi!',
      unlocked: uniqueWallets >= 2,
      progress: Math.min(100, Math.round((uniqueWallets / 2) * 100)),
      progressLabel: `${Math.min(2, uniqueWallets)}/2 dompet dipakai`,
    },
    {
      id: 'michi_awita',
      title: 'Ngopi Santai',
      desc: 'Catat transaksi kopi, es, boba, atau minuman.',
      stiker: 'michi_awita.png',
      stikerAlt: 'Kucing minum boba',
      xp: 20,
      rarity: 'common',
      quote: 'Sruput dulu~ tapi jangan tiap hari ya!',
      unlocked: drinkCount >= 1,
      progress: Math.min(100, drinkCount * 100),
      progressLabel: drinkCount >= 1 ? 'Minuman tercatat!' : 'Belum ada catatan minuman',
    },
    {
      id: 'early_bird',
      title: 'Early Bird',
      desc: 'Catat transaksi di tanggal 1–5 awal bulan.',
      stiker: 'dl_2.png',
      stikerAlt: 'Kucing awal bulan',
      xp: 20,
      rarity: 'common',
      quote: 'Awal bulan langsung sigap mencatat!',
      unlocked: hasEarlyBird,
      progress: hasEarlyBird ? 100 : 0,
      progressLabel: hasEarlyBird ? 'Aktif di awal bulan!' : 'Catat transaksi tgl 1–5',
    },
    {
      id: 'dl_3',
      title: 'Penjelajah Jalan',
      desc: 'Catat transaksi kategori Transport, Bensin, atau Ojek.',
      stiker: 'dl_3.png',
      stikerAlt: 'Kucing jalan-jalan',
      xp: 20,
      rarity: 'common',
      quote: 'Hati-hati di jalan ya!',
      unlocked: hasTransport,
      progress: hasTransport ? 100 : 0,
      progressLabel: hasTransport ? 'Transport tercatat!' : 'Belum ada transaksi transport',
    },
    {
      id: 'dl_4',
      title: 'Prajurit Tagihan',
      desc: 'Catat pembayaran Tagihan, Listrik, Wifi, atau Pulsa.',
      stiker: 'dl_4.png',
      stikerAlt: 'Kucing bayar tagihan',
      xp: 25,
      rarity: 'common',
      quote: 'Tagihan lunas, hidup pun tenang!',
      unlocked: hasBill,
      progress: hasBill ? 100 : 0,
      progressLabel: hasBill ? 'Tagihan tercatat!' : 'Belum ada catatan tagihan',
    },
    {
      id: 'dl_5',
      title: 'Investasi Diri',
      desc: 'Catat pengeluaran Kesehatan, Skincare, atau Pendidikan.',
      stiker: 'dl_5.png',
      stikerAlt: 'Kucing self care',
      xp: 35,
      rarity: 'rare',
      quote: 'Merawat diri itu investasi terbaik!',
      unlocked: hasSelfCare,
      progress: hasSelfCare ? 100 : 0,
      progressLabel: hasSelfCare ? 'Self-care tercatat!' : 'Belum ada transaksi kategori ini',
    },
    {
      id: 'dl_6',
      title: 'Kolektor Rezeki',
      desc: 'Catat minimal 3 kali pemasukan.',
      stiker: 'dl_6.png',
      stikerAlt: 'Kucing panen rezeki',
      xp: 45,
      rarity: 'rare',
      quote: 'Makin sering masuk, makin tebal tabungan!',
      unlocked: pemasukan.length >= 3,
      progress: Math.min(100, Math.round((pemasukan.length / 3) * 100)),
      progressLabel: `${Math.min(3, pemasukan.length)}/3 pemasukan`,
    },
    {
      id: 'dl_7',
      title: 'Dompet Tebal',
      desc: 'Total pemasukan mencapai Rp 5.000.000.',
      stiker: 'dl_7.png',
      stikerAlt: 'Kucing dompet tebal',
      xp: 80,
      rarity: 'epic',
      quote: 'Mantap! Pemasukan tembus 5 juta!',
      unlocked: totalIn >= 5000000,
      progress: Math.min(100, Math.round((totalIn / 5000000) * 100)),
      progressLabel: totalIn >= 5000000 ? '5jt tercapai!' : `${Math.round((totalIn / 5000000) * 100)}% menuju 5jt`,
    },
    {
      id: 'dl_8',
      title: 'Pencatat Setia',
      desc: 'Catat transaksi di minimal 5 hari yang berbeda.',
      stiker: 'dl_8.png',
      stikerAlt: 'Kucing setia',
      xp: 45,
      rarity: 'rare',
      quote: 'Kebiasaan baik dimulai dari 5 hari!',
      unlocked: uniqueDays >= 5,
      progress: Math.min(100, Math.round((uniqueDays / 5) * 100)),
      progressLabel: `${Math.min(5, uniqueDays)}/5 hari aktif`,
    },
    {
      id: 'dl_9',
      title: 'Master 35',
      desc: 'Sudah mencatat 35 transaksi total.',
      stiker: 'dl_9.png',
      stikerAlt: 'Kucing master',
      xp: 75,
      rarity: 'epic',
      quote: '35 transaksi! Kamu makin jago!',
      unlocked: totalTx >= 35,
      progress: Math.min(100, Math.round((totalTx / 35) * 100)),
      progressLabel: `${Math.min(35, totalTx)}/35 transaksi`,
    },
    {
      id: 'dl_10',
      title: 'Centurion 100',
      desc: 'Capai 100 transaksi tercatat!',
      stiker: 'dl_10.png',
      stikerAlt: 'Kucing centurion',
      xp: 200,
      rarity: 'legendary',
      quote: '100 transaksi! Kamu legenda sejati!',
      unlocked: totalTx >= 100,
      progress: Math.min(100, Math.round((totalTx / 100) * 100)),
      progressLabel: `${Math.min(100, totalTx)}/100 transaksi`,
    },
    {
      id: 'dl_11',
      title: 'Penabung Visioner',
      desc: 'Miliki minimal 2 tujuan tabungan (Goal).',
      stiker: 'dl_11.png',
      stikerAlt: 'Kucing visioner',
      xp: 45,
      rarity: 'rare',
      quote: 'Mimpi banyak, nabung juga kencang!',
      unlocked: goals.length >= 2,
      progress: Math.min(100, Math.round((goals.length / 2) * 100)),
      progressLabel: `${Math.min(2, goals.length)}/2 goal`,
    },
    {
      id: 'dl_12',
      title: 'Misi Akhir Pekan',
      desc: 'Catat transaksi di hari Sabtu atau Minggu.',
      stiker: 'dl_12.png',
      stikerAlt: 'Kucing weekend',
      xp: 20,
      rarity: 'common',
      quote: 'Weekend tetep rajin nyatet dong!',
      unlocked: hasWeekend,
      progress: hasWeekend ? 100 : 0,
      progressLabel: hasWeekend ? 'Weekend aktif!' : 'Catat di hari Sabtu/Minggu',
    },
    {
      id: 'dl_13',
      title: 'Raja Tunai',
      desc: 'Catat transaksi memakai dompet Cash / Tunai.',
      stiker: 'dl_13.png',
      stikerAlt: 'Kucing cash',
      xp: 15,
      rarity: 'common',
      quote: 'Uang tunai tetap terpantau!',
      unlocked: hasCash,
      progress: hasCash ? 100 : 0,
      progressLabel: hasCash ? 'Dompet Tunai dipakai' : 'Belum ada transaksi Tunai',
    },
    {
      id: 'dl_14',
      title: 'Anak Digital',
      desc: 'Catat transaksi memakai Bank atau E-Wallet.',
      stiker: 'dl_14.png',
      stikerAlt: 'Kucing digital',
      xp: 15,
      rarity: 'common',
      quote: 'Cashless lancar, catatan tetap aman!',
      unlocked: hasDigital,
      progress: hasDigital ? 100 : 0,
      progressLabel: hasDigital ? 'Dompet Digital dipakai' : 'Belum ada transaksi Bank/E-Wallet',
    },
    {
      id: 'dl_15',
      title: 'Pejuang Lunas',
      desc: 'Lunasi minimal 1 catatan utang atau piutang.',
      stiker: 'dl_15.png',
      stikerAlt: 'Kucing lega lunas',
      xp: 45,
      rarity: 'rare',
      quote: 'Plong banget rasanya kalau udah lunas!',
      unlocked: settledDebtCount >= 1,
      progress: settledDebtCount >= 1 ? 100 : 0,
      progressLabel: settledDebtCount >= 1 ? `${settledDebtCount} catatan lunas` : 'Belum ada yang dilunasi',
    },
    {
      id: 'dl_16',
      title: 'Bos Besar',
      desc: 'Saldo total mencapai Rp 5.000.000 atau lebih!',
      stiker: 'dl_16.png',
      stikerAlt: 'Kucing bos besar',
      xp: 180,
      rarity: 'legendary',
      quote: 'Salute! Saldo tembus 5 juta!',
      unlocked: netBalance >= 5000000,
      progress: Math.min(100, Math.max(0, Math.round((netBalance / 5000000) * 100))),
      progressLabel: netBalance >= 5000000 ? 'Bos Besar tercapai!' : `${Math.max(0, Math.round((netBalance / 5000000) * 100))}% menuju 5jt`,
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

    // Ambil data transaksi (mulai tahun 2026 ke atas)
    const data = await getAllTransactionsForWeb(book, false);
    const txs = (data.transactions ?? []).filter((t: any) => (parseDate(t.date)?.getFullYear() || 0) >= 2026);

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
      if (dJson.success) debts = (dJson.items ?? []).filter((d: any) => (parseDate(d.date)?.getFullYear() || 0) >= 2026);
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
