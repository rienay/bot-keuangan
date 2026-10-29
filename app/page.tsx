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

interface CategoryStyle {
  label: string;
  icon: string;
  bgColor: string;
  barColor: string;
  textColor: string;
}

function getCategoryConfig(categoryName: string, index: number = 0): CategoryStyle {
  const c = (categoryName || '').toLowerCase();
  
  // Vibrant CRM chart palette
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

  // Kategori pengeluaran sorted descending untuk Donut Chart & Progress Bars
  const categoryExpensesList = useMemo(() => {
    if (!data?.stats?.categoryExpenses) return [];
    const totalExp = data.stats.totalPengeluaran || 1;
    return Object.entries(data.stats.categoryExpenses)
      .map(([name, amount], idx) => {
        const pct = Math.min(100, Math.round((amount / totalExp) * 100));
        return {
          name,
          amount,
          percentage: pct,
          config: getCategoryConfig(name, idx),
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [data?.stats?.categoryExpenses, data?.stats?.totalPengeluaran]);

  // Kalkulasi data SVG Donut Chart (Radius = 65, Circumference ~ 408.4)
  const donutData = useMemo(() => {
    const R = 65;
    const C = 2 * Math.PI * R;
    const total = data?.stats?.totalPengeluaran || 0;

    if (total <= 0 || categoryExpensesList.length === 0) {
      return {
        segments: [],
        total,
        C,
        R,
      };
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
  }, [categoryExpensesList, data?.stats?.totalPengeluaran]);

  // Kalkulasi Bar Chart Arus Kas Bulanan (Dual Bar Pemasukan vs Pengeluaran)
  const cashflowBarData = useMemo(() => {
    if (!data?.monthlyComparison?.months || data.monthlyComparison.months.length === 0) {
      return [];
    }

    const months = data.monthlyComparison.months;
    const maxVal = Math.max(
      ...months.map((m) => Math.max(m.income, m.expense)),
      1
    );

    return months.map((m) => {
      const incomeHeight = Math.max(6, Math.round((m.income / maxVal) * 150));
      const expenseHeight = Math.max(6, Math.round((m.expense / maxVal) * 150));
      return {
        ...m,
        incomeHeight,
        expenseHeight,
      };
    });
  }, [data?.monthlyComparison?.months]);

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
                <span>Pos Aktif: <b>{selectedBook}</b></span>
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
              <span>{isRefreshing ? 'Syncing...' : 'Sync Data'}</span>
            </button>
            <a
              href="https://t.me/nabung_date_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="crm-bot-btn"
            >
              <span>🤖</span>
              <span>@nabung_date_bot</span>
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

        {/* 2. TOP KPI METRIC CARDS (Style ala CRM Image 3) */}
        <section className="crm-kpi-grid">
          {/* Card 1: Net Balance (Primary Indigo Gradient Card) */}
          <div className="crm-kpi-card crm-kpi-primary">
            <div className="crm-kpi-top">
              <span className="crm-kpi-icon">💰</span>
              <span className="crm-kpi-chip">
                {(data?.stats.saldo || 0) >= 0 ? '+Surplus' : '-Defisit'}
              </span>
            </div>
            <div className="crm-kpi-label">Total Saldo Bersih</div>
            <div className="crm-kpi-val">
              {loading && !data ? '...' : formatRupiah(data?.stats.saldo || 0)}
            </div>
            <div className="crm-kpi-footer">
              <span>{data?.stats.count || 0} Total Transaksi di pos {selectedBook}</span>
            </div>
          </div>

          {/* Card 2: Total Income */}
          <div className="crm-kpi-card">
            <div className="crm-kpi-top">
              <div className="crm-kpi-icon-circle green">📥</div>
              <span className="crm-kpi-badge green">Pemasukan</span>
            </div>
            <div className="crm-kpi-label">Total Pemasukan</div>
            <div className="crm-kpi-val green">
              +{formatRupiah(data?.stats.totalPemasukan || 0)}
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
            <div className="crm-kpi-label">Total Pengeluaran</div>
            <div className="crm-kpi-val orange">
              -{formatRupiah(data?.stats.totalPengeluaran || 0)}
            </div>
            <div className="crm-kpi-footer">
              <span>Realisasi belanja & kas keluar</span>
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

        {/* 3. CHARTS ROW: DUAL BAR CHART + DONUT CHART (Replicating Image 3 CRM Charts) */}
        <section className="crm-charts-grid">
          {/* A. DUAL BAR CHART (Arus Kas Bulanan) */}
          <div className="crm-card crm-chart-card">
            <div className="crm-card-header">
              <div>
                <h2 className="crm-card-title">Arus Kas & Tren Bulanan</h2>
                <div className="crm-card-subtitle">Perbandingan pemasukan vs pengeluaran antar bulan</div>
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

            {cashflowBarData.length === 0 ? (
              <div className="crm-chart-empty">
                <span>📊 Belum ada riwayat perbandingan bulan. Catatan akan otomatis divisualisasikan di sini.</span>
              </div>
            ) : (
              <div className="crm-bar-container">
                <div className="crm-bar-chart">
                  {cashflowBarData.map((m) => (
                    <div key={m.month} className="crm-bar-group">
                      <div className="crm-bars-pair">
                        {/* Bar Masuk */}
                        <div
                          className="crm-bar crm-bar-income"
                          style={{ height: `${m.incomeHeight}px` }}
                          title={`Masuk: +${formatRupiah(m.income)}`}
                        >
                          <span className="crm-bar-tooltip">+${formatRupiah(m.income)}</span>
                        </div>

                        {/* Bar Keluar */}
                        <div
                          className="crm-bar crm-bar-expense"
                          style={{ height: `${m.expenseHeight}px` }}
                          title={`Keluar: -${formatRupiah(m.expense)}`}
                        >
                          <span className="crm-bar-tooltip">-${formatRupiah(m.expense)}</span>
                        </div>
                      </div>
                      <span className="crm-bar-label">{m.monthLabel.split(' ')[0]}</span>
                    </div>
                  ))}
                </div>
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
              <span className="crm-badge-count">
                {categoryExpensesList.length} Kategori
              </span>
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
                    <span className="crm-donut-center-val">
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
                  {categoryExpensesList.map((c) => (
                    <div
                      key={c.name}
                      className={`crm-donut-legend-row ${activeCategory === c.name ? 'highlighted' : ''}`}
                      onMouseEnter={() => setActiveCategory(c.name)}
                      onMouseLeave={() => setActiveCategory(null)}
                    >
                      <div className="crm-legend-left">
                        <span
                          className="crm-donut-color-dot"
                          style={{ background: c.config.barColor }}
                        />
                        <span className="crm-legend-name">{c.name}</span>
                      </div>

                      <div className="crm-legend-right">
                        <span className="crm-legend-amount">{formatRupiah(c.amount)}</span>
                        <span className="crm-legend-pct">{c.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 4. CRM BOTTOM ROW: DOMPET ALLOCATION + PERFORMANCE BENCHMARKS */}
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
