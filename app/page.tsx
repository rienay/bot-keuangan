'use client';

import { useState, useEffect, useMemo } from 'react';
import { WebFinanceData, WebTransactionItem } from '@/lib/types';

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatRupiahShort(val: number): string {
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs >= 1000000) {
    const jt = (abs / 1000000).toFixed(1).replace('.0', '');
    return `${sign}${jt}jt`;
  }
  if (abs >= 1000) {
    const rb = (abs / 1000).toFixed(0);
    return `${sign}${rb}rb`;
  }
  return `${sign}Rp ${abs}`;
}

function isTransferTx(tx: WebTransactionItem): boolean {
  if (tx.isTransfer) return true;
  const cat = (tx.category || '').toLowerCase();
  const desc = (tx.description || '').toLowerCase();
  return (
    cat.includes('pindah uang') ||
    cat.includes('pindah saldo') ||
    cat.includes('transfer saldo') ||
    desc.includes('pindah uang') ||
    desc.includes('terima pindah uang')
  );
}

function parseTxDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const cleaned = String(dateStr).trim().replace(/^'/, '');
  // Match YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD or YYYY MM DD
  const ymdMatch = cleaned.match(/^(\d{4})[-/.\s](\d{1,2})[-/.\s](\d{1,2})/);
  if (ymdMatch) {
    return new Date(parseInt(ymdMatch[1], 10), parseInt(ymdMatch[2], 10) - 1, parseInt(ymdMatch[3], 10));
  }
  // Match DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = cleaned.match(/^(\d{1,2})[-/.\s](\d{1,2})[-/.\s](\d{4})/);
  if (dmyMatch) {
    return new Date(parseInt(dmyMatch[3], 10), parseInt(dmyMatch[2], 10) - 1, parseInt(dmyMatch[1], 10));
  }
  const d = new Date(cleaned);
  return isNaN(d.getTime()) ? null : d;
}

