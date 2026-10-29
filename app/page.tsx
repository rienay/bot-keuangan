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

function parseDateParts(dateStr: string): { year?: string; month?: string } {
  if (!dateStr) return {};
  const cleaned = String(dateStr).trim().replace(/^'/, '');
  const ymdMatch = cleaned.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (ymdMatch) {
    return {
      year: ymdMatch[1],
      month: ymdMatch[2].padStart(2, '0'),
    };
  }
  const dmyMatch = cleaned.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (dmyMatch) {
    return {
      year: dmyMatch[3],
      month: dmyMatch[2].padStart(2, '0'),
    };
  }
  return {};
}

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return '-';
  const cleaned = String(dateStr).trim().replace(/^'/, '');
  const { year, month } = parseDateParts(cleaned);
  const dayMatch = cleaned.match(/(?:[-/.]|^)(\d{1,2})(?:[-/.]|$)/);
  const day = dayMatch ? dayMatch[1].padStart(2, '0') : '';
  const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const mIdx = month ? parseInt(month, 10) : 0;
  const mName = monthNames[mIdx] || month || '';

  if (day && mName && year) {
    return `${day} ${mName} ${year}`;
  }
  return cleaned;
}

const MONTH_OPTIONS = [
  { value: '01', label: 'Januari' },
  { value: '02', label: 'Februari' },
  { value: '03', label: 'Maret' },
  { value: '04', label: 'April' },
  { value: '05', label: 'Mei' },
  { value: '06', label: 'Juni' },
  { value: '07', label: 'Juli' },
  { value: '08', label: 'Agustus' },
  { value: '09', label: 'September' },
  { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' },
  { value: '12', label: 'Desember' },
];

function getCategoryEmoji(cat?: string, wallet?: string, type?: string): string {
  if (!cat) return type === 'Pemasukan' ? '📥' : '📤';
  const c = cat.toLowerCase();
  if (c.includes('makan') || c.includes('minum') || c.includes('resto') || c.includes('cafe') || c.includes('kopi')) return '☕';
  if (c.includes('kencan') || c.includes('hiburan') || c.includes('nonton') || c.includes('bioskop') || c.includes('date')) return '🍿';
  if (c.includes('belanja') || c.includes('kebutuhan') || c.includes('pasar') || c.includes('supermarket')) return '🛍️';
  if (c.includes('transport') || c.includes('bensin') || c.includes('parkir') || c.includes('ojek') || c.includes('grab') || c.includes('gojek')) return '🚗';
  if (c.includes('tagihan') || c.includes('langganan') || c.includes('wifi') || c.includes('listrik') || c.includes('pulsa')) return '📱';
  if (c.includes('sehat') || c.includes('obat') || c.includes('dokter') || c.includes('apotek') || c.includes('rawat')) return '💊';
  if (c.includes('hadiah') || c.includes('donasi') || c.includes('kado') || c.includes('sedekah')) return '🎁';
  if (c.includes('didik') || c.includes('buku') || c.includes('kursus')) return '📚';
  if (c.includes('gaji') || c.includes('upah')) return '💼';
  if (c.includes('bonus') || c.includes('thr')) return '🎉';
  if (c.includes('tabung') || c.includes('simpan')) return '💰';
  if (c.includes('invest')) return '📈';
  if (c.includes('pindah')) return '🔄';
  return type === 'Pemasukan' ? '📥' : '📤';
}

function getBookEmoji(name: string): string {
  const b = name.toLowerCase();
  if (b === 'semua') return '🌟';
  if (b.includes('tabung') || b.includes('kas')) return '📌';
  if (b.includes('libur') || b.includes('trip') || b.includes('wisata')) return '✈️';
  if (b.includes('date') || b.includes('ngedate') || b.includes('kencan')) return '🍕';
  if (b.includes('nikah') || b.includes('kawin')) return '💍';
  if (b.includes('rumah')) return '🏡';
  if (b.includes('mobil') || b.includes('motor')) return '🛵';
  return '📖';
}

export default function FinanceDashboardPage() {
  const [data, setData] = useState<WebFinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBook, setSelectedBook] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'Pemasukan' | 'Pengeluaran' | 'with_receipt'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedWallet, setSelectedWallet] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState(25);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // State untuk form edit budget bulanan
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const [isSavingBudget, setIsSavingBudget] = useState(false);

  // State toggle accordion perbandingan bulanan
  const [showComparison, setShowComparison] = useState(false);

  const fetchData = async (book: string = 'Semua', showRefreshSpinner = false) => {
    if (showRefreshSpinner) setIsRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/finances?book=${encodeURIComponent(book)}`);
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
      const b = params.get('book');
      if (b) {
        setSelectedBook(b);
      }
    }
  }, []);

  useEffect(() => {
    fetchData(selectedBook);
    setVisibleCount(25);
  }, [selectedBook]);

  const handleSelectBook = (book: string) => {
    setSelectedBook(book);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (book === 'Semua') {
        url.searchParams.delete('book');
      } else {
        url.searchParams.set('book', book);
      }
      window.history.pushState({}, '', url.toString());
    }
  };

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

  const availableYears = useMemo(() => {
    if (!data?.transactions) return [];
    const years = new Set<string>();
    data.transactions.forEach((tx) => {
      const { year } = parseDateParts(tx.date);
      if (year) years.add(year);
    });
    return Array.from(years).sort().reverse();
  }, [data?.transactions]);

  const availableCategories = useMemo(() => {
    if (!data?.transactions) return [];
    const cats = new Set<string>();
    data.transactions.forEach((tx) => {
      if (tx.category && tx.category !== '-') {
        cats.add(tx.category);
      }
    });
    return Array.from(cats).sort();
  }, [data?.transactions]);

  const availableWallets = useMemo(() => {
    if (!data?.transactions) return [];
    const wallets = new Set<string>();
    data.transactions.forEach((tx) => {
      if (tx.wallet) wallets.add(tx.wallet);
    });
    return Array.from(wallets).sort();
  }, [data?.transactions]);

  const filteredTransactions = useMemo(() => {
    if (!data?.transactions) return [];

    return data.transactions.filter((tx) => {
      if (typeFilter === 'Pemasukan' && tx.type !== 'Pemasukan') return false;
      if (typeFilter === 'Pengeluaran' && tx.type !== 'Pengeluaran') return false;
      if (typeFilter === 'with_receipt' && !tx.noteLink) return false;

      if (selectedCategory !== 'all' && tx.category !== selectedCategory) return false;

      // Filter Dompet
      if (selectedWallet !== 'all') {
        const w = (tx.wallet || 'Bank').toLowerCase();
        if (selectedWallet === 'Bank') {
          if (!w.startsWith('bank')) return false;
        } else if (selectedWallet === 'E-Wallet') {
          if (!w.startsWith('e-wallet') && !w.startsWith('ewallet') && !w.includes('dana') && !w.includes('gopay') && !w.includes('shopee') && !w.includes('ovo')) return false;
        } else if (selectedWallet === 'Cash') {
          if (!w.startsWith('cash') && !w.startsWith('tunai')) return false;
        } else {
          if ((tx.wallet || 'Bank') !== selectedWallet) return false;
        }
      }

      if (selectedYear !== 'all' || selectedMonth !== 'all') {
        const { year, month } = parseDateParts(tx.date);
        if (selectedYear !== 'all' && year !== selectedYear) return false;
        if (selectedMonth !== 'all' && month !== selectedMonth) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchDesc = tx.description.toLowerCase().includes(q);
        const matchCat = tx.category.toLowerCase().includes(q);
        const matchPic = tx.pic ? tx.pic.toLowerCase().includes(q) : false;
        const matchBook = tx.book.toLowerCase().includes(q);
        const matchDate = tx.date.toLowerCase().includes(q);
        const matchAmount = String(tx.amount).includes(q);

        return matchDesc || matchCat || matchPic || matchBook || matchDate || matchAmount;
      }

      return true;
    });
  }, [data?.transactions, typeFilter, selectedCategory, selectedMonth, selectedYear, selectedWallet, searchQuery]);

  const hasActiveFilters =
    typeFilter !== 'all' ||
    selectedCategory !== 'all' ||
    selectedMonth !== 'all' ||
    selectedYear !== 'all' ||
    selectedWallet !== 'all' ||
    searchQuery.trim() !== '';

  const handleResetFilters = () => {
    setTypeFilter('all');
    setSelectedCategory('all');
    setSelectedMonth('all');
    setSelectedYear('all');
    setSelectedWallet('all');
    setSearchQuery('');
  };

  const categoryStats = useMemo(() => {
    const expensesByCategory: Record<string, number> = {};
    filteredTransactions.forEach((tx) => {
      if (tx.type === 'Pengeluaran') {
        const cat = tx.category || 'Lain-lain';
        expensesByCategory[cat] = (expensesByCategory[cat] || 0) + tx.amount;
      }
    });

    return Object.entries(expensesByCategory).sort((a, b) => b[1] - a[1]);
  }, [filteredTransactions]);

  return (
    <>
      {/* iOS Frosted Glass Navbar */}
      <header className="navbar">
        <div className="nav-container">
          <div className="brand">
            <div className="brand-icon">💕</div>
            <div className="brand-text">
              <div className="brand-title">Tabungan Kita</div>
              <div className="brand-subtitle">
                {selectedBook === 'Semua' ? 'Seluruh Pos Tabungan' : `Pos: ${selectedBook}`}
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
        {/* iOS Segmented Book Selector */}
        <section className="book-nav-wrapper">
          <div className="book-nav-track">
            {data?.books && data.books.length > 0 ? (
              data.books.map((b) => {
                const isSelected = selectedBook === b;
                const balance = data?.bookBalances?.[b];
                const emoji = getBookEmoji(b);

                return (
                  <button
                    key={b}
                    className={`book-tab-btn ${isSelected ? 'active' : ''}`}
                    onClick={() => handleSelectBook(b)}
                  >
                    <span>{emoji}</span>
                    <span>{b === 'Semua' ? 'Semua Pos' : b}</span>
                    {balance !== undefined && (
                      <span className="book-tab-badge">
                        {formatRupiah(balance)}
                      </span>
                    )}
                  </button>
                );
              })
            ) : (
              <button className="book-tab-btn active">Memuat Pos Tabungan...</button>
            )}
          </div>
        </section>

        {/* Error Alert Box */}
        {error && (
          <div
            style={{
              background: '#FFF1F2',
              border: '0.5px solid rgba(255, 59, 48, 0.2)',
              borderRadius: '16px',
              padding: '0.85rem 1rem',
              color: '#FF3B30',
              fontSize: '0.85rem',
              fontWeight: 600,
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>⚠️ {error}</div>
            <button
              onClick={() => fetchData(selectedBook)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#FF3B30',
                fontWeight: 700,
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Coba lagi
            </button>
          </div>
        )}

        {/* Hero Balance Card (Apple Wallet Style) */}
        <section className="hero-balance-card">
          <div className="hero-balance-label">
            Sisa Saldo Bersih • {selectedBook === 'Semua' ? 'Semua Pos' : selectedBook}
          </div>
          <div
            className="hero-balance-amount"
            style={{ color: (data?.stats.saldo || 0) >= 0 ? '#1C1C1E' : '#FF3B30' }}
          >
            {loading && !data ? '...' : formatRupiah(data?.stats.saldo || 0)}
          </div>
          <div className="hero-balance-status">
            {(data?.stats.saldo || 0) >= 0 ? (
              <span style={{ color: '#34C759' }}>🟢 Tabungan aman & surplus</span>
            ) : (
              <span style={{ color: '#FF3B30' }}>🔻 Pengeluaran melebihi tabungan</span>
            )}
            <span style={{ color: '#8E8E93', fontWeight: 400 }}>•</span>
            <span style={{ color: '#8E8E93' }}>{data?.stats.count || 0} Transaksi</span>
          </div>

          <div className="balance-submetrics">
            <div className="submetric-item">
              <div className="submetric-label">
                <span>📥</span>
                <span>Total Pemasukan</span>
              </div>
              <div className="submetric-value" style={{ color: '#34C759' }}>
                +{formatRupiah(data?.stats.totalPemasukan || 0)}
              </div>
            </div>

            <div className="submetric-item">
              <div className="submetric-label">
                <span>📤</span>
                <span>Total Pengeluaran</span>
              </div>
              <div className="submetric-value" style={{ color: '#1C1C1E' }}>
                -{formatRupiah(data?.stats.totalPengeluaran || 0)}
              </div>
            </div>
          </div>
        </section>

        {/* Saldo Dompet Tiles (Bank, E-Wallet, Cash) */}
        {data?.stats?.walletBalances && (
          <section className="wallets-container">
            {/* Tile Bank */}
            <div className="wallet-tile">
              <div>
                <div className="wallet-tile-header">
                  <span className="wallet-tile-icon">🏦</span>
                  <span className="wallet-tile-name">Bank</span>
                </div>
                <div className="wallet-tile-amount">
                  {formatRupiah(data.stats.walletBalances.Bank)}
                </div>
              </div>
              {data.stats.walletBalances.details && Object.keys(data.stats.walletBalances.details).some((k) => k.startsWith('Bank')) && (
                <div className="wallet-details-chips">
                  {Object.entries(data.stats.walletBalances.details)
                    .filter(([k]) => k.startsWith('Bank'))
                    .map(([k, val]) => (
                      <span key={k} className="wallet-chip">
                        {k.replace(/^Bank - /, '')}: {formatRupiah(val)}
                      </span>
                    ))}
                </div>
              )}
            </div>

            {/* Tile E-Wallet */}
            <div className="wallet-tile">
              <div>
                <div className="wallet-tile-header">
                  <span className="wallet-tile-icon">📱</span>
                  <span className="wallet-tile-name">E-Wallet</span>
                </div>
                <div className="wallet-tile-amount">
                  {formatRupiah(data.stats.walletBalances['E-Wallet'])}
                </div>
              </div>
              {data.stats.walletBalances.details && Object.keys(data.stats.walletBalances.details).some((k) => k.startsWith('E-Wallet')) && (
                <div className="wallet-details-chips">
                  {Object.entries(data.stats.walletBalances.details)
                    .filter(([k]) => k.startsWith('E-Wallet'))
                    .map(([k, val]) => (
                      <span key={k} className="wallet-chip">
                        {k.replace(/^E-Wallet - /, '')}: {formatRupiah(val)}
                      </span>
                    ))}
                </div>
              )}
            </div>

            {/* Tile Cash */}
            <div className="wallet-tile">
              <div>
                <div className="wallet-tile-header">
                  <span className="wallet-tile-icon">💵</span>
                  <span className="wallet-tile-name">Cash</span>
                </div>
                <div className="wallet-tile-amount">
                  {formatRupiah(data.stats.walletBalances.Cash)}
                </div>
              </div>
              <div className="wallet-details-chips">
                <span className="wallet-chip">Uang Fisik</span>
              </div>
            </div>
          </section>
        )}

        {/* Monthly Budget Card (iOS Activity/Battery Ring Style) */}
        {data?.budget && (
          <section className="ios-card" style={{ padding: '1.15rem 1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span style={{ fontSize: '1.2rem' }}>🎯</span>
                <div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#000000' }}>
                    Budget {data.budget.monthLabel}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#8E8E93' }}>
                    Pos: {selectedBook === 'Semua' ? 'Tabungan Utama' : selectedBook}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.55rem',
                    borderRadius: '9999px',
                    background:
                      data.budget.status === 'overbudget'
                        ? 'rgba(255, 59, 48, 0.12)'
                        : data.budget.status === 'warning'
                        ? 'rgba(255, 149, 0, 0.12)'
                        : data.budget.status === 'half'
                        ? 'rgba(255, 204, 0, 0.18)'
                        : data.budget.amount > 0
                        ? 'rgba(52, 199, 89, 0.12)'
                        : 'rgba(142, 142, 147, 0.12)',
                    color:
                      data.budget.status === 'overbudget'
                        ? '#FF3B30'
                        : data.budget.status === 'warning'
                        ? '#FF9500'
                        : data.budget.status === 'half'
                        ? '#B25E00'
                        : data.budget.amount > 0
                        ? '#34C759'
                        : '#8E8E93',
                  }}
                >
                  {data.budget.status === 'overbudget'
                    ? '🛑 Habis / Overbudget'
                    : data.budget.status === 'warning'
                    ? '🚨 Hampir Habis'
                    : data.budget.status === 'half'
                    ? '⚠️ 50% Terpakai'
                    : data.budget.amount > 0
                    ? '🟢 Terkendali'
                    : 'Belum Diatur'}
                </span>

                <button
                  onClick={() => {
                    setBudgetInput(data.budget?.amount ? String(data.budget.amount) : '');
                    setIsEditingBudget(!isEditingBudget);
                  }}
                  style={{
                    border: 'none',
                    background: 'var(--ios-bg)',
                    color: 'var(--ios-pink)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '0.25rem 0.6rem',
                    borderRadius: '9999px',
                    cursor: 'pointer',
                  }}
                >
                  {isEditingBudget ? '✕ Tutup' : '✏️ Atur'}
                </button>
              </div>
            </div>

            {/* Inline Budget Form */}
            {isEditingBudget && (
              <div
                style={{
                  background: 'var(--ios-bg)',
                  borderRadius: '12px',
                  padding: '0.85rem',
                  marginBottom: '0.85rem',
                  display: 'flex',
                  gap: '0.5rem',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <input
                  type="number"
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  placeholder="Target budget (misal: 3000000)"
                  style={{
                    flex: 1,
                    minWidth: '150px',
                    height: '36px',
                    border: '0.5px solid rgba(60, 60, 67, 0.15)',
                    borderRadius: '8px',
                    padding: '0 0.65rem',
                    fontSize: '16px', // prevents iOS auto-zoom
                    outline: 'none',
                    background: '#FFFFFF',
                  }}
                />
                <button
                  onClick={handleSaveBudget}
                  disabled={isSavingBudget}
                  style={{
                    height: '36px',
                    padding: '0 1rem',
                    borderRadius: '8px',
                    background: '#FF2D55',
                    color: '#FFFFFF',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                  }}
                >
                  {isSavingBudget ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            )}

            {/* Budget Progress Bar */}
            {data.budget.amount > 0 ? (
              <>
                <div
                  style={{
                    height: '8px',
                    width: '100%',
                    background: 'var(--ios-bg)',
                    borderRadius: '9999px',
                    overflow: 'hidden',
                    margin: '0.65rem 0',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, data.budget.percentage)}%`,
                      borderRadius: '9999px',
                      background:
                        data.budget.percentage >= 100
                          ? '#FF3B30'
                          : data.budget.percentage >= 80
                          ? '#FF9500'
                          : '#34C759',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', color: '#8E8E93', marginTop: '0.2rem' }}>
                  <span>
                    Terpakai: <b style={{ color: '#1C1C1E' }}>{formatRupiah(data.budget.spent)}</b> ({data.budget.percentage}%)
                  </span>
                  <span>
                    Sisa: <b style={{ color: data.budget.remaining < 0 ? '#FF3B30' : '#34C759' }}>{formatRupiah(data.budget.remaining)}</b>
                  </span>
                </div>
              </>
            ) : (
              <div style={{ fontSize: '0.78rem', color: '#8E8E93', padding: '0.25rem 0' }}>
                Belum ada batas budget untuk pos ini. Klik <b>✏️ Atur</b> atau ketik <code style={{ background: 'var(--ios-bg)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>/budget 3jt</code> di Telegram.
              </div>
            )}
          </section>
        )}

        {/* Month-over-Month Comparison Report Card (Collapsible) */}
        {data?.monthlyComparison && data.monthlyComparison.months.length > 0 && (
          <section className="ios-card" style={{ padding: '1.15rem 1.25rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                userSelect: 'none',
              }}
              onClick={() => setShowComparison(!showComparison)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span style={{ fontSize: '1.2rem' }}>📈</span>
                <div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#000000' }}>
                    Tren & Perbandingan Bulan ke Bulan
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#8E8E93' }}>
                    Rekor pemasukan & riwayat belanja
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '0.85rem', color: '#8E8E93', transform: showComparison ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                ▼
              </div>
            </div>

            {showComparison && (
              <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '0.5px solid var(--ios-separator)' }}>
                {/* 4 Peak Insight Tiles */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
                  <div style={{ background: 'var(--ios-bg)', borderRadius: '10px', padding: '0.65rem 0.75rem' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#34C759', textTransform: 'uppercase' }}>🏆 Rekor Pemasukan</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1C1C1E', marginTop: '0.15rem' }}>
                      {data.monthlyComparison.highestIncomeMonth ? formatRupiah(data.monthlyComparison.highestIncomeMonth.amount) : '—'}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#8E8E93' }}>
                      {data.monthlyComparison.highestIncomeMonth?.monthLabel || '-'}
                    </div>
                  </div>

                  <div style={{ background: 'var(--ios-bg)', borderRadius: '10px', padding: '0.65rem 0.75rem' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#FF3B30', textTransform: 'uppercase' }}>💸 Rekor Belanja</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1C1C1E', marginTop: '0.15rem' }}>
                      {data.monthlyComparison.highestExpenseMonth ? formatRupiah(data.monthlyComparison.highestExpenseMonth.amount) : '—'}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#8E8E93' }}>
                      {data.monthlyComparison.highestExpenseMonth?.monthLabel || '-'}
                    </div>
                  </div>

                  <div style={{ background: 'var(--ios-bg)', borderRadius: '10px', padding: '0.65rem 0.75rem' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#007AFF', textTransform: 'uppercase' }}>📥 Rata-Rata Masuk</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1C1C1E', marginTop: '0.15rem' }}>
                      {formatRupiah(data.monthlyComparison.averageMonthlyIncome)}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#8E8E93' }}>per bulan</div>
                  </div>

                  <div style={{ background: 'var(--ios-bg)', borderRadius: '10px', padding: '0.65rem 0.75rem' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#AF52DE', textTransform: 'uppercase' }}>📤 Rata-Rata Keluar</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1C1C1E', marginTop: '0.15rem' }}>
                      {formatRupiah(data.monthlyComparison.averageMonthlyExpense)}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#8E8E93' }}>per bulan</div>
                  </div>
                </div>

                {/* Table Perbandingan */}
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                    <thead>
                      <tr style={{ color: '#8E8E93', borderBottom: '0.5px solid var(--ios-separator)', textAlign: 'left' }}>
                        <th style={{ padding: '0.5rem 0.4rem' }}>Bulan</th>
                        <th style={{ padding: '0.5rem 0.4rem', textAlign: 'right' }}>Masuk</th>
                        <th style={{ padding: '0.5rem 0.4rem', textAlign: 'right' }}>Keluar</th>
                        <th style={{ padding: '0.5rem 0.4rem', textAlign: 'right' }}>Sisa</th>
                        <th style={{ padding: '0.5rem 0.4rem', textAlign: 'center' }}>Tren</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.monthlyComparison.months.map((m) => (
                        <tr key={m.month} style={{ borderBottom: '0.5px solid rgba(60, 60, 67, 0.05)' }}>
                          <td style={{ padding: '0.5rem 0.4rem', fontWeight: 600, color: '#1C1C1E' }}>
                            {m.monthLabel}
                          </td>
                          <td style={{ padding: '0.5rem 0.4rem', textAlign: 'right', color: '#34C759', fontWeight: 600 }}>
                            +{formatRupiah(m.income)}
                          </td>
                          <td style={{ padding: '0.5rem 0.4rem', textAlign: 'right', color: '#1C1C1E', fontWeight: 600 }}>
                            -{formatRupiah(m.expense)}
                          </td>
                          <td style={{ padding: '0.5rem 0.4rem', textAlign: 'right', fontWeight: 700, color: m.balance >= 0 ? '#34C759' : '#FF3B30' }}>
                            {formatRupiah(m.balance)}
                          </td>
                          <td style={{ padding: '0.5rem 0.4rem', textAlign: 'center' }}>
                            {m.expenseChangePercent !== undefined ? (
                              <span
                                style={{
                                  fontSize: '0.68rem',
                                  padding: '0.1rem 0.35rem',
                                  borderRadius: '9999px',
                                  fontWeight: 600,
                                  background: m.expenseChangePercent > 0 ? 'rgba(255, 59, 48, 0.1)' : 'rgba(52, 199, 89, 0.1)',
                                  color: m.expenseChangePercent > 0 ? '#FF3B30' : '#34C759',
                                }}
                              >
                                {m.expenseChangePercent > 0 ? `▲ +${m.expenseChangePercent}%` : `▼ ${m.expenseChangePercent}%`}
                              </span>
                            ) : (
                              <span style={{ color: '#C7C7CC' }}>—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Filter & Search Bar */}
        <section className="controls-card">
          <div className="search-field">
            <span className="search-field-icon">🔍</span>
            <input
              type="text"
              placeholder="Cari keterangan, kategori, atau PIC..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#8E8E93',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                ✕
              </button>
            )}
          </div>

          <div className="filter-pills-row">
            {/* Filter Jenis */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="ios-select"
            >
              <option value="all">Semua Jenis</option>
              <option value="Pemasukan">📥 Pemasukan Saja</option>
              <option value="Pengeluaran">📤 Pengeluaran Saja</option>
              <option value="with_receipt">📎 Ada Nota Saja</option>
            </select>

            {/* Filter Dompet */}
            <select
              value={selectedWallet}
              onChange={(e) => setSelectedWallet(e.target.value)}
              className="ios-select"
            >
              <option value="all">💳 Semua Dompet</option>
              <option value="Bank">🏦 Bank (Semua)</option>
              <option value="E-Wallet">📱 E-Wallet (Semua)</option>
              <option value="Cash">💵 Cash</option>
              {availableWallets
                .filter((w) => !['Bank', 'E-Wallet', 'Cash'].includes(w))
                .map((w) => (
                  <option key={w} value={w}>
                    {w.toLowerCase().includes('wallet') ? '📱' : w.toLowerCase().includes('cash') ? '💵' : '🏦'} {w}
                  </option>
                ))}
            </select>

            {/* Filter Bulan */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="ios-select"
            >
              <option value="all">📅 Semua Bulan</option>
              {MONTH_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>

            {/* Filter Tahun */}
            {availableYears.length > 0 && (
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="ios-select"
              >
                <option value="all">🗓️ Semua Tahun</option>
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            )}

            {/* Reset Button */}
            {hasActiveFilters && (
              <button onClick={handleResetFilters} className="btn-filter-reset">
                ✕ Reset
              </button>
            )}
          </div>

          {/* Category Quick Chips */}
          {availableCategories.length > 0 && (
            <div className="chips-scroll">
              <button
                className={`cat-pill ${selectedCategory === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('all')}
              >
                Semua Kategori
              </button>
              {availableCategories.map((cat) => (
                <button
                  key={cat}
                  className={`cat-pill ${selectedCategory === cat ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(selectedCategory === cat ? 'all' : cat)}
                >
                  <span>{getCategoryEmoji(cat)}</span>
                  <span>{cat}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Transactions List (iOS Inset Grouped Table View) */}
        <section>
          <div className="transactions-header">
            <h2 className="transactions-title">
              Riwayat Transaksi
            </h2>
            <span className="transactions-count">
              {filteredTransactions.length} transaksi
            </span>
          </div>

          {loading && !data ? (
            <div className="empty-state">
              <div className="empty-icon">⏳</div>
              <div className="empty-title">Memuat data...</div>
              <div className="empty-desc">Mengambil transaksi langsung dari Google Sheets.</div>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🌸</div>
              <div className="empty-title">Tidak ada transaksi</div>
              <div className="empty-desc">
                {searchQuery
                  ? `Tidak ada transaksi yang cocok dengan "${searchQuery}".`
                  : 'Belum ada catatan transaksi pada filter ini.'}
              </div>
            </div>
          ) : (
            <div className="ios-list-group">
              {filteredTransactions.slice(0, visibleCount).map((tx, idx) => {
                const isIncome = tx.type === 'Pemasukan';
                const emoji = getCategoryEmoji(tx.category, tx.wallet, tx.type);
                const isCash = (tx.wallet || '').toLowerCase().includes('cash');
                const isEw =
                  (tx.wallet || '').toLowerCase().includes('wallet') ||
                  (tx.wallet || '').toLowerCase().includes('dana') ||
                  (tx.wallet || '').toLowerCase().includes('gopay') ||
                  (tx.wallet || '').toLowerCase().includes('shopee') ||
                  (tx.wallet || '').toLowerCase().includes('ovo');
                const walletIcon = isCash ? '💵' : isEw ? '📱' : '🏦';

                return (
                  <div key={tx.id || idx} className="ios-row">
                    {/* Left Icon Badge */}
                    <div
                      className="ios-row-icon"
                      style={{
                        background: isIncome ? 'rgba(52, 199, 89, 0.12)' : 'rgba(255, 45, 85, 0.08)',
                      }}
                    >
                      {emoji}
                    </div>

                    {/* Center Info (Guaranteed no collision with min-width: 0 & flex: 1) */}
                    <div className="ios-row-main">
                      <div className="ios-row-title">
                        {tx.description || tx.category || 'Transaksi'}
                      </div>
                      <div className="ios-row-meta">
                        <span>{formatDateDisplay(tx.date)}</span>
                        <span>•</span>
                        <span
                          className="ios-badge-pill"
                          style={{
                            background: isCash
                              ? 'rgba(52, 199, 89, 0.1)'
                              : isEw
                              ? 'rgba(175, 82, 222, 0.1)'
                              : 'rgba(0, 122, 255, 0.1)',
                            color: isCash ? '#34C759' : isEw ? '#AF52DE' : '#007AFF',
                          }}
                        >
                          <span>{walletIcon}</span>
                          <span>{tx.wallet || 'Bank'}</span>
                        </span>
                        <span>•</span>
                        <span
                          className="ios-badge-pill"
                          style={{
                            background: 'var(--ios-bg)',
                            color: 'var(--ios-secondary-label)',
                          }}
                        >
                          {tx.category}
                        </span>
                        {selectedBook === 'Semua' && (
                          <>
                            <span>•</span>
                            <span style={{ color: '#8E8E93' }}>{tx.book}</span>
                          </>
                        )}
                        {tx.pic && (
                          <>
                            <span>•</span>
                            <span style={{ color: '#8E8E93' }}>{tx.pic}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Right Amount & Receipt Button */}
                    <div className="ios-row-end">
                      <div className={`ios-row-amount ${isIncome ? 'income' : 'expense'}`}>
                        {isIncome ? '+' : '-'} {formatRupiah(tx.amount)}
                      </div>
                      {tx.noteLink && (
                        <div>
                          <a
                            href={tx.noteLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ios-nota-btn"
                            title="Buka bukti nota"
                          >
                            <span>📎</span>
                            <span>Nota</span>
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Load More Button */}
          {filteredTransactions.length > visibleCount && (
            <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
              <button
                onClick={() => setVisibleCount((prev) => prev + 25)}
                style={{
                  padding: '0.65rem 1.5rem',
                  borderRadius: '9999px',
                  background: '#FFFFFF',
                  border: '0.5px solid rgba(60, 60, 67, 0.15)',
                  color: '#000000',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                }}
              >
                Muat Lebih Banyak ({filteredTransactions.length - visibleCount} tersisa)
              </button>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
