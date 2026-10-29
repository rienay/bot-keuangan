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

function getCategoryConfig(categoryName: string): CategoryStyle {
  const c = (categoryName || '').toLowerCase();
  if (c.includes('makan') || c.includes('minum') || c.includes('konsumsi') || c.includes('resto') || c.includes('cafe') || c.includes('food')) {
    return {
      label: categoryName || 'Food & Dining',
      icon: '🍽️',
      bgColor: '#FFF7ED',
      barColor: '#F97316',
      textColor: '#EA580C',
    };
  }
  if (c.includes('belanja') || c.includes('shopping') || c.includes('pasar') || c.includes('supermarket') || c.includes('baju')) {
    return {
      label: categoryName || 'Shopping',
      icon: '🛍️',
      bgColor: '#FAF5FF',
      barColor: '#8B5CF6',
      textColor: '#7C3AED',
    };
  }
  if (c.includes('transport') || c.includes('bensin') || c.includes('parkir') || c.includes('ojek') || c.includes('grab') || c.includes('gojek')) {
    return {
      label: categoryName || 'Transport',
      icon: '🚗',
      bgColor: '#EFF6FF',
      barColor: '#0EA5E9',
      textColor: '#0284C7',
    };
  }
  if (c.includes('tagihan') || c.includes('listrik') || c.includes('wifi') || c.includes('pulsa') || c.includes('bill') || c.includes('langganan')) {
    return {
      label: categoryName || 'Bills',
      icon: '📄',
      bgColor: '#FEF3C7',
      barColor: '#F59E0B',
      textColor: '#D97706',
    };
  }
  if (c.includes('hiburan') || c.includes('date') || c.includes('ngedate') || c.includes('nonton') || c.includes('entertainment') || c.includes('kencan')) {
    return {
      label: categoryName || 'Entertainment',
      icon: '🍿',
      bgColor: '#ECFDF5',
      barColor: '#10B981',
      textColor: '#059669',
    };
  }
  if (c.includes('sehat') || c.includes('obat') || c.includes('dokter') || c.includes('apotek')) {
    return {
      label: categoryName || 'Kesehatan',
      icon: '💊',
      bgColor: '#FFF1F2',
      barColor: '#F43F5E',
      textColor: '#E11D48',
    };
  }
  if (c.includes('didik') || c.includes('buku') || c.includes('kursus')) {
    return {
      label: categoryName || 'Edukasi',
      icon: '📚',
      bgColor: '#F0FDF4',
      barColor: '#22C55E',
      textColor: '#16A34A',
    };
  }
  if (c.includes('gaji') || c.includes('upah') || c.includes('income')) {
    return {
      label: categoryName || 'Gaji',
      icon: '💼',
      bgColor: '#ECFDF5',
      barColor: '#10B981',
      textColor: '#059669',
    };
  }
  return {
    label: categoryName || 'Lain-lain',
    icon: '📦',
    bgColor: '#F1F5F9',
    barColor: '#6366F1',
    textColor: '#4F46E5',
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

  // Kategori pengeluaran sorted descending untuk progress bar tracking ala Image 2
  const categoryExpensesList = useMemo(() => {
    if (!data?.stats?.categoryExpenses) return [];
    const totalExp = data.stats.totalPengeluaran || 1;
    return Object.entries(data.stats.categoryExpenses)
      .map(([name, amount]) => {
        const pct = Math.min(100, Math.round((amount / totalExp) * 100));
        return {
          name,
          amount,
          percentage: pct,
          config: getCategoryConfig(name),
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [data?.stats?.categoryExpenses, data?.stats?.totalPengeluaran]);

  // Kalkulasi Budget vs Spent
  const budgetAmount = data?.budget?.amount || 0;
  const spentAmount = data?.stats?.totalPengeluaran || 0;
  const hasBudget = budgetAmount > 0;
  const budgetPct = hasBudget
    ? Math.min(100, Math.round((spentAmount / budgetAmount) * 100))
    : data?.stats?.totalPemasukan && data.stats.totalPemasukan > 0
    ? Math.min(100, Math.round((spentAmount / data.stats.totalPemasukan) * 100))
    : 0;

  return (
    <>
      {/* Sleek Minimal Navbar */}
      <header className="navbar">
        <div className="nav-container">
          <div className="brand">
            <div className="brand-icon">💕</div>
            <div className="brand-text">
              <div className="brand-title">Tabungan Kita</div>
              <div className="brand-subtitle">
                Pos: {selectedBook}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              className="refresh-btn"
              onClick={() => fetchData(selectedBook, true)}
              disabled={isRefreshing}
              title="Perbarui data dari spreadsheet"
            >
              <span>{isRefreshing ? '⏳' : '🔄'}</span>
              <span className="desktop-only">{isRefreshing ? 'Memperbarui...' : 'Refresh'}</span>
            </button>
            <a
              href="https://t.me/nabung_date_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="bot-badge"
              title="Buka Bot Telegram"
            >
              <span>🤖</span>
              <span>@nabung_date_bot</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="main-content">
        {/* Error Alert Box */}
        {error && (
          <div className="error-alert">
            <div>⚠️ {error}</div>
            <button onClick={() => fetchData(selectedBook)}>
              Coba lagi
            </button>
          </div>
        )}

        {/* 1. TOP HERO TRACKING CARD (Direct replica of Image 2 Top Card) */}
        <section className="track-hero-card">
          <div className="track-hero-header">
            <div>
              <div className="track-hero-label">
                {data?.budget?.monthLabel ? `Budget ${data.budget.monthLabel}` : 'Monthly Budget'}
              </div>
              <div className="track-hero-value">
                {hasBudget ? formatRupiah(budgetAmount) : 'Rp 0'}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div className="track-hero-label">
                Spent (Terpakai)
              </div>
              <div className="track-hero-spent">
                {formatRupiah(spentAmount)}
              </div>
            </div>
          </div>

          {/* Sleek Gradient Progress Bar */}
          <div className="track-bar-track">
            <div
              className="track-bar-fill"
              style={{
                width: `${budgetPct}%`,
                background: budgetPct >= 100
                  ? 'linear-gradient(90deg, #EF4444, #DC2626)'
                  : budgetPct >= 80
                  ? 'linear-gradient(90deg, #F59E0B, #EA580C)'
                  : 'linear-gradient(90deg, #6366F1, #8B5CF6)',
              }}
            />
          </div>

          {/* Progress Bar Caption & Quick Action */}
          <div className="track-bar-caption">
            <span>
              {hasBudget
                ? `${budgetPct}% of budget used`
                : data?.stats?.totalPemasukan && data.stats.totalPemasukan > 0
                ? `${budgetPct}% dari pemasukan terpakai`
                : 'Belum ada batas budget bulanan'}
            </span>
            <button
              onClick={() => {
                setBudgetInput(budgetAmount ? String(budgetAmount) : '');
                setIsEditingBudget(!isEditingBudget);
              }}
              className="track-edit-budget-btn"
            >
              {isEditingBudget ? '✕ Tutup' : '✏️ Atur Budget'}
            </button>
          </div>

          {/* Inline Budget Quick Form */}
          {isEditingBudget && (
            <div className="track-budget-form">
              <input
                type="number"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                placeholder="Target budget (cth: 3000000)"
              />
              <button onClick={handleSaveBudget} disabled={isSavingBudget}>
                {isSavingBudget ? '...' : 'Simpan'}
              </button>
            </div>
          )}

          {/* Integrated 3-Item Financial Status Strip */}
          <div className="track-submetrics-strip">
            <div className="track-submetric">
              <span className="track-submetric-label">📥 Masuk</span>
              <span className="track-submetric-val income">
                +{formatRupiah(data?.stats.totalPemasukan || 0)}
              </span>
            </div>
            <div className="track-submetric">
              <span className="track-submetric-label">📤 Keluar</span>
              <span className="track-submetric-val expense">
                -{formatRupiah(data?.stats.totalPengeluaran || 0)}
              </span>
            </div>
            <div className="track-submetric">
              <span className="track-submetric-label">💰 Saldo Bersih</span>
              <span
                className="track-submetric-val"
                style={{ color: (data?.stats.saldo || 0) >= 0 ? '#10B981' : '#EF4444' }}
              >
                {formatRupiah(data?.stats.saldo || 0)}
              </span>
            </div>
          </div>
        </section>

        {/* 2. COMPACT WALLET CARD (Bank, E-Wallet, Cash) */}
        {data?.stats?.walletBalances && (
          <section className="compact-wallet-card">
            <div className="compact-wallet-grid">
              {/* Bank */}
              <div className="compact-wallet-col">
                <div className="compact-wallet-head">
                  <span className="compact-wallet-icon">🏦</span>
                  <span className="compact-wallet-name">Bank</span>
                </div>
                <div className="compact-wallet-amount">
                  {formatRupiah(data.stats.walletBalances.Bank)}
                </div>
                {data.stats.walletBalances.details &&
                  Object.keys(data.stats.walletBalances.details).some((k) => k.startsWith('Bank')) && (
                    <div className="compact-wallet-chips">
                      {Object.entries(data.stats.walletBalances.details)
                        .filter(([k]) => k.startsWith('Bank'))
                        .map(([k, val]) => (
                          <span key={k} className="compact-wallet-chip">
                            {k.replace(/^Bank - /, '')}: {formatRupiah(val)}
                          </span>
                        ))}
                    </div>
                  )}
              </div>

              {/* E-Wallet */}
              <div className="compact-wallet-col">
                <div className="compact-wallet-head">
                  <span className="compact-wallet-icon">📱</span>
                  <span className="compact-wallet-name">E-Wallet</span>
                </div>
                <div className="compact-wallet-amount">
                  {formatRupiah(data.stats.walletBalances['E-Wallet'])}
                </div>
                {data.stats.walletBalances.details &&
                  Object.keys(data.stats.walletBalances.details).some((k) => k.startsWith('E-Wallet')) && (
                    <div className="compact-wallet-chips">
                      {Object.entries(data.stats.walletBalances.details)
                        .filter(([k]) => k.startsWith('E-Wallet'))
                        .map(([k, val]) => (
                          <span key={k} className="compact-wallet-chip">
                            {k.replace(/^E-Wallet - /, '')}: {formatRupiah(val)}
                          </span>
                        ))}
                    </div>
                  )}
              </div>

              {/* Cash */}
              <div className="compact-wallet-col">
                <div className="compact-wallet-head">
                  <span className="compact-wallet-icon">💵</span>
                  <span className="compact-wallet-name">Cash</span>
                </div>
                <div className="compact-wallet-amount">
                  {formatRupiah(data.stats.walletBalances.Cash)}
                </div>
                <div className="compact-wallet-chips">
                  <span className="compact-wallet-chip">Uang Tunai</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 3. CATEGORIES TRACKING CARD (Direct replica of Image 2 Categories Section) */}
        <section className="categories-card">
          <div className="categories-header">
            <h2 className="categories-title">Categories</h2>
            <span className="categories-count">
              {categoryExpensesList.length} Kategori
            </span>
          </div>

          {categoryExpensesList.length === 0 ? (
            <div className="categories-empty">
              Belum ada catatan pengeluaran pada pos ini.
            </div>
          ) : (
            <div className="categories-list">
              {categoryExpensesList.map((item) => (
                <div key={item.name} className="category-row">
                  {/* Circular Color Icon */}
                  <div
                    className="category-icon-circle"
                    style={{
                      background: item.config.bgColor,
                    }}
                  >
                    <span>{item.config.icon}</span>
                  </div>

                  {/* Center: Title & Mini Bar */}
                  <div className="category-center">
                    <div className="category-name-row">
                      <span className="category-name">{item.name}</span>
                      <span className="category-amount">{formatRupiah(item.amount)}</span>
                    </div>
                    <div className="category-bar-track">
                      <div
                        className="category-bar-fill"
                        style={{
                          width: `${item.percentage}%`,
                          background: item.config.barColor,
                        }}
                      />
                    </div>
                  </div>

                  {/* Right: Percentage Badge */}
                  <div className="category-pct-badge">
                    {item.percentage}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 4. ANALISIS TREN BULANAN (Selalu tampil langsung tanpa dropdown) */}
        {data?.monthlyComparison && data.monthlyComparison.months.length > 0 && (
          <section className="analysis-card">
            <div className="analysis-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.2rem' }}>📈</span>
                <div>
                  <div className="analysis-card-title">
                    Tren & Perbandingan Bulan ke Bulan
                  </div>
                  <div className="analysis-card-subtitle">
                    Analisis riwayat pemasukan dan pengeluaran
                  </div>
                </div>
              </div>
            </div>

            <div className="analysis-card-content">
              {/* 4 Peak Insight Tiles */}
              <div className="comparison-grid">
                <div className="comparison-tile">
                  <div className="comp-label" style={{ color: '#10B981' }}>🏆 Rekor Pemasukan</div>
                  <div className="comp-value">
                    {data.monthlyComparison.highestIncomeMonth ? formatRupiah(data.monthlyComparison.highestIncomeMonth.amount) : '—'}
                  </div>
                  <div className="comp-sub">{data.monthlyComparison.highestIncomeMonth?.monthLabel || '-'}</div>
                </div>

                <div className="comparison-tile">
                  <div className="comp-label" style={{ color: '#EF4444' }}>💸 Rekor Belanja</div>
                  <div className="comp-value">
                    {data.monthlyComparison.highestExpenseMonth ? formatRupiah(data.monthlyComparison.highestExpenseMonth.amount) : '—'}
                  </div>
                  <div className="comp-sub">{data.monthlyComparison.highestExpenseMonth?.monthLabel || '-'}</div>
                </div>

                <div className="comparison-tile">
                  <div className="comp-label" style={{ color: '#0EA5E9' }}>📥 Rata-Rata Masuk</div>
                  <div className="comp-value">
                    {formatRupiah(data.monthlyComparison.averageMonthlyIncome)}
                  </div>
                  <div className="comp-sub">per bulan</div>
                </div>

                <div className="comparison-tile">
                  <div className="comp-label" style={{ color: '#8B5CF6' }}>📤 Rata-Rata Keluar</div>
                  <div className="comp-value">
                    {formatRupiah(data.monthlyComparison.averageMonthlyExpense)}
                  </div>
                  <div className="comp-sub">per bulan</div>
                </div>
              </div>

              {/* Table Perbandingan */}
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table className="comparison-table">
                  <thead>
                    <tr>
                      <th>Bulan</th>
                      <th style={{ textAlign: 'right' }}>Masuk</th>
                      <th style={{ textAlign: 'right' }}>Keluar</th>
                      <th style={{ textAlign: 'right' }}>Sisa</th>
                      <th style={{ textAlign: 'center' }}>Tren</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.monthlyComparison.months.map((m) => (
                      <tr key={m.month}>
                        <td style={{ fontWeight: 600, color: '#1E293B' }}>{m.monthLabel}</td>
                        <td style={{ textAlign: 'right', color: '#10B981', fontWeight: 600 }}>
                          +{formatRupiah(m.income)}
                        </td>
                        <td style={{ textAlign: 'right', color: '#1E293B', fontWeight: 600 }}>
                          -{formatRupiah(m.expense)}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: m.balance >= 0 ? '#10B981' : '#EF4444' }}>
                          {formatRupiah(m.balance)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {m.expenseChangePercent !== undefined ? (
                            <span
                              className="trend-badge"
                              style={{
                                background: m.expenseChangePercent > 0 ? '#FEE2E2' : '#DCFCE7',
                                color: m.expenseChangePercent > 0 ? '#DC2626' : '#16A34A',
                              }}
                            >
                              {m.expenseChangePercent > 0 ? `▲ +${m.expenseChangePercent}%` : `▼ ${m.expenseChangePercent}%`}
                            </span>
                          ) : (
                            <span style={{ color: '#CBD5E1' }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
