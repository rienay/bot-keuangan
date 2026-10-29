'use client';

import { useState, useEffect, useMemo } from 'react';
import { WebFinanceData } from '@/lib/types';

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
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

export default function FinanceDashboardPage() {
  const [data, setData] = useState<WebFinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBook, setSelectedBook] = useState<string>('Tabungan');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // State untuk form edit budget bulanan
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const [isSavingBudget, setIsSavingBudget] = useState(false);

  // Active hover slice state for interactive Donut Chart
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // State untuk Treking Harian (Daily Line Chart ala Image Referensi)
  const [dailyChartMode, setDailyChartMode] = useState<'balance' | 'spent'>('balance');
  const [hoveredDayIdx, setHoveredDayIdx] = useState<number | null>(null);

  // Filter range bulan untuk Bar Chart (default 6 bulan agar rapi di HP)
  const [barChartRange, setBarChartRange] = useState<'6' | '12' | 'all'>('6');
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
        body: JSON.stringify({ book: targetBook, amount: num }),
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

  // 1. DATA TREKING HARIAN (Senin s/d Minggu, mencocokkan referensi Net Worth)
  const dailyTracking = useMemo(() => {
    const now = new Date();
    const currentDayOfWeek = (now.getDay() + 6) % 7; // 0 = Mon, 1 = Tue, ..., 3 = Thu, ..., 6 = Sun

    // Tentukan hari Senin di minggu berjalan
    const monday = new Date(now);
    monday.setDate(now.getDate() - currentDayOfWeek);
    monday.setHours(0, 0, 0, 0);

    const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const DAY_LABELS_ID = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

    const allTx = data?.transactions || [];

    // Hitung saldo awal sebelum Senin minggu ini
    let baselineBalance = 0;
    allTx.forEach((tx) => {
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

      allTx.forEach((tx) => {
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
    const minVal = Math.min(...(activeValues.length > 0 ? activeValues : [0]));
    const maxVal = Math.max(...(activeValues.length > 0 ? activeValues : [100000]));
    const range = maxVal - minVal || 1;

    const points = days.map((d, i) => {
      const x = PAD_X + i * ((SVG_W - PAD_X * 2) / 6);
      let y: number;
      if (d.isPastOrToday) {
        const val = dailyChartMode === 'balance' ? d.balance : d.expense;
        y = (SVG_H - PAD_Y_BOTTOM) - ((val - minVal) / range) * (SVG_H - PAD_Y_TOP - PAD_Y_BOTTOM);
      } else {
        // Future projected day (sedikit landai melengkung seperti di referensi)
        const lastKnownY = (SVG_H - PAD_Y_BOTTOM) - ((days[currentDayOfWeek].balance - minVal) / range) * (SVG_H - PAD_Y_TOP - PAD_Y_BOTTOM);
        y = lastKnownY + (i - currentDayOfWeek) * 4;
      }
      return { x, y: Math.max(PAD_Y_TOP, Math.min(SVG_H - PAD_Y_BOTTOM, y)) };
    });

    // Spline curve up to today (Hijau tebal & area fill)
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

  // 3. Rincian Arus Kas Bulanan (Tampilan List Vertikal agar tidak gepeng di HP saat pilih 12 bulan)
  const cashflowBarData = useMemo(() => {
    if (!data?.monthlyComparison?.months || data.monthlyComparison.months.length === 0) {
      return [];
    }

    let months = data.monthlyComparison.months;
    if (selectedYear !== 'Semua') {
      months = months.filter((m) => m.month.startsWith(`${selectedYear}-`));
    }

    if (barChartRange === '6') {
      months = months.slice(-6);
    } else if (barChartRange === '12') {
      months = months.slice(-12);
    }

    if (months.length === 0) {
      return [];
    }

    // Urutkan bulan terbaru di paling atas
    return months.slice().reverse();
  }, [data?.monthlyComparison?.months, selectedYear, barChartRange]);

  // Budget calculations
  const budgetAmount = data?.budget?.amount || 0;
  const spentAmount = data?.stats?.totalPengeluaran || 0;
  const hasBudget = budgetAmount > 0;
  const budgetPct = hasBudget
    ? Math.min(100, Math.round((spentAmount / budgetAmount) * 100))
    : data?.stats?.totalPemasukan && data.stats.totalPemasukan > 0
    ? Math.min(100, Math.round((spentAmount / data.stats.totalPemasukan) * 100))
    : 0;

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

          {/* Card 4: Budget Goal Tracker */}
          <div className="crm-kpi-card">
            <div className="crm-kpi-top">
              <div className="crm-kpi-icon-circle purple">🎯</div>
              <button
                onClick={() => {
                  setBudgetInput(budgetAmount ? String(budgetAmount) : '');
                  setIsEditingBudget(!isEditingBudget);
                }}
                className="crm-kpi-btn-edit"
              >
                {isEditingBudget ? '✕ Batal' : '✏️ Atur'}
              </button>
            </div>
            <div className="crm-kpi-label">Batas Budget Bulanan</div>
            <div className="crm-kpi-val">
              {hasBudget ? formatRupiah(budgetAmount) : 'Belum Diatur'}
            </div>
            <div className="crm-kpi-footer">
              {hasBudget ? (
                <span style={{ color: budgetPct >= 100 ? '#EF4444' : '#6366F1', fontWeight: 600 }}>
                  {budgetPct}% terpakai • Sisa {formatRupiah(budgetAmount - spentAmount)}
                </span>
              ) : (
                <span>Klik ✏️ Atur untuk pasang target</span>
              )}
            </div>

            {/* Quick Inline Budget Form */}
            {isEditingBudget && (
              <div className="crm-inline-budget">
                <input
                  type="number"
                  placeholder="Target (misal: 3000000)"
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                />
                <button onClick={handleSaveBudget} disabled={isSavingBudget}>
                  {isSavingBudget ? '...' : 'Simpan'}
                </button>
              </div>
            )}
          </div>
        </section>

        {/* 3. DAILY TRACKING HERO CARD (Sesuai Referensi Gambar Net Worth & Weekly Curve) */}
        <section className="crm-card crm-daily-card">
          <div className="crm-daily-header">
            <div>
              <div className="crm-daily-title">
                {dailyChartMode === 'balance' ? 'Net Worth • Treking Harian' : 'Pengeluaran Harian'}
              </div>
              <div className="crm-daily-amount">
                {formatRupiah(dailyChartMode === 'balance' ? activeDayData.balance : activeDayData.expense)}
              </div>
              <div className="crm-daily-subrow">
                <span className="crm-daily-growth-badge">
                  {dailyChartMode === 'balance' ? '🟢 Akumulasi Real-Time' : '📤 Pengeluaran Hari Ini'}
                </span>
                <span className="crm-daily-date-label">
                  {activeDayData.dayNameId}, {activeDayData.dateFormatted}
                </span>
              </div>
            </div>

            {/* Mode Switcher (Saldo vs Belanja) */}
            <div className="crm-daily-mode-tabs">
              <button
                className={`crm-mode-tab ${dailyChartMode === 'balance' ? 'active' : ''}`}
                onClick={() => setDailyChartMode('balance')}
              >
                Saldo Bersih
              </button>
              <button
                className={`crm-mode-tab ${dailyChartMode === 'spent' ? 'active' : ''}`}
                onClick={() => setDailyChartMode('spent')}
              >
                Pengeluaran
              </button>
            </div>
          </div>

          {/* SVG Smooth Curve Area Chart */}
          <div className="crm-daily-chart-wrap">
            <svg className="crm-daily-svg" viewBox="0 0 540 140" preserveAspectRatio="none">
              <defs>
                <linearGradient id="dailyAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                </linearGradient>
                <filter id="badgeGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0F172A" floodOpacity="0.1" />
                </filter>
              </defs>

              {/* Area Fill Gradient under curve up to active day */}
              {dailyTracking.areaPath && (
                <path d={dailyTracking.areaPath} fill="url(#dailyAreaGrad)" />
              )}

              {/* Solid Green Curved Line for Past & Today */}
              {dailyTracking.curvePast && (
                <path
                  d={dailyTracking.curvePast}
                  fill="none"
                  stroke="#10B981"
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
                stroke="#10B981"
                strokeWidth="3.5"
              />
              <circle
                cx={activeDayPoint.x}
                cy={activeDayPoint.y}
                r="2.5"
                fill="#10B981"
              />

              {/* Floating Tooltip Pill (Mirip persis contoh: $ 26,210) */}
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
                  {formatRupiah(dailyChartMode === 'balance' ? activeDayData.balance : activeDayData.expense)}
                </text>
              </g>
            </svg>

            {/* X-Axis Days Labels (Mon, Tue, Wed, Thu, Fri, Sat, Sun) */}
            <div className="crm-daily-days-row">
              {dailyTracking.days.map((d) => (
                <button
                  key={d.dayName}
                  className={`crm-day-pill ${activeDayIdx === d.idx ? 'active' : ''} ${d.isToday ? 'is-today' : ''}`}
                  onClick={() => setHoveredDayIdx(d.idx)}
                  onMouseEnter={() => setHoveredDayIdx(d.idx)}
                >
                  <span className="crm-day-abbr">{d.dayName}</span>
                </button>
              ))}
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
                <div className="crm-pill-toggle">
                  <button
                    className={`crm-pill-btn ${barChartRange === '6' ? 'active' : ''}`}
                    onClick={() => setBarChartRange('6')}
                  >
                    6 Bln
                  </button>
                  <button
                    className={`crm-pill-btn ${barChartRange === '12' ? 'active' : ''}`}
                    onClick={() => setBarChartRange('12')}
                  >
                    12 Bln
                  </button>
                  <button
                    className={`crm-pill-btn ${barChartRange === 'all' ? 'active' : ''}`}
                    onClick={() => setBarChartRange('all')}
                  >
                    Semua
                  </button>
                </div>
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

            {cashflowBarData.length === 0 ? (
              <div className="crm-chart-empty">
                <span>📊 Belum ada riwayat perbandingan bulan pada filter ini.</span>
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
          {data?.stats?.walletBalances && (
            <div className="crm-card crm-wallets-card">
              <div className="crm-card-header">
                <div>
                  <h2 className="crm-card-title">Alokasi Dompet & Rekening</h2>
                  <div className="crm-card-subtitle">Saldo fisik & digital yang siap digunakan</div>
                </div>
              </div>

              <div className="crm-wallets-list">
                {/* Bank */}
                <div className="crm-wallet-item">
                  <div className="crm-wallet-icon-box">🏦</div>
                  <div className="crm-wallet-info">
                    <div className="crm-wallet-name">Bank</div>
                    <div className="crm-wallet-val">
                      {formatRupiah(data.stats.walletBalances.Bank)}
                    </div>
                    {data.stats.walletBalances.details &&
                      Object.keys(data.stats.walletBalances.details).some((k) => k.startsWith('Bank')) && (
                        <div className="crm-wallet-subchips">
                          {Object.entries(data.stats.walletBalances.details)
                            .filter(([k]) => k.startsWith('Bank'))
                            .map(([k, val]) => (
                              <span key={k} className="crm-subchip">
                                {k.replace(/^Bank - /, '')}: {formatRupiah(val)}
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
                      {formatRupiah(data.stats.walletBalances['E-Wallet'])}
                    </div>
                    {data.stats.walletBalances.details &&
                      Object.keys(data.stats.walletBalances.details).some((k) => k.startsWith('E-Wallet')) && (
                        <div className="crm-wallet-subchips">
                          {Object.entries(data.stats.walletBalances.details)
                            .filter(([k]) => k.startsWith('E-Wallet'))
                            .map(([k, val]) => (
                              <span key={k} className="crm-subchip">
                                {k.replace(/^E-Wallet - /, '')}: {formatRupiah(val)}
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
                      {formatRupiah(data.stats.walletBalances.Cash)}
                    </div>
                    <div className="crm-wallet-subchips">
                      <span className="crm-subchip">Uang Tunai di Dompet</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

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
      </main>
    </div>
  );
}
