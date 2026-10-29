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
  // Format YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = cleaned.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (ymdMatch) {
    return {
      year: ymdMatch[1],
      month: ymdMatch[2].padStart(2, '0'),
    };
  }
  // Format DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = cleaned.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (dmyMatch) {
    return {
      year: dmyMatch[3],
      month: dmyMatch[2].padStart(2, '0'),
    };
  }
  return {};
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

  // State untuk form edit budget bulanan di web
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const [isSavingBudget, setIsSavingBudget] = useState(false);

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

  // Baca URL query parameter saat pertama kali buka web (misal: ?book=Liburan)
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

  // Handler pindah buku & update URL agar 1 buku = 1 web URL
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

  // Daftar tahun unik dari data
  const availableYears = useMemo(() => {
    if (!data?.transactions) return [];
    const years = new Set<string>();
    data.transactions.forEach((tx) => {
      const { year } = parseDateParts(tx.date);
      if (year) years.add(year);
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [data?.transactions]);

  // Daftar kategori unik dari data
  const availableCategories = useMemo(() => {
    if (!data?.transactions) return [];
    const cats = new Set<string>();
    data.transactions.forEach((tx) => {
      if (tx.category && tx.category.trim()) cats.add(tx.category.trim());
    });
    return Array.from(cats).sort((a, b) => a.localeCompare(b));
  }, [data?.transactions]);

  // Filter transaksi berdasarkan search, jenis, kategori, bulan, dan tahun
  const filteredTransactions = useMemo(() => {
    if (!data?.transactions) return [];

    return data.transactions.filter((tx) => {
      // Filter Jenis
      if (typeFilter === 'Pemasukan' && tx.type !== 'Pemasukan') return false;
      if (typeFilter === 'Pengeluaran' && tx.type !== 'Pengeluaran') return false;
      if (typeFilter === 'with_receipt' && !tx.noteLink) return false;

      // Filter Kategori
      if (selectedCategory !== 'all' && tx.category !== selectedCategory) return false;

      // Filter Dompet
      if (selectedWallet !== 'all' && (tx.wallet || 'Bank') !== selectedWallet) return false;

      // Filter Bulan & Tahun
      if (selectedYear !== 'all' || selectedMonth !== 'all') {
        const { year, month } = parseDateParts(tx.date);
        if (selectedYear !== 'all' && year !== selectedYear) return false;
        if (selectedMonth !== 'all' && month !== selectedMonth) return false;
      }

      // Filter Search (keterangan, kategori, PIC, tanggal, buku)
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

  // Ringkasan metrik dari transaksi yang sedang difilter
  const filteredSummary = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const tx of filteredTransactions) {
      if (tx.type === 'Pemasukan') income += tx.amount;
      else expense += tx.amount;
    }
    return {
      income,
      expense,
      balance: income - expense,
      count: filteredTransactions.length,
    };
  }, [filteredTransactions]);

  const isAnyFilterActive =
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

  // Hitung kategori unik untuk chip breakdown
  const categoryStats = useMemo(() => {
    if (!data?.stats?.categoryExpenses) return [];
    return Object.entries(data.stats.categoryExpenses)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8); // Top 8 kategori
  }, [data?.stats?.categoryExpenses]);

  return (
    <div>
      {/* Top Glass Navbar */}
      <nav className="navbar">
        <div className="nav-container">
          <a href="#" className="brand">
            <div className="brand-icon">💕</div>
            <div>
              <div className="brand-title">Tabungan & Keuangan Kita</div>
              <div className="brand-subtitle">Catatan Pengeluaran & Tabungan Bersama</div>
            </div>
          </a>

          <a
            href="https://t.me/nabung_date_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="bot-badge"
            title="Catat pengeluaran lewat Telegram"
          >
            <span>🤖</span>
            <span>@nabung_date_bot</span>
          </a>
        </div>
      </nav>

      <main className="main-wrapper">
        {/* Hero Section */}
        <header className="hero-banner">
          <div className="hero-tag">💕 Tabungan & Keuangan Bersama</div>
          <h1 className="hero-title">Nabung & Catat Pengeluaran Bareng Jadi Makin Teratur</h1>
          <p className="hero-desc">
            Pantau seluruh saldo tabungan bersama, pengeluaran harian & date, serta bukti struk nota secara rapi & transparan.
          </p>
        </header>

        {/* Tab Pilihan Pos / Buku ("1 Buku 1 Tampilan") */}
        <div className="book-tabs-container">
          <div className="book-tabs" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {data?.books && data.books.length > 0 ? (
              data.books.map((b) => {
                const isSelected = selectedBook === b;
                const balance = data?.bookBalances?.[b];
                const emoji =
                  b === 'Semua'
                    ? '🌟'
                    : b.toLowerCase() === 'tabungan' || b.toLowerCase() === 'kas'
                    ? '📌'
                    : b.toLowerCase().includes('libur')
                    ? '✈️'
                    : b.toLowerCase().includes('date') || b.toLowerCase().includes('ngedate')
                    ? '🍕'
                    : b.toLowerCase().includes('nikah')
                    ? '💍'
                    : '📖';

                return (
                  <button
                    key={b}
                    className={`book-tab-btn ${isSelected ? 'active' : ''}`}
                    onClick={() => handleSelectBook(b)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      padding: '0.55rem 1rem',
                      borderRadius: '9999px',
                      fontSize: '0.88rem',
                      fontWeight: isSelected ? 800 : 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <span>{emoji}</span>
                    <span>{b === 'Semua' ? 'Semua Pos' : b}</span>
                    {balance !== undefined && (
                      <span
                        style={{
                          fontSize: '0.72rem',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '9999px',
                          background: isSelected ? '#FFFFFF' : 'rgba(244, 63, 94, 0.1)',
                          color: isSelected ? '#BE123C' : '#9F1239',
                          fontWeight: 700,
                        }}
                      >
                        {formatRupiah(balance)}
                      </span>
                    )}
                  </button>
                );
              })
            ) : (
              <button className="book-tab-btn active">Memuat Pos...</button>
            )}
          </div>
        </div>

        {/* Status Error atau Loading */}
        {error && (
          <div style={{ background: '#FFF1F2', border: '1px solid #FECDD3', padding: '1rem', borderRadius: '12px', color: '#BE123C', marginBottom: '1.5rem', fontWeight: 600 }}>
            ⚠️ {error}
            <button onClick={() => fetchData(selectedBook)} style={{ marginLeft: '1rem', textDecoration: 'underline', background: 'none', border: 'none', color: '#BE123C', cursor: 'pointer', fontWeight: 700 }}>
              Coba lagi
            </button>
          </div>
        )}

        {/* Stat Cards Grid */}
        <section className="stats-grid">
          {/* Card Saldo */}
          <div className="stat-card hero-stat">
            <div className="stat-header">
              <span className="stat-label">Sisa Saldo Bersih</span>
              <div className="stat-icon" style={{ background: '#FCE7F3', color: '#BE123C' }}>💰</div>
            </div>
            <div className="stat-value" style={{ color: (data?.stats.saldo || 0) >= 0 ? '#047857' : '#BE123C' }}>
              {loading && !data ? '...' : formatRupiah(data?.stats.saldo || 0)}
            </div>
            <div className="stat-subtext">
              {(data?.stats.saldo || 0) >= 0 ? '🟢 Tabungan aman & surplus' : '🔻 Pengeluaran melebihi tabungan'}
            </div>
          </div>

          {/* Card Pemasukan */}
          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-label">Total Pemasukan</span>
              <div className="stat-icon" style={{ background: '#ECFDF5', color: '#047857' }}>📥</div>
            </div>
            <div className="stat-value" style={{ color: '#047857' }}>
              {loading && !data ? '...' : formatRupiah(data?.stats.totalPemasukan || 0)}
            </div>
            <div className="stat-subtext">Akumulasi dana masuk</div>
          </div>

          {/* Card Pengeluaran */}
          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-label">Total Pengeluaran</span>
              <div className="stat-icon" style={{ background: '#FFF1F2', color: '#BE123C' }}>📤</div>
            </div>
            <div className="stat-value" style={{ color: '#BE123C' }}>
              {loading && !data ? '...' : formatRupiah(data?.stats.totalPengeluaran || 0)}
            </div>
            <div className="stat-subtext">Total realisasi belanja</div>
          </div>

          {/* Card Jumlah Transaksi */}
          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-label">Total Transaksi</span>
              <div className="stat-icon" style={{ background: '#FAF5FF', color: '#7E22CE' }}>🧾</div>
            </div>
            <div className="stat-value">
              {loading && !data ? '...' : `${data?.stats.count || 0} Kali`}
            </div>
            <div className="stat-subtext">Data tercatat lengkap</div>
          </div>
        </section>

        {/* Status Saldo Per Dompet (Bank, E-Wallet, Cash) */}
        {data?.stats?.walletBalances && (
          <section
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                padding: '1.1rem 1.25rem',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                boxShadow: '0 2px 8px rgba(59, 130, 246, 0.05)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: '#EFF6FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.35rem',
                }}
              >
                🏦
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Saldo Bank
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1E3A8A' }}>
                  {formatRupiah(data.stats.walletBalances.Bank)}
                </div>
              </div>
            </div>

            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                padding: '1.1rem 1.25rem',
                border: '1px solid rgba(139, 92, 246, 0.25)',
                boxShadow: '0 2px 8px rgba(139, 92, 246, 0.05)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: '#F5F3FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.35rem',
                }}
              >
                📱
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Saldo E-Wallet
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#5B21B6' }}>
                  {formatRupiah(data.stats.walletBalances['E-Wallet'])}
                </div>
              </div>
            </div>

            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                padding: '1.1rem 1.25rem',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.05)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: '#ECFDF5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.35rem',
                }}
              >
                💵
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Saldo Tunai (Cash)
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#065F46' }}>
                  {formatRupiah(data.stats.walletBalances.Cash)}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Widget Tracking Budget Bulanan */}
        {data?.budget && (
          <section
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '1.5rem',
              marginBottom: '1.5rem',
              border:
                data.budget.status === 'overbudget'
                  ? '2px solid #EF4444'
                  : data.budget.status === 'warning'
                  ? '2px solid #F59E0B'
                  : data.budget.status === 'half'
                  ? '1.5px solid #FBBF24'
                  : '1px solid rgba(244, 63, 94, 0.2)',
              boxShadow: '0 4px 16px rgba(244, 63, 94, 0.06)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.75rem',
                marginBottom: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.35rem' }}>🎯</span>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#4C0519', margin: 0 }}>
                    Tracking Budget Bulan Ini ({data.budget.monthLabel})
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: '#881337', fontWeight: 600 }}>
                    Pos Tabungan: <b>{selectedBook === 'Semua' ? 'Tabungan Utama' : selectedBook}</b>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span
                  style={{
                    padding: '0.3rem 0.75rem',
                    borderRadius: '9999px',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    background:
                      data.budget.status === 'overbudget'
                        ? '#FEE2E2'
                        : data.budget.status === 'warning'
                        ? '#FEF3C7'
                        : data.budget.status === 'half'
                        ? '#FEF9C3'
                        : data.budget.amount > 0
                        ? '#DCFCE7'
                        : '#F3F4F6',
                    color:
                      data.budget.status === 'overbudget'
                        ? '#991B1B'
                        : data.budget.status === 'warning'
                        ? '#92400E'
                        : data.budget.status === 'half'
                        ? '#854D0E'
                        : data.budget.amount > 0
                        ? '#166534'
                        : '#6B7280',
                  }}
                >
                  {data.budget.status === 'overbudget'
                    ? '🛑 Budget Habis / Overbudget!'
                    : data.budget.status === 'warning'
                    ? '🚨 Hampir Habis (>80%)'
                    : data.budget.status === 'half'
                    ? '⚠️ Terpakai Separuh (50%)'
                    : data.budget.amount > 0
                    ? '🟢 Pengeluaran Terkendali'
                    : '⚪ Belum Ada Target'}
                </span>

                <button
                  onClick={() => {
                    setBudgetInput(data.budget?.amount ? String(data.budget.amount) : '');
                    setIsEditingBudget(!isEditingBudget);
                  }}
                  style={{
                    padding: '0.35rem 0.85rem',
                    borderRadius: '9999px',
                    border: '1px solid rgba(244, 63, 94, 0.3)',
                    background: '#FFF1F2',
                    color: '#BE123C',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {isEditingBudget ? '✕ Tutup' : '✏️ Atur Budget'}
                </button>
              </div>
            </div>

            {/* Inline Budget Editor Form */}
            {isEditingBudget && (
              <div
                style={{
                  background: '#FFF1F2',
                  borderRadius: '12px',
                  padding: '1rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#881337', display: 'block', marginBottom: '0.25rem' }}>
                    Nominal Budget Bulanan (Rp):
                  </label>
                  <input
                    type="number"
                    value={budgetInput}
                    onChange={(e) => setBudgetInput(e.target.value)}
                    placeholder="misal: 3000000"
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid #FECDD3',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignSelf: 'flex-end' }}>
                  <button
                    onClick={handleSaveBudget}
                    disabled={isSavingBudget}
                    style={{
                      padding: '0.5rem 1.25rem',
                      borderRadius: '8px',
                      background: '#F43F5E',
                      color: '#FFFFFF',
                      border: 'none',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                    }}
                  >
                    {isSavingBudget ? 'Menyimpan...' : '💾 Simpan Budget'}
                  </button>
                  <button
                    onClick={() => setIsEditingBudget(false)}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      background: '#FFFFFF',
                      color: '#4B5563',
                      border: '1px solid #D1D5DB',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                    }}
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}

            {/* Progress Bar & Detail Angka */}
            {data.budget.amount > 0 ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '0.85rem' }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>Target Budget</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827' }}>{formatRupiah(data.budget.amount)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>Sudah Terpakai</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: data.budget.percentage >= 100 ? '#DC2626' : '#E11D48' }}>
                      {formatRupiah(data.budget.spent)} <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>({data.budget.percentage}%)</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>Sisa Budget</div>
                    <div
                      style={{
                        fontSize: '1.25rem',
                        fontWeight: 800,
                        color: data.budget.remaining < 0 ? '#DC2626' : '#059669',
                      }}
                    >
                      {data.budget.remaining < 0
                        ? `- ${formatRupiah(Math.abs(data.budget.remaining))}`
                        : formatRupiah(data.budget.remaining)}
                    </div>
                  </div>
                </div>

                {/* Visual Progress Bar */}
                <div
                  style={{
                    width: '100%',
                    height: '14px',
                    background: '#F3F4F6',
                    borderRadius: '9999px',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, data.budget.percentage)}%`,
                      borderRadius: '9999px',
                      background:
                        data.budget.percentage >= 100
                          ? 'linear-gradient(90deg, #EF4444, #B91C1C)'
                          : data.budget.percentage >= 80
                          ? 'linear-gradient(90deg, #F59E0B, #DC2626)'
                          : data.budget.percentage >= 50
                          ? 'linear-gradient(90deg, #FBBF24, #F59E0B)'
                          : 'linear-gradient(90deg, #10B981, #059669)',
                      transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#9CA3AF', marginTop: '0.35rem' }}>
                  <span>0%</span>
                  <span>50% (Peringatan Separuh)</span>
                  <span>80% (Hampir Habis)</span>
                  <span>100%</span>
                </div>
              </>
            ) : (
              <div style={{ padding: '0.75rem 0', color: '#6B7280', fontSize: '0.88rem' }}>
                💡 Belum ada target budget untuk pos ini. Klik tombol <b>✏️ Atur Budget</b> di atas atau ketik <code style={{ background: '#F3F4F6', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>/budget 3jt</code> di bot Telegram untuk membatasi pengeluaran bulanan.
              </div>
            )}
          </section>
        )}

        {/* Month-over-Month Comparison & Historical Peak Insights */}
        {data?.monthlyComparison && data.monthlyComparison.months.length > 0 && (
          <section
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '1.5rem',
              marginBottom: '1.5rem',
              border: '1px solid rgba(244, 63, 94, 0.15)',
              boxShadow: '0 4px 16px rgba(244, 63, 94, 0.05)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '1.35rem' }}>📈</span>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#4C0519', margin: 0 }}>
                  Perbandingan Bulan ke Bulan ({selectedBook === 'Semua' ? 'Seluruh Pos' : selectedBook})
                </h3>
                <div style={{ fontSize: '0.75rem', color: '#881337', fontWeight: 600 }}>
                  Pantau tren pengeluaran, bulan rekor pemasukan, dan komparasi performa tabungan
                </div>
              </div>
            </div>

            {/* 4 Cards: Peak Insights */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '0.85rem',
                marginBottom: '1.25rem',
              }}
            >
              <div style={{ background: '#F0FDF4', borderRadius: '12px', padding: '0.85rem 1rem', border: '1px solid #BBF7D0' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>🏆 Pemasukan Terbanyak</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#14532D', marginTop: '0.2rem' }}>
                  {data.monthlyComparison.highestIncomeMonth
                    ? formatRupiah(data.monthlyComparison.highestIncomeMonth.amount)
                    : '—'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#15803D' }}>
                  {data.monthlyComparison.highestIncomeMonth?.monthLabel || 'Belum ada data'}
                </div>
              </div>

              <div style={{ background: '#FFF1F2', borderRadius: '12px', padding: '0.85rem 1rem', border: '1px solid #FECDD3' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9F1239', textTransform: 'uppercase' }}>💸 Pengeluaran Terbanyak</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#881337', marginTop: '0.2rem' }}>
                  {data.monthlyComparison.highestExpenseMonth
                    ? formatRupiah(data.monthlyComparison.highestExpenseMonth.amount)
                    : '—'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#BE123C' }}>
                  {data.monthlyComparison.highestExpenseMonth?.monthLabel || 'Belum ada data'}
                </div>
              </div>

              <div style={{ background: '#EFF6FF', borderRadius: '12px', padding: '0.85rem 1rem', border: '1px solid #BFDBFE' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1E40AF', textTransform: 'uppercase' }}>📥 Rata-Rata Masuk / Bln</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1E3A8A', marginTop: '0.2rem' }}>
                  {formatRupiah(data.monthlyComparison.averageMonthlyIncome)}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#2563EB' }}>Rata-rata akumulasi</div>
              </div>

              <div style={{ background: '#FAF5FF', borderRadius: '12px', padding: '0.85rem 1rem', border: '1px solid #E9D5FF' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6B21A8', textTransform: 'uppercase' }}>📤 Rata-Rata Belanja / Bln</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#581C87', marginTop: '0.2rem' }}>
                  {formatRupiah(data.monthlyComparison.averageMonthlyExpense)}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#7E22CE' }}>Rata-rata pengeluaran</div>
              </div>
            </div>

            {/* Monthly Comparison Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #F3F4F6', textAlign: 'left', color: '#6B7280', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '0.6rem 0.75rem' }}>Bulan</th>
                    <th style={{ padding: '0.6rem 0.75rem' }}>Visual Rasio (Masuk vs Keluar)</th>
                    <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>Pemasukan</th>
                    <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>Pengeluaran</th>
                    <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>Sisa Surplus</th>
                    <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>Tren Belanja</th>
                  </tr>
                </thead>
                <tbody>
                  {data.monthlyComparison.months.map((m) => {
                    const totalVol = m.income + m.expense;
                    const incPct = totalVol > 0 ? Math.round((m.income / totalVol) * 100) : 50;
                    const expPct = totalVol > 0 ? 100 - incPct : 50;

                    return (
                      <tr key={m.month} style={{ borderBottom: '1px solid #F9FAFB' }}>
                        <td style={{ padding: '0.65rem 0.75rem', fontWeight: 700, color: '#1F2937' }}>
                          📅 {m.monthLabel}
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', minWidth: '150px' }}>
                          <div style={{ height: '8px', width: '100%', background: '#F3F4F6', borderRadius: '9999px', display: 'flex', overflow: 'hidden' }}>
                            <div style={{ width: `${incPct}%`, background: '#10B981' }} title={`Masuk: ${incPct}%`} />
                            <div style={{ width: `${expPct}%`, background: '#F43F5E' }} title={`Keluar: ${expPct}%`} />
                          </div>
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                          + {formatRupiah(m.income)}
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', fontWeight: 700, color: '#E11D48' }}>
                          - {formatRupiah(m.expense)}
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', fontWeight: 800, color: m.balance >= 0 ? '#047857' : '#DC2626' }}>
                          {m.balance >= 0 ? `+ ${formatRupiah(m.balance)}` : `- ${formatRupiah(Math.abs(m.balance))}`}
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>
                          {m.expenseChangePercent !== undefined ? (
                            <span
                              style={{
                                fontSize: '0.75rem',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '9999px',
                                fontWeight: 700,
                                background: m.expenseChangePercent > 0 ? '#FFF1F2' : '#ECFDF5',
                                color: m.expenseChangePercent > 0 ? '#BE123C' : '#047857',
                              }}
                            >
                              {m.expenseChangePercent > 0 ? `▲ +${m.expenseChangePercent}%` : `▼ ${m.expenseChangePercent}%`}
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Category Breakdown (Top Kategori Belanja) */}
        {categoryStats.length > 0 && (
          <section className="category-summary-box">
            <div className="category-summary-title">
              <span>🎯 Top Kategori Belanja ({selectedBook}):</span>
              {selectedCategory !== 'all' && (
                <button
                  onClick={() => setSelectedCategory('all')}
                  style={{ background: 'none', border: 'none', color: '#BE123C', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 700 }}
                >
                  ✕ Reset Filter Kategori
                </button>
              )}
            </div>
            <div className="category-chips">
              {categoryStats.map(([cat, amount]) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(selectedCategory === cat ? 'all' : cat)}
                  className="category-chip"
                  style={{
                    cursor: 'pointer',
                    background: selectedCategory === cat ? '#F43F5E' : undefined,
                    color: selectedCategory === cat ? '#FFFFFF' : undefined,
                  }}
                >
                  <span>{cat}</span>
                  <span className="chip-amount" style={{ color: selectedCategory === cat ? '#FFFFFF' : undefined }}>
                    {formatRupiah(amount)}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Filter & Search Bar */}
        <section className="controls-bar">
          <div className="controls-row-top">
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Cari transaksi, item, kategori, tanggal, atau PIC..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>

            <div className="filter-pills">
              <button
                className={`filter-pill ${typeFilter === 'all' ? 'active' : ''}`}
                onClick={() => setTypeFilter('all')}
              >
                Semua ({data?.transactions.length || 0})
              </button>
              <button
                className={`filter-pill ${typeFilter === 'Pengeluaran' ? 'active' : ''}`}
                onClick={() => setTypeFilter('Pengeluaran')}
              >
                🔴 Pengeluaran
              </button>
              <button
                className={`filter-pill ${typeFilter === 'Pemasukan' ? 'active' : ''}`}
                onClick={() => setTypeFilter('Pemasukan')}
              >
                🟢 Pemasukan
              </button>
              <button
                className={`filter-pill ${typeFilter === 'with_receipt' ? 'active' : ''}`}
                onClick={() => setTypeFilter('with_receipt')}
              >
                📎 Ada Nota Struk
              </button>
            </div>
          </div>

          <div className="controls-row-filters">
            {/* Filter Kategori Dropdown */}
            <div className="filter-select-wrapper">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className={`filter-select ${selectedCategory !== 'all' ? 'active' : ''}`}
                title="Filter berdasarkan Kategori"
              >
                <option value="all">📂 Semua Kategori</option>
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Bulan Dropdown */}
            <div className="filter-select-wrapper">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className={`filter-select ${selectedMonth !== 'all' ? 'active' : ''}`}
                title="Filter berdasarkan Bulan"
              >
                <option value="all">📅 Semua Bulan</option>
                {MONTH_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.value} - {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Tahun Dropdown */}
            <div className="filter-select-wrapper">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className={`filter-select ${selectedYear !== 'all' ? 'active' : ''}`}
                title="Filter berdasarkan Tahun"
              >
                <option value="all">🗓️ Semua Tahun</option>
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    Tahun {yr}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Dompet Dropdown */}
            <div className="filter-select-wrapper">
              <select
                value={selectedWallet}
                onChange={(e) => setSelectedWallet(e.target.value)}
                className={`filter-select ${selectedWallet !== 'all' ? 'active' : ''}`}
                title="Filter berdasarkan Dompet"
              >
                <option value="all">💳 Semua Dompet</option>
                <option value="Bank">🏦 Bank</option>
                <option value="E-Wallet">📱 E-Wallet</option>
                <option value="Cash">💵 Cash</option>
              </select>
            </div>

            {/* Tombol Reset Filter */}
            {isAnyFilterActive && (
              <button
                onClick={handleResetFilters}
                className="btn-reset-filters"
                title="Kembalikan semua filter ke awal"
              >
                <span>✕</span>
                <span>Reset Filter</span>
              </button>
            )}
          </div>

          {/* Banner Ringkasan Hasil Filter */}
          {isAnyFilterActive && (
            <div className="filtered-summary-banner">
              <div className="filtered-summary-metrics">
                <span className="filtered-summary-item">
                  <span>📊 Terfilter:</span>
                  <span className="filtered-summary-val">{filteredSummary.count} Transaksi</span>
                </span>
                <span className="filtered-summary-item">
                  <span>📥 Pemasukan:</span>
                  <span className="filtered-summary-val" style={{ color: '#047857' }}>
                    +{formatRupiah(filteredSummary.income)}
                  </span>
                </span>
                <span className="filtered-summary-item">
                  <span>📤 Pengeluaran:</span>
                  <span className="filtered-summary-val" style={{ color: '#BE123C' }}>
                    -{formatRupiah(filteredSummary.expense)}
                  </span>
                </span>
                <span className="filtered-summary-item">
                  <span>💰 Saldo Periode:</span>
                  <span
                    className="filtered-summary-val"
                    style={{ color: filteredSummary.balance >= 0 ? '#047857' : '#BE123C' }}
                  >
                    {formatRupiah(filteredSummary.balance)}
                  </span>
                </span>
              </div>
            </div>
          )}
        </section>

        {/* Transactions Feed */}
        <section>
          <div className="transactions-header">
            <div>
              <h2 className="transactions-title">Daftar Transaksi ({selectedBook})</h2>
              <div className="transactions-count">
                Menampilkan {Math.min(visibleCount, filteredTransactions.length)} dari {filteredTransactions.length} transaksi
              </div>
            </div>

            <button
              onClick={() => fetchData(selectedBook, true)}
              disabled={isRefreshing}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '9999px',
                background: '#FFFFFF',
                border: '1px solid rgba(244, 63, 94, 0.2)',
                color: '#BE123C',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <span>{isRefreshing ? '⏳' : '🔄'}</span>
              <span>{isRefreshing ? 'Memperbarui...' : 'Refresh'}</span>
            </button>
          </div>

          {loading && !data ? (
            <div className="empty-state">
              <div className="empty-icon">⏳</div>
              <div className="empty-title">Memuat data keuangan...</div>
              <div className="empty-desc">Mengambil catatan terbaru dari spreadsheet secara langsung.</div>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🌸</div>
              <div className="empty-title">Tidak ada transaksi ditemukan</div>
              <div className="empty-desc">
                {searchQuery
                  ? `Tidak ada hasil yang cocok dengan kata kunci "${searchQuery}".`
                  : 'Belum ada transaksi pada filter ini.'}
              </div>
            </div>
          ) : (
            <>
              <div className="table-scroll-hint">
                <span>↔️ Geser tabel ke samping untuk melihat nominal & nota</span>
              </div>
              <div className="table-card">
                <div className="table-responsive">
                  <table className="finance-table">
                    <thead>
                      <tr>
                        <th className="col-num desktop-only">#</th>
                        <th className="col-date desktop-only">Tanggal</th>
                        <th>Keterangan</th>
                        <th className="desktop-only">Pos Tabungan</th>
                        <th className="desktop-only">Dompet</th>
                        <th className="desktop-only">Kategori</th>
                        <th className="desktop-only">Jenis</th>
                        <th style={{ textAlign: 'right' }}>Nominal</th>
                        <th className="desktop-only" style={{ textAlign: 'center' }}>Bukti Nota</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.slice(0, visibleCount).map((tx, idx) => {
                        const isIncome = tx.type === 'Pemasukan';
                        return (
                          <tr key={tx.id || idx}>
                            <td className="col-num desktop-only">{idx + 1}</td>
                            <td className="col-date desktop-only">
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                <span>📅</span>
                                <span>{tx.date}</span>
                              </span>
                            </td>
                            <td className="col-desc">
                              <span className="tx-table-desc">{tx.description || tx.category}</span>
                              {/* Mobile-only metadata */}
                              <div className="mobile-only-meta">
                                <span>📅 {tx.date}</span>
                                <span>•</span>
                                <span className="book-badge">📖 {tx.book}</span>
                                <span>•</span>
                                <span>{tx.wallet === 'Cash' ? '💵' : tx.wallet === 'E-Wallet' ? '📱' : '🏦'} {tx.wallet || 'Bank'}</span>
                                <span>•</span>
                                <span className="cat-badge">{tx.category}</span>
                                {tx.pic && (
                                  <span className="tx-table-pic">
                                    <span>👤</span>
                                    <span>{tx.pic}</span>
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="desktop-only">
                              <span className="book-badge">
                                <span>📖</span>
                                <span>{tx.book}</span>
                              </span>
                            </td>
                            <td className="desktop-only">
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  padding: '0.2rem 0.55rem',
                                  borderRadius: '9999px',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  background:
                                    tx.wallet === 'Cash'
                                      ? '#ECFDF5'
                                      : tx.wallet === 'E-Wallet'
                                      ? '#F5F3FF'
                                      : '#EFF6FF',
                                  color:
                                    tx.wallet === 'Cash'
                                      ? '#065F46'
                                      : tx.wallet === 'E-Wallet'
                                      ? '#5B21B6'
                                      : '#1E3A8A',
                                  border: `1px solid ${
                                    tx.wallet === 'Cash'
                                      ? 'rgba(16, 185, 129, 0.25)'
                                      : tx.wallet === 'E-Wallet'
                                      ? 'rgba(139, 92, 246, 0.25)'
                                      : 'rgba(59, 130, 246, 0.25)'
                                  }`,
                                }}
                              >
                                <span>{tx.wallet === 'Cash' ? '💵' : tx.wallet === 'E-Wallet' ? '📱' : '🏦'}</span>
                                <span>{tx.wallet || 'Bank'}</span>
                              </span>
                            </td>
                            <td className="desktop-only">
                              <span className="cat-badge">{tx.category}</span>
                            </td>
                            <td className="desktop-only">
                              <span className={`type-badge ${isIncome ? 'pemasukan' : 'pengeluaran'}`}>
                                <span>{isIncome ? '📥 Masuk' : '📤 Keluar'}</span>
                              </span>
                            </td>
                            <td className={`col-amount ${isIncome ? 'pemasukan' : 'pengeluaran'}`}>
                              <div>
                                {isIncome ? '+' : '-'} {formatRupiah(tx.amount)}
                              </div>
                              {/* Mobile-only nota link */}
                              <div className="mobile-only-nota">
                                {tx.noteLink ? (
                                  <a
                                    href={tx.noteLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn-nota-sm"
                                    title="Buka bukti foto struk"
                                  >
                                    <span>📎</span>
                                    <span>Lihat Nota</span>
                                  </a>
                                ) : (
                                  <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>Tanpa Struk</span>
                                )}
                              </div>
                            </td>
                            <td className="col-nota desktop-only">
                              {tx.noteLink ? (
                                <a
                                  href={tx.noteLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn-nota"
                                  title="Buka bukti foto struk di Google Drive"
                                >
                                  <span>📎</span>
                                  <span>Lihat Nota</span>
                                </a>
                              ) : (
                                <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

              {visibleCount < filteredTransactions.length && (
                <div style={{ textAlign: 'center', padding: '1.25rem', borderTop: '1px solid rgba(244, 63, 94, 0.1)', background: '#FFFDFE' }}>
                  <button
                    onClick={() => setVisibleCount((prev) => prev + 50)}
                    style={{
                      padding: '0.65rem 1.75rem',
                      borderRadius: '9999px',
                      background: 'linear-gradient(135deg, #F43F5E, #FB7185)',
                      color: '#FFFFFF',
                      border: 'none',
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(244, 63, 94, 0.25)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    Muat 50 Transaksi Lagi (Sisa {filteredTransactions.length - visibleCount}) ⤵
                  </button>
                </div>
              )}
              </div>
            </>
          )}
        </section>

        {/* Info Banner Bot */}
        <section style={{ marginTop: '3rem', background: '#FFFFFF', border: '1px solid rgba(244, 63, 94, 0.2)', borderRadius: '16px', padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', boxShadow: 'var(--shadow-sm)' }}>
          <div>
            <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.1rem', fontWeight: 800, color: '#4C0519', marginBottom: '0.25rem' }}>
              💬 Ingin mencatat pemasukan atau pengeluaran baru?
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#881337' }}>
              Gunakan bot Telegram kami. Cukup ketik chat biasa (contoh: <i>Beli konsumsi 35rb</i>) atau kirim foto nota struk belanja!
            </p>
          </div>
          <a
            href="https://t.me/nabung_date_bot"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: '9999px',
              background: '#F43F5E',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '0.88rem',
              textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(244, 63, 94, 0.3)',
              whiteSpace: 'nowrap',
            }}
          >
            Buka Bot Telegram ➔
          </a>
        </section>
      </main>

      {/* Footer */}
      <footer className="footer">
        <p>💕 Dashboard Tabungan & Keuangan Kita • Terhubung Otomatis ke Google Sheets & Drive</p>
        <p style={{ marginTop: '0.35rem', fontSize: '0.78rem' }}>
          Terakhir sinkronisasi: {data?.lastUpdated || 'Baru saja'}
        </p>
      </footer>
    </div>
  );
}