// Generate smooth cubic Bézier SVG path from point array
function generateSmoothCurve(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? i : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

interface DayItem {
  idx: number;
  dayName: string;
  dayNameId: string;
  dateFormatted: string;
  isToday: boolean;
  isPastOrToday: boolean;
  income: number;
  expense: number;
  balance: number;
}

interface CategoryStyle {
  label: string;
  icon: string;
  bgColor: string;
  barColor: string;
  textColor: string;
}

function getCategoryConfig(categoryName: string, index: number = 0): CategoryStyle {
  const c = (categoryName || '').toLowerCase();
  
  const PALETTE = [
    { barColor: '#6366F1', bgColor: '#EEF2FF', textColor: '#4F46E5', icon: '🛍️' },
    { barColor: '#F97316', bgColor: '#FFF7ED', textColor: '#EA580C', icon: '🍽️' },
    { barColor: '#0EA5E9', bgColor: '#EFF6FF', textColor: '#0284C7', icon: '🚗' },
    { barColor: '#F59E0B', bgColor: '#FEF3C7', textColor: '#D97706', icon: '📄' },
    { barColor: '#10B981', bgColor: '#ECFDF5', textColor: '#059669', icon: '🍿' },
    { barColor: '#EC4899', bgColor: '#FDF2F8', textColor: '#DB2777', icon: '💖' },
    { barColor: '#8B5CF6', bgColor: '#F5F3FF', textColor: '#7C3AED', icon: '🎁' },
    { barColor: '#14B8A6', bgColor: '#F0FDFA', textColor: '#0D9488', icon: '💊' },
  ];

  if (c.includes('makan') || c.includes('minum') || c.includes('konsumsi') || c.includes('resto') || c.includes('cafe') || c.includes('food')) {
    return { label: categoryName || 'Makanan & Minuman', icon: '🍽️', bgColor: '#FFF7ED', barColor: '#F97316', textColor: '#EA580C' };
  }
  if (c.includes('belanja') || c.includes('shopping') || c.includes('pasar') || c.includes('supermarket') || c.includes('baju')) {
    return { label: categoryName || 'Belanja', icon: '🛍️', bgColor: '#EEF2FF', barColor: '#6366F1', textColor: '#4F46E5' };
  }
  if (c.includes('transport') || c.includes('bensin') || c.includes('parkir') || c.includes('ojek') || c.includes('grab') || c.includes('gojek')) {
    return { label: categoryName || 'Transportasi', icon: '🚗', bgColor: '#EFF6FF', barColor: '#0EA5E9', textColor: '#0284C7' };
  }
  if (c.includes('tagihan') || c.includes('listrik') || c.includes('wifi') || c.includes('pulsa') || c.includes('bill') || c.includes('langganan')) {
    return { label: categoryName || 'Tagihan & Utilitas', icon: '📄', bgColor: '#FEF3C7', barColor: '#F59E0B', textColor: '#D97706' };
  }
  if (c.includes('hiburan') || c.includes('date') || c.includes('ngedate') || c.includes('nonton') || c.includes('entertainment') || c.includes('kencan')) {
    return { label: categoryName || 'Hiburan & Kencan', icon: '🍿', bgColor: '#ECFDF5', barColor: '#10B981', textColor: '#059669' };
  }
  if (c.includes('sehat') || c.includes('obat') || c.includes('dokter') || c.includes('apotek')) {
    return { label: categoryName || 'Kesehatan', icon: '💊', bgColor: '#F0FDFA', barColor: '#14B8A6', textColor: '#0D9488' };
  }
  if (c.includes('didik') || c.includes('buku') || c.includes('kursus')) {
    return { label: categoryName || 'Edukasi', icon: '📚', bgColor: '#F5F3FF', barColor: '#8B5CF6', textColor: '#7C3AED' };
  }

  const fallback = PALETTE[index % PALETTE.length];
  return {
    label: categoryName || 'Lain-lain',
    icon: fallback.icon,
    bgColor: fallback.bgColor,
    barColor: fallback.barColor,
    textColor: fallback.textColor,
  };
}

const MONTH_NAMES_ID = [
  { num: '01', short: 'Jan', full: 'Januari' },
  { num: '02', short: 'Feb', full: 'Februari' },
  { num: '03', short: 'Mar', full: 'Maret' },
  { num: '04', short: 'Apr', full: 'April' },
  { num: '05', short: 'Mei', full: 'Mei' },
  { num: '06', short: 'Jun', full: 'Juni' },
  { num: '07', short: 'Jul', full: 'Juli' },
  { num: '08', short: 'Agu', full: 'Agustus' },
  { num: '09', short: 'Sep', full: 'September' },
  { num: '10', short: 'Okt', full: 'Oktober' },
  { num: '11', short: 'Nov', full: 'November' },
  { num: '12', short: 'Des', full: 'Desember' },
];

export default function FinanceDashboardPage() {
  const [data, setData] = useState<WebFinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBook, setSelectedBook] = useState<string>('Tabungan');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // State untuk form edit budget bulanan & harian
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const [isSavingBudget, setIsSavingBudget] = useState(false);
  const [budgetViewMode, setBudgetViewMode] = useState<'monthly' | 'daily'>('monthly');
  const [budgetEditType, setBudgetEditType] = useState<'monthly' | 'daily'>('monthly');

  // Active hover slice state for interactive Donut Chart
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // State untuk Treking Harian (Default ke Pengeluaran Harian)
  const [dailyChartMode, setDailyChartMode] = useState<'balance' | 'spent'>('spent');
  const [hoveredDayIdx, setHoveredDayIdx] = useState<number | null>(null);

  // Filter range bulan untuk Bar Chart (default 6 bulan agar rapi di HP)
  const [barChartRange, setBarChartRange] = useState<'6' | '12' | 'all'>('6');
  // Filter bulan spesifik 1 - 12 (default 'all')
  const [selectedMonthPill, setSelectedMonthPill] = useState<string>('all');
  // State untuk expand/collapse kategori (default tampilkan 5 teratas agar tidak memanjang)
  const [showAllCategories, setShowAllCategories] = useState(false);
  // Filter Tahun Transaksi (default tahun aktif 2026 agar tidak menumpuk semua tahun)
  const [selectedYear, setSelectedYear] = useState<string>('2026');

  const fetchData = async (book: string = 'Tabungan', showRefreshSpinner = false) => {
    if (showRefreshSpinner) setIsRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const url = `/api/finances?book=${encodeURIComponent(book)}&_t=${Date.now()}${showRefreshSpinner ? '&force=true' : ''}`;
      const res = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      } else {
        throw new Error(json.error || 'Gagal memuat data keuangan');
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Terjadi gangguan saat memuat data.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const b = params.get('buku') || params.get('book');
      if (b) {
        setSelectedBook(b);
        try {
          localStorage.setItem('last_active_book', b);
        } catch (_) {}
      } else {
        try {
          const saved = localStorage.getItem('last_active_book');
          if (saved) {
            setSelectedBook(saved);
          }
        } catch (_) {}
      }
    }
  }, []);

  useEffect(() => {
    fetchData(selectedBook);
  }, [selectedBook]);

  const handleSaveBudget = async () => {
    const num = parseFloat(budgetInput.replace(/[^0-9]/g, ''));
    if (isNaN(num) || num < 0) return;
    setIsSavingBudget(true);
    try {
      const targetBook = selectedBook === 'Semua' ? 'Tabungan' : selectedBook;
      const res = await fetch('/api/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ book: targetBook, amount: num, type: budgetEditType }),
      });
      const json = await res.json();
      if (json.success) {
        setIsEditingBudget(false);
        fetchData(selectedBook, true);
      } else {
        alert(json.error || 'Gagal menyimpan budget');
      }
    } catch (err: any) {
      alert(err.message || 'Error saat menyimpan budget');
    } finally {
      setIsSavingBudget(false);
    }
  };

  // Daftar tahun yang tersedia dari data transaksi
  const availableYears = useMemo(() => {
    if (!data?.transactions || data.transactions.length === 0) {
      return ['2026', '2025', '2024'];
    }
    const set = new Set<string>();
    data.transactions.forEach((tx) => {
      const d = parseTxDate(tx.date);
      if (d) set.add(d.getFullYear().toString());
    });
    const list = Array.from(set).sort((a, b) => b.localeCompare(a));
    return list.length > 0 ? list : ['2026'];
  }, [data?.transactions]);

  // Transaksi yang difilter berdasarkan tahun
  const filteredTransactions = useMemo(() => {
    if (!data?.transactions) return [];
    if (selectedYear === 'Semua') return data.transactions;
    return data.transactions.filter((tx) => {
      const d = parseTxDate(tx.date);
      return d && d.getFullYear().toString() === selectedYear;
    });
  }, [data?.transactions, selectedYear]);

  // Statistik KPI berdasarkan tahun yang dipilih
  const yearStats = useMemo(() => {
    if (selectedYear === 'Semua') {
      return {
        totalPemasukan: data?.stats?.totalPemasukan || 0,
        totalPengeluaran: data?.stats?.totalPengeluaran || 0,
        saldo: data?.stats?.saldo || 0,
        count: data?.stats?.count || 0,
      };
    }
    let inc = 0;
    let exp = 0;
    filteredTransactions.forEach((tx) => {
      if (isTransferTx(tx)) return;
      if (tx.type === 'Pemasukan') inc += tx.amount;
      else exp += tx.amount;
    });
    return {
      totalPemasukan: inc,
      totalPengeluaran: exp,
      saldo: inc - exp,
      count: filteredTransactions.length,
    };
  }, [filteredTransactions, data?.stats, selectedYear]);

  // Alokasi Dompet (Bank, E-Wallet, Cash) yang difilter sesuai tahun yang dipilih
  const filteredWalletBalances = useMemo(() => {
    const balances = {
      Bank: 0,
      'E-Wallet': 0,
      Cash: 0,
      total: 0,
      details: {} as Record<string, number>,
    };

    filteredTransactions.forEach((tx) => {
      const wStr = (tx.wallet || '').toLowerCase();
      const isBank = wStr.includes('bank');
      const isEwallet =
        wStr.includes('wallet') ||
        wStr.includes('e-wallet') ||
        wStr.includes('dana') ||
        wStr.includes('gopay') ||
        wStr.includes('ovo') ||
        wStr.includes('shopeepay');
      const isCash = wStr.includes('cash') || wStr.includes('tunai');

      const change = tx.type === 'Pemasukan' ? tx.amount : -tx.amount;

      if (isBank) {
        balances.Bank += change;
      } else if (isEwallet) {
        balances['E-Wallet'] += change;
      } else if (isCash) {
        balances.Cash += change;
      } else {
        balances.Cash += change;
      }

      if (tx.wallet) {
        balances.details[tx.wallet] = (balances.details[tx.wallet] || 0) + change;
      }
    });

    balances.total = balances.Bank + balances['E-Wallet'] + balances.Cash;
    return balances;
  }, [filteredTransactions]);

  // 1. DATA TREKING HARIAN (Senin s/d Minggu, mencocokkan saldo kas sesuai tahun aktif)
  const dailyTracking = useMemo(() => {
    const now = new Date();
    const currentDayOfWeek = (now.getDay() + 6) % 7; // 0 = Mon, 1 = Tue, ..., 3 = Thu, ..., 6 = Sun

    // Tentukan hari Senin di minggu berjalan
    const monday = new Date(now);
    monday.setDate(now.getDate() - currentDayOfWeek);
    monday.setHours(0, 0, 0, 0);

    const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const DAY_LABELS_ID = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

    const activeTx = filteredTransactions.filter((tx) => !isTransferTx(tx));

    // Hitung saldo awal sebelum Senin minggu ini dalam tahun yang dipilih
    let baselineBalance = 0;
    activeTx.forEach((tx) => {
      const d = parseTxDate(tx.date);
      if (d && d < monday) {
        if (tx.type === 'Pemasukan') baselineBalance += tx.amount;
        else baselineBalance -= tx.amount;
      }
    });

    let runningBal = baselineBalance;
    const days: DayItem[] = [];

    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(monday);
      dayDate.setDate(monday.getDate() + i);

      let income = 0;
      let expense = 0;

      activeTx.forEach((tx) => {
        const d = parseTxDate(tx.date);
        if (
          d &&
          d.getFullYear() === dayDate.getFullYear() &&
          d.getMonth() === dayDate.getMonth() &&
          d.getDate() === dayDate.getDate()
        ) {
          if (tx.type === 'Pemasukan') income += tx.amount;
          else expense += tx.amount;
        }
      });

      if (i <= currentDayOfWeek) {
        runningBal += (income - expense);
      }

      days.push({
        idx: i,
        dayName: DAY_LABELS[i],
        dayNameId: DAY_LABELS_ID[i],
        dateFormatted: `${dayDate.getDate()} ${['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][dayDate.getMonth()]}`,
        isToday: i === currentDayOfWeek,
        isPastOrToday: i <= currentDayOfWeek,
        income,
        expense,
        balance: runningBal,
      });
    }

    // Hitung koordinat SVG untuk 7 titik (ViewBox: 540 x 140)
    const SVG_W = 540;
    const SVG_H = 140;
    const PAD_X = 40;
    const PAD_Y_TOP = 30;
    const PAD_Y_BOTTOM = 25;

    const values = days.map((d) => (dailyChartMode === 'balance' ? d.balance : d.expense));
    const activeValues = days.filter((d) => d.isPastOrToday).map((d) => (dailyChartMode === 'balance' ? d.balance : d.expense));
    const minVal = dailyChartMode === 'spent' ? 0 : Math.min(...(activeValues.length > 0 ? activeValues : [0]));
    const maxVal = Math.max(dailyChartMode === 'spent' ? 40000 : 100000, ...(activeValues.length > 0 ? activeValues : [40000]));
    const range = maxVal - minVal || 1;

    const points = days.map((d, i) => {
      const x = PAD_X + i * ((SVG_W - PAD_X * 2) / 6);
      let y: number;
      if (d.isPastOrToday) {
        const val = dailyChartMode === 'balance' ? d.balance : d.expense;
        y = (SVG_H - PAD_Y_BOTTOM) - ((val - minVal) / range) * (SVG_H - PAD_Y_TOP - PAD_Y_BOTTOM);
      } else {
        // Future projected day (melandai turun perlahan seperti di referensi)
        const lastKnownVal = dailyChartMode === 'balance' ? days[currentDayOfWeek].balance : days[currentDayOfWeek].expense;
        const lastKnownY = (SVG_H - PAD_Y_BOTTOM) - ((lastKnownVal - minVal) / range) * (SVG_H - PAD_Y_TOP - PAD_Y_BOTTOM);
        y = lastKnownY + (i - currentDayOfWeek) * 6;
      }
      return { x, y: Math.max(PAD_Y_TOP, Math.min(SVG_H - PAD_Y_BOTTOM, y)) };
    });

    // Spline curve up to today (Hijau/Indigo tebal & area fill)
    const pointsUpToToday = points.slice(0, currentDayOfWeek + 1);
    const curvePast = generateSmoothCurve(pointsUpToToday);

    // Spline curve after today (Garis abu-abu projected)
    const pointsFuture = points.slice(currentDayOfWeek);
    const curveFuture = generateSmoothCurve(pointsFuture);

    // Area fill path up to today
    const areaPath = pointsUpToToday.length > 1
      ? `${curvePast} L ${pointsUpToToday[pointsUpToToday.length - 1].x} ${SVG_H} L ${pointsUpToToday[0].x} ${SVG_H} Z`
      : '';

    return {
      days,
      currentDayOfWeek,
      points,
      curvePast,
      curveFuture,
      areaPath,
      currentBalance: runningBal,
      totalSpentThisWeek: days.filter((d) => d.isPastOrToday).reduce((acc, d) => acc + d.expense, 0),
    };
  }, [data?.transactions, dailyChartMode]);

  // Active highlighted day
  const activeDayIdx = hoveredDayIdx !== null ? hoveredDayIdx : dailyTracking.currentDayOfWeek;
  const activeDayData = dailyTracking.days[activeDayIdx] || dailyTracking.days[0];
  const activeDayPoint = dailyTracking.points[activeDayIdx] || { x: 40, y: 70 };

  // 2. Kategori pengeluaran sorted descending untuk Donut Chart (sesuai tahun aktif)
  const categoryExpensesList = useMemo(() => {
    if (filteredTransactions.length === 0) return [];
    const catMap: Record<string, number> = {};
    let totalExp = 0;
    filteredTransactions.forEach((tx) => {
      if (isTransferTx(tx)) return;
      if (tx.type === 'Pengeluaran') {
        catMap[tx.category] = (catMap[tx.category] || 0) + tx.amount;
        totalExp += tx.amount;
      }
    });
    const expTotal = totalExp || 1;
    return Object.entries(catMap)
      .map(([name, amount], idx) => {
        const pct = Math.min(100, Math.round((amount / expTotal) * 100));
        return {
          name,
          amount,
          percentage: pct,
          config: getCategoryConfig(name, idx),
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [filteredTransactions]);

  // Kalkulasi data SVG Donut Chart (Radius = 65, Circumference ~ 408.4)
  const donutData = useMemo(() => {
    const R = 65;
    const C = 2 * Math.PI * R;
    const total = categoryExpensesList.reduce((acc, c) => acc + c.amount, 0);

    if (total <= 0 || categoryExpensesList.length === 0) {
      return { segments: [], total, C, R };
    }

    let accumulatedPct = 0;
    const segments = categoryExpensesList.map((item) => {
      const strokeDasharray = `${(item.percentage / 100) * C} ${C}`;
      const strokeDashoffset = -((accumulatedPct / 100) * C);
      accumulatedPct += item.percentage;
      return {
        ...item,
        strokeDasharray,
        strokeDashoffset,
      };
    });

    return { segments, total, C, R };
  }, [categoryExpensesList]);

  // 3. Rincian Arus Kas Bulanan (Tampilan List Vertikal dengan Filter Bulan 1 - 12)
  const cashflowBarData = useMemo(() => {
    if (!data?.monthlyComparison?.months || data.monthlyComparison.months.length === 0) {
      return [];
    }

    let months = data.monthlyComparison.months;
    if (selectedYear !== 'Semua') {
      months = months.filter((m) => m.month.startsWith(`${selectedYear}-`));
    }

    if (selectedMonthPill !== 'all') {
      months = months.filter((m) => m.month.endsWith(`-${selectedMonthPill}`));
    } else {
      if (barChartRange === '6') {
        months = months.slice(-6);
      } else if (barChartRange === '12') {
        months = months.slice(-12);
      }
    }

    if (months.length === 0) {
      return [];
    }

    // Urutkan bulan terbaru di paling atas
    return months.slice().reverse();
  }, [data?.monthlyComparison?.months, selectedYear, selectedMonthPill, barChartRange]);

  // 4. Perbandingan Pengeluaran 12 Bulan (Januari - Desember) untuk Tahun Terpilih
  const annualMonthlyComparison = useMemo(() => {
    const targetYr = selectedYear === 'Semua' ? '2026' : selectedYear;
    const monthsData: {
      monthKey: string;
      monthNum: string;
      monthName: string;
      expense: number;
      income: number;
      txCount: number;
    }[] = [];

    const txList = (data?.transactions || []).filter((tx) => !isTransferTx(tx));

    for (let i = 1; i <= 12; i++) {
      const monthNum = String(i).padStart(2, '0');
      const monthKey = `${targetYr}-${monthNum}`;
      const monthName = MONTH_NAMES_ID[i - 1].full;

      let expense = 0;
      let income = 0;
      let txCount = 0;

      for (const tx of txList) {
        if (!tx.date) continue;
        const p = tx.date.trim();
        let matches = false;
        if (p.startsWith(monthKey)) {
          matches = true;
        } else {
          const parts = p.split('/');
          if (parts.length === 3 && parts[1] === monthNum && parts[2] === targetYr) {
            matches = true;
          }
        }

        if (matches) {
          if (tx.type === 'Pengeluaran') {
            expense += tx.amount;
            txCount++;
          } else if (tx.type === 'Pemasukan') {
            income += tx.amount;
          }
        }
      }

      monthsData.push({
        monthKey,
        monthNum,
        monthName,
        expense,
        income,
        txCount,
      });
    }

    const totalExpenseYear = monthsData.reduce((acc, m) => acc + m.expense, 0);
    const totalIncomeYear = monthsData.reduce((acc, m) => acc + m.income, 0);
    const activeMonths = monthsData.filter((m) => m.expense > 0);
    const maxExpense = Math.max(...monthsData.map((m) => m.expense), 1);

    let highestMonth: (typeof monthsData)[0] | null = null;
    let lowestMonth: (typeof monthsData)[0] | null = null;

    if (activeMonths.length > 0) {
      highestMonth = activeMonths.reduce((prev, curr) => (curr.expense > prev.expense ? curr : prev), activeMonths[0]);
      lowestMonth = activeMonths.reduce((prev, curr) => (curr.expense < prev.expense ? curr : prev), activeMonths[0]);
    }

    const avgExpense = activeMonths.length > 0 ? Math.round(totalExpenseYear / activeMonths.length) : 0;

    return {
      targetYear: targetYr,
      months: monthsData,
      totalExpenseYear,
      totalIncomeYear,
      maxExpense,
      highestMonth,
      lowestMonth,
      avgExpense,
    };
  }, [data?.transactions, selectedYear]);

  // Budget calculations (Bulanan & Harian)
  const monthlyBudgetAmount = data?.budget?.amount || 0;
  const monthlySpentAmount = data?.budget?.spent || 0;
  const monthlyRemaining = data?.budget?.remaining ?? (monthlyBudgetAmount - monthlySpentAmount);
  const monthlyPct = data?.budget?.percentage || 0;
  const hasMonthlyBudget = monthlyBudgetAmount > 0;

  const dailyBudgetAmount = data?.budget?.dailyAmount || 0;
  const dailySpentAmount = data?.budget?.dailySpent || 0;
  const dailyRemaining = data?.budget?.dailyRemaining ?? (dailyBudgetAmount - dailySpentAmount);
  const dailyPct = data?.budget?.dailyPercentage || 0;
  const hasDailyBudget = dailyBudgetAmount > 0;

  // Active view values based on budgetViewMode
  const activeBudgetAmount = budgetViewMode === 'monthly' ? monthlyBudgetAmount : dailyBudgetAmount;
  const activeBudgetSpent = budgetViewMode === 'monthly' ? monthlySpentAmount : dailySpentAmount;
  const activeBudgetRemaining = budgetViewMode === 'monthly' ? monthlyRemaining : dailyRemaining;
  const activeBudgetPct = budgetViewMode === 'monthly' ? monthlyPct : dailyPct;
  const hasActiveBudget = activeBudgetAmount > 0;

  return (
    <div className="crm-dashboard">
      {/* 1. TOP CRM NAVBAR */}
      <header className="crm-navbar">
        <div className="crm-nav-inner">
          <div className="crm-brand">
            <div className="crm-brand-logo">💕</div>
            <div className="crm-brand-details">
              <h1 className="crm-brand-title">Tabungan Kita</h1>
              <div className="crm-badge-book">
                <span className="crm-status-dot" />
                <span className="crm-book-name">Pos: <b>{selectedBook}</b></span>
              </div>
            </div>
          </div>

          <div className="crm-nav-actions">
            <button
              className="crm-refresh-btn"
              onClick={() => fetchData(selectedBook, true)}
              disabled={isRefreshing}
              title="Sinkronisasi Data Langsung dari Google Sheets"
            >
              <span>{isRefreshing ? '⏳' : '🔄'}</span>
              <span className="crm-btn-text">{isRefreshing ? 'Syncing...' : 'Sync Data'}</span>
            </button>
            <a
              href="https://t.me/nabung_date_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="crm-bot-btn"
            >
              <span>🤖</span>
              <span className="crm-btn-text">@nabung_date_bot</span>
              <span className="crm-btn-text-mobile">Bot</span>
            </a>
          </div>
        </div>
      </header>

      {/* MAIN CRM DASHBOARD CONTAINER */}
      <main className="crm-container">
        {error && (
          <div className="crm-alert-error">
            <span>⚠️ {error}</span>
            <button onClick={() => fetchData(selectedBook)}>Muat Ulang</button>
          </div>
        )}

        {/* YEAR FILTER BAR */}
        <section className="crm-year-bar">
          <div className="crm-year-left">
            <span className="crm-year-icon">📅</span>
            <span className="crm-year-label">Filter Tahun:</span>
          </div>
          <div className="crm-year-pills">
            {availableYears.map((yr) => (
              <button
                key={yr}
                className={`crm-year-pill ${selectedYear === yr ? 'active' : ''}`}
                onClick={() => setSelectedYear(yr)}
              >
                {yr} {yr === '2026' ? '• Kini' : ''}
              </button>
            ))}
            <button
              className={`crm-year-pill ${selectedYear === 'Semua' ? 'active' : ''}`}
              onClick={() => setSelectedYear('Semua')}
            >
              Semua Tahun
            </button>
          </div>
        </section>

        {/* 2. TOP KPI METRIC CARDS */}
        <section className="crm-kpi-grid">
          {/* Card 1: Net Balance */}
          <div className="crm-kpi-card crm-kpi-primary">
            <div className="crm-kpi-top">
              <span className="crm-kpi-icon">💰</span>
              <span className="crm-kpi-chip">
                {yearStats.saldo >= 0 ? '+Surplus' : '-Defisit'}
              </span>
            </div>
            <div className="crm-kpi-label">
              Saldo {selectedYear === 'Semua' ? 'Semua' : selectedYear}
            </div>
            <div className="crm-kpi-val">
              {loading && !data ? '...' : formatRupiah(yearStats.saldo)}
            </div>
            <div className="crm-kpi-footer">
              <span>{yearStats.count} Transaksi ({selectedYear})</span>
            </div>
          </div>

          {/* Card 2: Total Income */}
          <div className="crm-kpi-card">
            <div className="crm-kpi-top">
              <div className="crm-kpi-icon-circle green">📥</div>
              <span className="crm-kpi-badge green">Pemasukan</span>
            </div>
            <div className="crm-kpi-label">Pemasukan {selectedYear === 'Semua' ? '' : selectedYear}</div>
            <div className="crm-kpi-val green">
              +{formatRupiah(yearStats.totalPemasukan)}
            </div>
            <div className="crm-kpi-footer">
              <span>Arus dana kas masuk</span>
            </div>
          </div>

          {/* Card 3: Total Expenses */}
          <div className="crm-kpi-card">
            <div className="crm-kpi-top">
              <div className="crm-kpi-icon-circle orange">📤</div>
              <span className="crm-kpi-badge orange">Pengeluaran</span>
            </div>
            <div className="crm-kpi-label">Pengeluaran {selectedYear === 'Semua' ? '' : selectedYear}</div>
            <div className="crm-kpi-val orange">
              -{formatRupiah(yearStats.totalPengeluaran)}
            </div>
            <div className="crm-kpi-footer">
              <span>Realisasi belanja kas</span>
            </div>
          </div>

          {/* Card 4: Budget Goal Tracker (Bulanan & Harian) */}
          <div className="crm-kpi-card">
            <div className="crm-kpi-top">
              <div className="crm-kpi-icon-circle purple">🎯</div>
              <div className="crm-budget-switcher">
                <button
                  className={`crm-budget-tab-btn ${budgetViewMode === 'monthly' ? 'active' : ''}`}
                  onClick={() => setBudgetViewMode('monthly')}
                >
                  Bulan
                </button>
                <button
                  className={`crm-budget-tab-btn ${budgetViewMode === 'daily' ? 'active' : ''}`}
                  onClick={() => setBudgetViewMode('daily')}
                >
                  Hari
                </button>
              </div>
              <button
                onClick={() => {
                  setBudgetEditType(budgetViewMode);
                  setBudgetInput(activeBudgetAmount ? String(activeBudgetAmount) : '');
                  setIsEditingBudget(!isEditingBudget);
                }}
                className="crm-kpi-btn-edit"
              >
                {isEditingBudget ? '✕ Batal' : '✏️ Atur'}
              </button>
            </div>
            <div className="crm-kpi-label">
              {budgetViewMode === 'monthly' ? 'Batas Budget Bulanan' : 'Batas Budget Harian'}
            </div>
            <div className="crm-kpi-val">
              {hasActiveBudget
                ? `${formatRupiah(activeBudgetAmount)}${budgetViewMode === 'daily' ? '/hari' : ''}`
                : 'Belum Diatur'}
            </div>
            <div className="crm-kpi-footer">
              {hasActiveBudget ? (
                <span style={{ color: activeBudgetPct >= 100 ? '#EF4444' : '#6366F1', fontWeight: 600 }}>
                  {activeBudgetPct}% terpakai • Sisa {formatRupiah(activeBudgetRemaining)}
                </span>
              ) : (
                <span>Klik ✏️ Atur untuk pasang target {budgetViewMode === 'monthly' ? 'bulanan' : 'harian'}</span>
              )}
            </div>

            {/* Quick Inline Budget Form */}
            {isEditingBudget && (
              <div className="crm-inline-budget">
                <div className="crm-inline-budget-type">
                  <button
                    type="button"
                    className={`crm-budget-type-btn ${budgetEditType === 'monthly' ? 'active' : ''}`}
                    onClick={() => {
                      setBudgetEditType('monthly');
                      setBudgetInput(monthlyBudgetAmount ? String(monthlyBudgetAmount) : '');
                    }}
                  >
                    Bulanan
                  </button>
                  <button
                    type="button"
                    className={`crm-budget-type-btn ${budgetEditType === 'daily' ? 'active' : ''}`}
                    onClick={() => {
                      setBudgetEditType('daily');
                      setBudgetInput(dailyBudgetAmount ? String(dailyBudgetAmount) : '');
                    }}
                  >
                    Harian
                  </button>
                </div>
                <div className="crm-inline-budget-input-row">
                  <input
                    type="number"
                    placeholder={budgetEditType === 'monthly' ? 'Target bulanan (misal: 3000000)' : 'Limit harian (misal: 50000)'}
                    value={budgetInput}
                    onChange={(e) => setBudgetInput(e.target.value)}
                  />
                  <button onClick={handleSaveBudget} disabled={isSavingBudget}>
                    {isSavingBudget ? '...' : 'Simpan'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 3. DAILY TRACKING HERO CARD (Treking Pengeluaran Harian) */}
        <section className="crm-card crm-daily-card">
          <div className="crm-daily-header">
            <div>
              <div className="crm-daily-title">
                {dailyChartMode === 'spent' ? '📉 Treking Pengeluaran Harian' : '💰 Saldo Kas • Treking Harian'}
              </div>
              <div className="crm-daily-amount">
                {formatRupiah(dailyChartMode === 'spent' ? activeDayData.expense : activeDayData.balance)}
              </div>
              <div className="crm-daily-subrow">
                <span className={`crm-daily-growth-badge ${dailyChartMode === 'spent' ? 'expense' : 'balance'}`}>
                  {dailyChartMode === 'spent'
                    ? (activeDayData.isToday ? '🔴 Belanja Hari Ini' : activeDayData.isPastOrToday ? '📅 Belanja' : '⏳ Estimasi')
                    : `🟢 Saldo Kas ${selectedYear === 'Semua' ? 'All-Time' : selectedYear}`}
                </span>
                <span className="crm-daily-date-label">
                  {activeDayData.dayNameId}, {activeDayData.dateFormatted}
                </span>
                {dailyChartMode === 'spent' && activeDayData.expense === 0 && activeDayData.isPastOrToday && (
                  <span className="crm-daily-date-label" style={{ color: '#10B981', fontWeight: 700 }}>
                    ✨ Hemat (Rp 0)
                  </span>
                )}
                {dailyChartMode === 'spent' && hasDailyBudget && activeDayData.isToday && (
                  <span className="crm-daily-budget-pill">
                    🎯 Kuota: {formatRupiah(dailyBudgetAmount)} • Sisa {formatRupiah(dailyRemaining)}
                  </span>
                )}
              </div>
            </div>

            {/* Mode Switcher (Pengeluaran vs Saldo) */}
            <div className="crm-daily-mode-tabs">
              <button
                className={`crm-mode-tab ${dailyChartMode === 'spent' ? 'active' : ''}`}
                onClick={() => setDailyChartMode('spent')}
              >
                Pengeluaran Harian
              </button>
              <button
                className={`crm-mode-tab ${dailyChartMode === 'balance' ? 'active' : ''}`}
                onClick={() => setDailyChartMode('balance')}
              >
                Saldo Kas
              </button>
            </div>
          </div>

          {/* SVG Smooth Curve Area Chart */}
          <div className="crm-daily-chart-wrap">
            <svg className="crm-daily-svg" viewBox="0 0 540 140" preserveAspectRatio="none">
              <defs>
                <linearGradient id="dailyAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={dailyChartMode === 'spent' ? '#6366F1' : '#10B981'} stopOpacity="0.25" />
                  <stop offset="100%" stopColor={dailyChartMode === 'spent' ? '#6366F1' : '#10B981'} stopOpacity="0.0" />
                </linearGradient>
                <filter id="badgeGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0F172A" floodOpacity="0.1" />
                </filter>
              </defs>

              {/* Area Fill Gradient under curve up to active day */}
              {dailyTracking.areaPath && (
                <path d={dailyTracking.areaPath} fill="url(#dailyAreaGrad)" />
              )}

              {/* Solid Curved Line for Past & Today */}
              {dailyTracking.curvePast && (
                <path
                  d={dailyTracking.curvePast}
                  fill="none"
                  stroke={dailyChartMode === 'spent' ? '#6366F1' : '#10B981'}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Light Gray Dashed Curved Line for Future Days */}
              {dailyTracking.curveFuture && (
                <path
                  d={dailyTracking.curveFuture}
                  fill="none"
                  stroke="#CBD5E1"
                  strokeWidth="2"
                  strokeDasharray="4,4"
                  strokeLinecap="round"
                />
              )}

              {/* Vertical Guide Line down from active point */}
              <line
                x1={activeDayPoint.x}
                y1={activeDayPoint.y}
                x2={activeDayPoint.x}
                y2="135"
                stroke="#94A3B8"
                strokeDasharray="3,3"
                strokeWidth="1.5"
              />

              {/* Outer halo circle & inner dot at active point */}
              <circle
                cx={activeDayPoint.x}
                cy={activeDayPoint.y}
                r="7"
                fill="#FFFFFF"
                stroke={dailyChartMode === 'spent' ? '#6366F1' : '#10B981'}
                strokeWidth="3.5"
              />
              <circle
                cx={activeDayPoint.x}
                cy={activeDayPoint.y}
                r="2.5"
                fill={dailyChartMode === 'spent' ? '#6366F1' : '#10B981'}
              />

              {/* Floating Tooltip Pill */}
              <g transform={`translate(${activeDayPoint.x}, ${Math.max(20, activeDayPoint.y - 26)})`}>
                <rect
                  x="-46"
                  y="-14"
                  width="92"
                  height="26"
                  rx="8"
                  fill="#FFFFFF"
                  stroke="#E2E8F0"
                  filter="url(#badgeGlow)"
                />
                <text
                  textAnchor="middle"
                  y="4"
                  fontSize="11"
                  fontWeight="800"
                  fill="#0F172A"
                  letterSpacing="-0.02em"
                >
                  {formatRupiah(dailyChartMode === 'spent' ? activeDayData.expense : activeDayData.balance)}
                </text>
              </g>
            </svg>

            {/* X-Axis Days Labels (Mon, Tue, Wed, Thu, Fri, Sat, Sun) */}
            <div className="crm-daily-days-row">
              {dailyTracking.days.map((d) => {
                const isSelected = activeDayIdx === d.idx;
                const displayVal = dailyChartMode === 'spent'
                  ? d.isPastOrToday
                    ? d.expense > 0
                      ? formatRupiahShort(d.expense)
                      : 'Rp 0'
                    : '-'
                  : d.isPastOrToday
                  ? formatRupiahShort(d.balance)
                  : '-';

                return (
                  <button
                    key={d.dayName}
                    className={`crm-day-pill ${isSelected ? 'active' : ''} ${d.isToday ? 'is-today' : ''}`}
                    onClick={() => setHoveredDayIdx(d.idx)}
                    onMouseEnter={() => setHoveredDayIdx(d.idx)}
                  >
                    <span className="crm-day-abbr">{d.dayName}</span>
                    <span className="crm-day-val">{displayVal}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* 4. CHARTS ROW: RINCIAN ARUS KAS BULANAN + DONUT CHART */}
        <section className="crm-charts-grid">
          {/* A. RINCIAN ARUS KAS BULANAN (Format Kartu Vertikal Responsif) */}
          <div className="crm-card crm-chart-card">
            <div className="crm-card-header">
              <div>
                <h2 className="crm-card-title">Arus Kas & Tren Bulanan</h2>
                <div className="crm-card-subtitle">Perbandingan pemasukan vs pengeluaran per bulan</div>
              </div>
              <div className="crm-chart-header-actions">
                <div className="crm-chart-legend">
                  <span className="crm-legend-item">
                    <span className="crm-legend-dot blue" /> Masuk
                  </span>
                  <span className="crm-legend-item">
                    <span className="crm-legend-dot indigo" /> Keluar
                  </span>
                </div>
              </div>
            </div>

            {/* Filter Bulan 1 - 12 (Horizontal Scrollable Pills) */}
            <div className="crm-month-filter-wrap">
              <div className="crm-month-filter-scroll">
                <button
                  className={`crm-month-filter-pill ${selectedMonthPill === 'all' ? 'active' : ''}`}
                  onClick={() => setSelectedMonthPill('all')}
                >
                  Semua (1-12)
                </button>
                {MONTH_NAMES_ID.map((m) => {
                  const hasData = (data?.monthlyComparison?.months || []).some(
                    (item) =>
                      (selectedYear === 'Semua' || item.month.startsWith(`${selectedYear}-`)) &&
                      item.month.endsWith(`-${m.num}`)
                  );
                  return (
                    <button
                      key={m.num}
                      className={`crm-month-filter-pill ${selectedMonthPill === m.num ? 'active' : ''} ${hasData ? 'has-data' : ''}`}
                      onClick={() => setSelectedMonthPill(m.num)}
                      title={`${m.full} ${selectedYear}`}
                    >
                      <span>{parseInt(m.num, 10)} {m.short}</span>
                      {hasData && <span className="crm-month-dot" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {cashflowBarData.length === 0 ? (
              <div className="crm-chart-empty">
                <span>
                  📅 Belum ada transaksi di bulan{' '}
                  {selectedMonthPill !== 'all'
                    ? `${MONTH_NAMES_ID.find((m) => m.num === selectedMonthPill)?.full} ${selectedYear}`
                    : `tahun ${selectedYear}`}
                  .
                </span>
                {selectedMonthPill !== 'all' && (
                  <button className="crm-empty-reset-btn" onClick={() => setSelectedMonthPill('all')}>
                    Tampilkan Semua Bulan
                  </button>
                )}
              </div>
            ) : (
              <div className="crm-monthly-list">
                {cashflowBarData.map((m) => {
                  const totalCash = m.income + m.expense;
                  const incomePct = totalCash > 0 ? Math.round((m.income / totalCash) * 100) : 50;
                  const expensePct = 100 - incomePct;
                  const isSurplus = m.balance >= 0;

                  return (
                    <div key={m.month} className="crm-month-card">
                      <div className="crm-month-card-top">
                        <div className="crm-month-info">
                          <span className="crm-month-badge-icon">📅</span>
                          <div className="crm-month-meta">
                            <span className="crm-month-name">{m.monthLabel}</span>
                            <span className={`crm-month-net-badge ${isSurplus ? 'surplus' : 'deficit'}`}>
                              {isSurplus ? '🟢 Surplus' : '🔴 Defisit'} {formatRupiah(m.balance)}
                            </span>
                          </div>
                        </div>

                        <div className="crm-month-values">
                          <div className="crm-month-val-box income">
                            <span className="crm-month-val-label">Masuk</span>
                            <span className="crm-month-val-num">+{formatRupiah(m.income)}</span>
                          </div>
                          <div className="crm-month-val-box expense">
                            <span className="crm-month-val-label">Keluar</span>
                            <span className="crm-month-val-num">-{formatRupiah(m.expense)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Visual Ratio Progress Bar: Pemasukan (Biru) vs Pengeluaran (Ungu) */}
                      <div className="crm-month-bar-wrap">
                        <div className="crm-month-bar-track">
                          <div
                            className="crm-month-bar-fill income"
                            style={{ width: `${incomePct}%` }}
                            title={`Pemasukan: ${incomePct}% (${formatRupiah(m.income)})`}
                          />
                          <div
                            className="crm-month-bar-fill expense"
                            style={{ width: `${expensePct}%` }}
                            title={`Pengeluaran: ${expensePct}% (${formatRupiah(m.expense)})`}
                          />
                        </div>
                        <div className="crm-month-bar-labels">
                          <span>Masuk {incomePct}%</span>
                          <span>Keluar {expensePct}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* B. DONUT CHART (Distribusi Kategori Pengeluaran) */}
          <div className="crm-card crm-donut-card">
            <div className="crm-card-header">
              <div>
                <h2 className="crm-card-title">Distribusi Kategori</h2>
                <div className="crm-card-subtitle">Proporsi pengeluaran berdasarkan kategori</div>
              </div>
              {categoryExpensesList.length > 5 && (
                <button
                  className="crm-badge-count-btn"
                  onClick={() => setShowAllCategories(!showAllCategories)}
                >
                  {showAllCategories ? 'Ringkas' : `Lihat Semua (${categoryExpensesList.length})`}
                </button>
              )}
            </div>

            {categoryExpensesList.length === 0 ? (
              <div className="crm-chart-empty">
                <span>🍩 Belum ada data pengeluaran untuk divisualisasikan ke dalam donut chart.</span>
              </div>
            ) : (
              <div className="crm-donut-content">
                {/* Interactive SVG Donut */}
                <div className="crm-donut-svg-wrap">
                  <svg className="crm-donut-svg" viewBox="0 0 160 160">
                    {/* Background Ring */}
                    <circle
                      cx="80"
                      cy="80"
                      r={donutData.R}
                      fill="none"
                      stroke="#F1F5F9"
                      strokeWidth="18"
                    />

                    {/* Donut Segments */}
                    {donutData.segments.map((seg) => {
                      const isHovered = activeCategory === seg.name;
                      return (
                        <circle
                          key={seg.name}
                          cx="80"
                          cy="80"
                          r={donutData.R}
                          fill="none"
                          stroke={seg.config.barColor}
                          strokeWidth={isHovered ? 24 : 18}
                          strokeDasharray={seg.strokeDasharray}
                          strokeDashoffset={seg.strokeDashoffset}
                          transform="rotate(-90 80 80)"
                          className="crm-donut-slice"
                          onMouseEnter={() => setActiveCategory(seg.name)}
                          onMouseLeave={() => setActiveCategory(null)}
                        />
                      );
                    })}
                  </svg>

                  {/* Centered Donut Value */}
                  <div className="crm-donut-center">
                    <span className="crm-donut-center-label">
                      {activeCategory || 'Total Belanja'}
                    </span>
                    <span
                      className="crm-donut-center-val"
                      style={{
                        fontSize: (activeCategory
                          ? categoryExpensesList.find((c) => c.name === activeCategory)?.amount || 0
                          : donutData.total) >= 10_000_000 ? '0.86rem' : '1.02rem',
                      }}
                    >
                      {formatRupiah(
                        activeCategory
                          ? categoryExpensesList.find((c) => c.name === activeCategory)?.amount || 0
                          : donutData.total
                      )}
                    </span>
                  </div>
                </div>

                {/* Donut Legend List */}
                <div className="crm-donut-legend-list">
                  {(showAllCategories ? categoryExpensesList : categoryExpensesList.slice(0, 5)).map((c) => (
                    <div
                      key={c.name}
                      className={`crm-donut-legend-row ${activeCategory === c.name ? 'highlighted' : ''}`}
                      onMouseEnter={() => setActiveCategory(c.name)}
                      onMouseLeave={() => setActiveCategory(null)}
                    >
                      <div className="crm-legend-row-top">
                        <div className="crm-legend-left">
                          <span
                            className="crm-donut-color-dot"
                            style={{ background: c.config.barColor }}
                          />
                          <span className="crm-legend-icon">{c.config.icon}</span>
                          <span className="crm-legend-name">{c.name}</span>
                        </div>

                        <div className="crm-legend-right">
                          <span className="crm-legend-amount">{formatRupiah(c.amount)}</span>
                          <span className="crm-legend-pct">{c.percentage}%</span>
                        </div>
                      </div>
                      <div className="crm-legend-bar-track">
                        <div
                          className="crm-legend-bar-fill"
                          style={{
                            width: `${Math.min(100, Math.max(3, c.percentage))}%`,
                            background: c.config.barColor,
                          }}
                        />
                      </div>
                    </div>
                  ))}

                  {categoryExpensesList.length > 5 && (
                    <button
                      className="crm-toggle-categories-btn"
                      onClick={() => setShowAllCategories(!showAllCategories)}
                    >
                      {showAllCategories
                        ? '▲ Tampilkan 5 Teratas Saja'
                        : `▼ Lihat Semua (${categoryExpensesList.length} Kategori)`}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 5. CRM BOTTOM ROW: DOMPET ALLOCATION + PERFORMANCE BENCHMARKS */}
        <section className="crm-bottom-grid">
          {/* Card Dompet & Saldo Aktif */}
          <div className="crm-card crm-wallets-card">
            <div className="crm-card-header">
              <div>
                <h2 className="crm-card-title">Alokasi Dompet & Rekening</h2>
                <div className="crm-card-subtitle">
                  Saldo fisik & digital tahun {selectedYear === 'Semua' ? 'akumulasi' : selectedYear}
                </div>
              </div>
            </div>

            <div className="crm-wallets-list">
              {/* Bank */}
              <div className="crm-wallet-item">
                <div className="crm-wallet-icon-box">🏦</div>
                <div className="crm-wallet-info">
                  <div className="crm-wallet-name">Bank</div>
                  <div className="crm-wallet-val">
                    {formatRupiah(filteredWalletBalances.Bank)}
                  </div>
                  {filteredWalletBalances.details &&
                    Object.keys(filteredWalletBalances.details).some((k) => k.toLowerCase().includes('bank')) && (
                      <div className="crm-wallet-subchips">
                        {Object.entries(filteredWalletBalances.details)
                          .filter(([k]) => k.toLowerCase().includes('bank'))
                          .map(([k, val]) => (
                            <span key={k} className="crm-subchip">
                              {k.replace(/^Bank - /i, '')}: {formatRupiah(val)}
                            </span>
                          ))}
                      </div>
                    )}
                </div>
              </div>

              {/* E-Wallet */}
              <div className="crm-wallet-item">
                <div className="crm-wallet-icon-box">📱</div>
                <div className="crm-wallet-info">
                  <div className="crm-wallet-name">E-Wallet</div>
                  <div className="crm-wallet-val">
                    {formatRupiah(filteredWalletBalances['E-Wallet'])}
                  </div>
                  {filteredWalletBalances.details &&
                    Object.keys(filteredWalletBalances.details).some(
                      (k) =>
                        k.toLowerCase().includes('wallet') ||
                        k.toLowerCase().includes('dana') ||
                        k.toLowerCase().includes('gopay') ||
                        k.toLowerCase().includes('ovo') ||
                        k.toLowerCase().includes('shopeepay')
                    ) && (
                      <div className="crm-wallet-subchips">
                        {Object.entries(filteredWalletBalances.details)
                          .filter(
                            ([k]) =>
                              k.toLowerCase().includes('wallet') ||
                              k.toLowerCase().includes('dana') ||
                              k.toLowerCase().includes('gopay') ||
                              k.toLowerCase().includes('ovo') ||
                              k.toLowerCase().includes('shopeepay')
                          )
                          .map(([k, val]) => (
                            <span key={k} className="crm-subchip">
                              {k.replace(/^E-Wallet - /i, '')}: {formatRupiah(val)}
                            </span>
                          ))}
                      </div>
                    )}
                </div>
              </div>

              {/* Cash */}
              <div className="crm-wallet-item">
                <div className="crm-wallet-icon-box">💵</div>
                <div className="crm-wallet-info">
                  <div className="crm-wallet-name">Cash (Uang Fisik)</div>
                  <div className="crm-wallet-val">
                    {formatRupiah(filteredWalletBalances.Cash)}
                  </div>
                  <div className="crm-wallet-subchips">
                    <span className="crm-subchip">Uang Tunai di Dompet</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card Performance Rekor & Rata-Rata */}
          {data?.monthlyComparison && (
            <div className="crm-card crm-benchmarks-card">
              <div className="crm-card-header">
                <div>
                  <h2 className="crm-card-title">Performa & Rekor Keuangan</h2>
                  <div className="crm-card-subtitle">Pencapaian tertinggi dan estimasi bulanan</div>
                </div>
              </div>

              <div className="crm-benchmarks-grid">
                <div className="crm-benchmark-tile">
                  <div className="crm-bm-label green">🏆 Rekor Pemasukan</div>
                  <div className="crm-bm-val">
                    {data.monthlyComparison.highestIncomeMonth
                      ? formatRupiah(data.monthlyComparison.highestIncomeMonth.amount)
                      : '—'}
                  </div>
                  <div className="crm-bm-sub">
                    {data.monthlyComparison.highestIncomeMonth?.monthLabel || '-'}
                  </div>
                </div>

                <div className="crm-benchmark-tile">
                  <div className="crm-bm-label red">💸 Rekor Belanja</div>
                  <div className="crm-bm-val">
                    {data.monthlyComparison.highestExpenseMonth
                      ? formatRupiah(data.monthlyComparison.highestExpenseMonth.amount)
                      : '—'}
                  </div>
                  <div className="crm-bm-sub">
                    {data.monthlyComparison.highestExpenseMonth?.monthLabel || '-'}
                  </div>
                </div>

                <div className="crm-benchmark-tile">
                  <div className="crm-bm-label blue">📥 Rata-Rata Masuk</div>
                  <div className="crm-bm-val">
                    {formatRupiah(data.monthlyComparison.averageMonthlyIncome)}
                  </div>
                  <div className="crm-bm-sub">per bulan</div>
                </div>

                <div className="crm-benchmark-tile">
                  <div className="crm-bm-label purple">📤 Rata-Rata Keluar</div>
                  <div className="crm-bm-val">
                    {formatRupiah(data.monthlyComparison.averageMonthlyExpense)}
                  </div>
                  <div className="crm-bm-sub">per bulan</div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 6. PERBANDINGAN PENGELUARAN BULAN JANUARI - DESEMBER (Bawah Sendiri) */}
        <section className="crm-card crm-annual-card">
          <div className="crm-card-header">
            <div>
              <div className="crm-annual-header-tag">
                <span className="crm-year-pill-tag">TAHUN {annualMonthlyComparison.targetYear}</span>
                <span className="crm-annual-header-hint">12 Bulan Penuh (Jan - Des)</span>
              </div>
              <h2 className="crm-card-title">📊 Perbandingan Pengeluaran Antar Bulan</h2>
              <div className="crm-card-subtitle">
                Total uang belanja yang terpakai di setiap bulan sepanjang tahun {annualMonthlyComparison.targetYear}
              </div>
            </div>
          </div>

          {/* Highlights KPI Bar */}
          <div className="crm-annual-highlights">
            <div className="crm-annual-kpi">
              <span className="crm-annual-kpi-label">Total Belanja Setahun</span>
              <span className="crm-annual-kpi-val expense">
                {formatRupiah(annualMonthlyComparison.totalExpenseYear)}
              </span>
            </div>
            <div className="crm-annual-kpi">
              <span className="crm-annual-kpi-label">Rata-rata / Bulan</span>
              <span className="crm-annual-kpi-val">
                {formatRupiah(annualMonthlyComparison.avgExpense)}
              </span>
            </div>
            {annualMonthlyComparison.highestMonth && (
              <div className="crm-annual-kpi highlight-high">
                <span className="crm-annual-kpi-label">🔥 Bulan Pengeluaran Tertinggi</span>
                <span className="crm-annual-kpi-val">
                  {annualMonthlyComparison.highestMonth.monthName} ({formatRupiah(annualMonthlyComparison.highestMonth.expense)})
                </span>
              </div>
            )}
            {annualMonthlyComparison.lowestMonth &&
              annualMonthlyComparison.lowestMonth.monthKey !== annualMonthlyComparison.highestMonth?.monthKey && (
                <div className="crm-annual-kpi highlight-low">
                  <span className="crm-annual-kpi-label">✨ Bulan Paling Hemat</span>
                  <span className="crm-annual-kpi-val">
                    {annualMonthlyComparison.lowestMonth.monthName} ({formatRupiah(annualMonthlyComparison.lowestMonth.expense)})
                  </span>
                </div>
              )}
          </div>

          {/* 12-Month Rows (Januari - Desember) */}
          <div className="crm-annual-list">
            {annualMonthlyComparison.months.map((m) => {
              const isHighest =
                annualMonthlyComparison.highestMonth &&
                m.expense > 0 &&
                m.monthKey === annualMonthlyComparison.highestMonth.monthKey;
              const isLowest =
                annualMonthlyComparison.lowestMonth &&
                m.expense > 0 &&
                m.monthKey === annualMonthlyComparison.lowestMonth.monthKey &&
                !isHighest;
              const pctOfMax =
                annualMonthlyComparison.maxExpense > 0
                  ? Math.round((m.expense / annualMonthlyComparison.maxExpense) * 100)
                  : 0;
              const pctOfTotal =
                annualMonthlyComparison.totalExpenseYear > 0
                  ? Math.round((m.expense / annualMonthlyComparison.totalExpenseYear) * 100)
                  : 0;

              return (
                <div
                  key={m.monthKey}
                  className={`crm-annual-row ${isHighest ? 'is-highest' : ''} ${m.expense === 0 ? 'is-zero' : ''}`}
                >
                  <div className="crm-annual-row-left">
                    <div className="crm-annual-month-badge">
                      <span className="crm-annual-month-num">{m.monthNum}</span>
                      <span className="crm-annual-month-name">{m.monthName}</span>
                    </div>
                    {isHighest && <span className="crm-badge-tag tag-high">🔥 Tertinggi</span>}
                    {isLowest && <span className="crm-badge-tag tag-low">✨ Terhemat</span>}
                    {m.expense === 0 && <span className="crm-badge-tag tag-zero">Rp 0</span>}
                  </div>

                  <div className="crm-annual-row-center">
                    <div className="crm-annual-bar-track">
                      <div
                        className={`crm-annual-bar-fill ${isHighest ? 'bar-high' : ''}`}
                        style={{ width: `${Math.max(m.expense > 0 ? 5 : 0, pctOfMax)}%` }}
                      />
                    </div>
                    <div className="crm-annual-meta-row">
                      <span className="crm-annual-tx-count">
                        {m.txCount > 0 ? `${m.txCount} transaksi belanja` : 'Tidak ada transaksi belanja'}
                      </span>
                      {m.expense > 0 && (
                        <span className="crm-annual-pct-share">
                          {pctOfTotal}% dari total belanja tahun {annualMonthlyComparison.targetYear}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="crm-annual-row-right">
                    <span className={`crm-annual-amount ${m.expense > 0 ? 'has-expense' : 'zero-expense'}`}>
                      {formatRupiah(m.expense)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
