'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { WebFinanceData, WebTransactionItem, DebtItem } from '@/lib/types';

const MAIN = 'Tabungan';
const ALL = 'Semua';
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const PAL = ['#4F46E5', '#E0642B', '#0E9F6E', '#D6336C', '#1D8FD8', '#B7791F', '#8B5CF6', '#0F766E', '#6B7280'];
const HUES = ['#0F766E', '#4F46E5', '#A21CAF', '#B45309', '#1D6FD8', '#BE185D', '#4D7C0F'];
function CatIcon({ category, size = 18 }: { category: string; size?: number }) {
  const s = (category || '').toLowerCase();
  if (/makan|minum|konsumsi|resto|cafe|food|jajan|kopi/.test(s)) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
        <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
        <line x1="6" y1="1" x2="6" y2="4" />
        <line x1="10" y1="1" x2="10" y2="4" />
        <line x1="14" y1="1" x2="14" y2="4" />
      </svg>
    );
  }
  if (/hadiah|donasi|sedekah|amal|kado|kasih/.test(s)) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="20 12 20 22 4 22 4 12" />
        <rect x="2" y="7" width="20" height="5" rx="1" />
        <line x1="12" y1="22" x2="12" y2="7" />
        <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
        <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
      </svg>
    );
  }
  if (/belanja|shopping|pasar|supermarket|baju|kebutuhan/.test(s)) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    );
  }
  if (/transport|bensin|parkir|ojek|grab|gojek|kereta/.test(s)) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="11" width="20" height="7" rx="2" />
        <path d="m5 11 2-5h10l2 5" />
        <circle cx="7" cy="18" r="2" />
        <circle cx="17" cy="18" r="2" />
      </svg>
    );
  }
  if (/tagihan|listrik|wifi|pulsa|langganan|internet/.test(s)) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    );
  }
  if (/hiburan|date|nonton|kencan|wisata|liburan/.test(s)) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M2 9a3 3 0 0 1 0 6v4a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-4a3 3 0 0 1 0-6V5a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
        <line x1="9" y1="3" x2="9" y2="21" strokeDasharray="2 2" />
      </svg>
    );
  }
  if (/cantik|skincare|salon|makeup/.test(s)) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3z" />
      </svg>
    );
  }
  if (/sehat|obat|dokter|apotek|klinik/.test(s)) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    );
  }
  if (/didik|buku|kursus|kuliah|sekolah/.test(s)) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
        <line x1="8" y1="7" x2="16" y2="7" />
        <line x1="8" y1="11" x2="14" y2="11" />
      </svg>
    );
  }
  if (/rumah|kos|keluarga|sewa/.test(s)) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    );
  }
  if (/gaji|bonus|tabung|invest/.test(s)) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect width="20" height="14" x="2" y="7" rx="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    );
  }
  if (/pindah|transfer/.test(s)) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m17 2 4 4-4 4" />
        <path d="M3 6h18" />
        <path d="m7 22-4-4 4-4" />
        <path d="M21 18H3" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <line x1="8" y1="7" x2="16" y2="7" />
      <line x1="8" y1="11" x2="16" y2="11" />
      <line x1="8" y1="15" x2="13" y2="15" />
    </svg>
  );
}

function BookIcon({ book, size = 18 }: { book: string; size?: number }) {
  if (book === MAIN) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <circle cx="12" cy="12" r="3.5" />
        <path d="M12 8.5V12l2 1.5" />
        <line x1="3" y1="8" x2="5" y2="8" />
        <line x1="3" y1="16" x2="5" y2="16" />
      </svg>
    );
  }
  if (book === ALL) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polygon points="12 2 2 7 12 12 22 7 12 2" />
        <polyline points="2 17 12 22 22 17" />
        <polyline points="2 12 12 17 22 12" />
      </svg>
    );
  }
  let h = 0;
  for (const ch of book) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const idx = h % 7;
  switch (idx) {
    case 0:
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
        </svg>
      );
    case 1:
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <polygon points="15.5 8.5 13.5 13.5 8.5 15.5 10.5 10.5 15.5 8.5" fill="none" />
        </svg>
      );
    case 2:
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
          <line x1="4" y1="22" x2="4" y2="15" />
        </svg>
      );
    case 3:
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect width="18" height="13" x="3" y="7" rx="2" />
          <path d="M8 7V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3" />
        </svg>
      );
    case 4:
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10Z" />
          <path d="M2 21c0-3 1.85-5.4 5.1-6 2.4-.4 4.9-1.9 5.9-2.9" />
        </svg>
      );
    case 5:
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );
    default:
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 3h12l4 6-10 12L2 9z" />
          <path d="M11 3 8 9l4 12 4-12-3-6" />
        </svg>
      );
  }
}
const TABS = [
  { id: 'home', label: 'Ringkasan', d: 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z' },
  { id: 'wallet', label: 'Dompet', d: 'M3 7a2 2 0 0 1 2-2h13v4M3 7v10a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1H5a2 2 0 0 1-2-2zM16 14h2' },
  { id: 'tx', label: 'Transaksi', d: 'M4 6h16M4 12h16M4 18h10' },
  { id: 'report', label: 'Laporan', d: 'M5 20V10m7 10V4m7 16v-7' },
  { id: 'debt', label: 'Utang', d: 'M7 7h11l-3-3m3 3-3 3M17 17H6l3 3m-3-3 3-3' },
] as const;
type Tab = (typeof TABS)[number]['id'];

interface MissionData {
  id: string; title: string; desc: string; stiker: string; stikerAlt: string;
  xp: number; rarity: 'common' | 'rare' | 'epic' | 'legendary'; quote: string;
  unlocked: boolean; progress?: number; progressLabel?: string;
}

const RANKS = [
  { lv: 1, name: 'Pemula Hemat', min: 0, max: 50 },
  { lv: 2, name: 'Penjaga Dompet', min: 50, max: 120 },
  { lv: 3, name: 'Juragan Kucing', min: 120, max: 250 },
  { lv: 4, name: 'Sultan Tabungan', min: 250, max: 450 },
  { lv: 5, name: 'Grandmaster Keuangan', min: 450, max: 9999 },
];
const getRank = (xp: number) => RANKS.find((r) => xp < r.max) || RANKS[RANKS.length - 1];
const RARITY_CFG: Record<string, { label: string; bg: string; color: string }> = {
  common: { label: 'Common', bg: 'rgba(100,116,139,0.14)', color: '#475569' },
  rare: { label: 'Rare', bg: 'rgba(29,143,216,0.14)', color: '#0369A1' },
  epic: { label: 'Epic', bg: 'rgba(139,92,246,0.16)', color: '#6D28D9' },
  legendary: { label: 'Legendary', bg: 'rgba(217,119,6,0.18)', color: '#B45309' },
};

interface Goal { id: string; name: string; target: number; saved: number; due: string }
const kindOf = (w: string) => { const s = (w || '').toLowerCase(); return s.startsWith('e-wallet') ? 'E-Wallet' : s.startsWith('cash') || s.includes('tunai') ? 'Cash' : 'Bank'; };
const WCOL: Record<string, string[]> = { Bank: ['#1F3A5F', '#1E5A8C', '#2B4A6F'], 'E-Wallet': ['#6B3FA0', '#8A3A7A', '#4B3F9A'], Cash: ['#2E6B45'] };
const wLabel = (w: string) => (w === 'Cash' ? 'Tunai' : w.replace(/^(Bank|E-Wallet) - /i, '') || w);
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const goalNote = (g: Goal) => {
  if (g.saved >= g.target) return ', tercapai';
  const d = g.due ? parseDate(g.due) : null;
  if (!d) return `, kurang ${rp(g.target - g.saved)}`;
  if (d.getTime() < Date.now()) return `, tenggat sudah lewat, kurang ${rp(g.target - g.saved)}`;
  const mo = Math.max(1, Math.ceil((d.getTime() - Date.now()) / (30 * 864e5)));
  return `, perlu ${rp(Math.ceil((g.target - g.saved) / mo))} per bulan sampai ${new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(d)}`;
};
const rp = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
const short = (v: number) => { const a = Math.abs(v); return a >= 1e6 ? `${(a / 1e6).toFixed(1).replace('.0', '')}jt` : a >= 1e3 ? `${Math.round(a / 1e3)}rb` : a ? String(a) : '-'; };
const icon = (c: string) => <CatIcon category={c} />;
const isTransfer = (t: WebTransactionItem) => {
  const s = `${t.category} ${t.description}`.toLowerCase();
  return !!t.isTransfer || /pindah uang|pindah saldo|transfer saldo/.test(s);
};
function parseDate(s: string): Date | null {
  const c = String(s || '').trim().replace(/^'/, '');
  let m = c.match(/^(\d{4})[-/.\s](\d{1,2})[-/.\s](\d{1,2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = c.match(/^(\d{1,2})[-/.\s](\d{1,2})[-/.\s](\d{4})/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  const d = new Date(c);
  return isNaN(d.getTime()) ? null : d;
}
const dayLabel = (s: string) => { const d = parseDate(s); return d ? new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }).format(d) : s; };
function bookStyle(b: string) {
  if (b === MAIN) return { c: HUES[0] };
  if (b === ALL) return { c: '#334155' };
  let h = 0;
  for (const ch of b) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return { c: HUES[1 + (h % (HUES.length - 1))] };
}
const Ic = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);
const CardChip = () => (
  <svg width="34" height="26" viewBox="0 0 34 26" fill="none" className="wc-chip" aria-hidden="true">
    <defs>
      <linearGradient id="wcGoldChip" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FDE68A" />
        <stop offset="50%" stopColor="#D97706" />
        <stop offset="100%" stopColor="#92400E" />
      </linearGradient>
    </defs>
    <rect width="34" height="26" rx="4.5" fill="url(#wcGoldChip)" />
    <rect x="0.5" y="0.5" width="33" height="25" rx="4" stroke="rgba(0,0,0,0.2)" />
    <path d="M0 9h12v8H0M34 9H22v8h12M12 0v26M22 0v26M12 13h10" stroke="rgba(0,0,0,0.3)" strokeWidth="0.8" />
  </svg>
);

const ContactlessWave = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" opacity="0.65" aria-hidden="true">
    <path d="M8.5 16.5a5 5 0 0 1 0-7" />
    <path d="M12 19a8.5 8.5 0 0 0 0-12" />
    <path d="M15.5 21.5a12 12 0 0 0 0-17" />
  </svg>
);

function getWalletTheme(key: string, label: string) {
  const s = `${key} ${label}`.toLowerCase();

  if (s.includes('jago')) {
    return {
      gradient: 'linear-gradient(135deg, #2D3342 0%, #1A1E27 60%, #111319 100%)',
      accent: '#FFB703',
      badge: (
        <span className="w-brand-badge" style={{ background: '#FFB703', padding: '3px 7px', color: '#161922', fontWeight: 800, fontSize: '11px', letterSpacing: '-0.02em', borderRadius: '6px' }}>
          jago
        </span>
      ),
    };
  }

  if (s.includes('gopay') || s.includes('go-pay') || s.includes('gojek')) {
    return {
      gradient: 'linear-gradient(135deg, #00AED6 0%, #0084A8 60%, #00566E 100%)',
      accent: '#E0F7FA',
      badge: (
        <span className="w-brand-badge" style={{ background: '#FFFFFF', padding: '3px 6px', display: 'inline-flex', alignItems: 'center', gap: '4px', borderRadius: '6px' }}>
          <svg viewBox="0 0 16 16" width="13" height="13" fill="none">
            <circle cx="8" cy="8" r="7" stroke="#00AED6" strokeWidth="2.5" />
            <circle cx="8" cy="8" r="3.2" fill="#00AED6" />
          </svg>
          <span style={{ color: '#00AED6', fontWeight: 800, fontSize: '10.5px' }}>gopay</span>
        </span>
      ),
    };
  }

  if (s.includes('shopee') || s.includes('shopeepay')) {
    return {
      gradient: 'linear-gradient(135deg, #EE4D2D 0%, #CF3817 60%, #992308 100%)',
      accent: '#FFE0B2',
      badge: (
        <span className="w-brand-badge" style={{ background: '#FFFFFF', padding: '3px 6px', display: 'inline-flex', alignItems: 'center', gap: '4px', borderRadius: '6px' }}>
          <svg viewBox="0 0 16 16" width="13" height="13" fill="none">
            <path d="M3.5 5h9l-1 9.5H4.5L3.5 5z" fill="#EE4D2D" />
            <path d="M6 5V3.5a2 2 0 1 1 4 0V5" stroke="#EE4D2D" strokeWidth="1.2" />
            <path d="M8.5 7.5c-.5-.3-1.1-.3-1.5 0-.4.3-.3.8.2 1.1.7.3 1.1.6.9 1.2-.2.6-.8 1-1.5.8" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <span style={{ color: '#EE4D2D', fontWeight: 800, fontSize: '10px' }}>ShopeePay</span>
        </span>
      ),
    };
  }

  if (s.includes('bca')) {
    return {
      gradient: 'linear-gradient(135deg, #005EAD 0%, #003B75 60%, #00224A 100%)',
      accent: '#93C5FD',
      badge: (
        <span className="w-brand-badge" style={{ background: '#005EAD', border: '1px solid rgba(255,255,255,0.4)', padding: '2px 7px', color: '#FFFFFF', fontWeight: 900, fontSize: '11px', letterSpacing: '0.05em', borderRadius: '5px' }}>
          BCA
        </span>
      ),
    };
  }

  if (s.includes('mandiri')) {
    return {
      gradient: 'linear-gradient(135deg, #003366 0%, #002040 60%, #001226 100%)',
      accent: '#FDB913',
      badge: (
        <span className="w-brand-badge" style={{ background: '#002B54', border: '1px solid rgba(253,185,19,0.5)', padding: '2px 6px', color: '#FFFFFF', fontWeight: 800, fontSize: '10px', borderRadius: '5px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
          <span style={{ color: '#FDB913' }}>~</span> mandırı
        </span>
      ),
    };
  }

  if (s.includes('bri')) {
    return {
      gradient: 'linear-gradient(135deg, #00529C 0%, #003366 60%, #001F3F 100%)',
      accent: '#F37024',
      badge: (
        <span className="w-brand-badge" style={{ background: '#00529C', border: '1px solid rgba(255,255,255,0.3)', padding: '2px 6px', color: '#FFFFFF', fontWeight: 900, fontSize: '11px', borderRadius: '5px' }}>
          BRI <span style={{ color: '#F37024' }}>•</span>
        </span>
      ),
    };
  }

  if (s.includes('bni')) {
    return {
      gradient: 'linear-gradient(135deg, #005E6A 0%, #003E46 60%, #00252A 100%)',
      accent: '#F15A24',
      badge: (
        <span className="w-brand-badge" style={{ background: '#005E6A', border: '1px solid rgba(255,255,255,0.3)', padding: '2px 6px', color: '#FFFFFF', fontWeight: 900, fontSize: '11px', borderRadius: '5px' }}>
          BNI <span style={{ color: '#F15A24' }}>46</span>
        </span>
      ),
    };
  }

  if (s.includes('bsi') || s.includes('syariah')) {
    return {
      gradient: 'linear-gradient(135deg, #00A39D 0%, #00706C 60%, #004240 100%)',
      accent: '#F4B400',
      badge: (
        <span className="w-brand-badge" style={{ background: '#00837E', border: '1px solid rgba(244,180,0,0.5)', padding: '2px 6px', color: '#FFFFFF', fontWeight: 900, fontSize: '10.5px', borderRadius: '5px' }}>
          BSI ✦
        </span>
      ),
    };
  }

  if (s.includes('dana')) {
    return {
      gradient: 'linear-gradient(135deg, #118EEA 0%, #0D6DB3 60%, #084978 100%)',
      accent: '#BBDEFB',
      badge: (
        <span className="w-brand-badge" style={{ background: '#118EEA', border: '1px solid rgba(255,255,255,0.4)', padding: '2px 7px', color: '#FFFFFF', fontWeight: 900, fontSize: '10px', letterSpacing: '0.06em', borderRadius: '5px' }}>
          DANA
        </span>
      ),
    };
  }

  if (s.includes('ovo')) {
    return {
      gradient: 'linear-gradient(135deg, #4C3494 0%, #36226B 60%, #221247 100%)',
      accent: '#D1C4E9',
      badge: (
        <span className="w-brand-badge" style={{ background: '#4C3494', border: '1px solid rgba(255,255,255,0.4)', padding: '2px 7px', color: '#FFFFFF', fontWeight: 900, fontSize: '10px', letterSpacing: '0.08em', borderRadius: '5px' }}>
          OVO
        </span>
      ),
    };
  }

  if (s.includes('seabank') || s.includes('sea bank')) {
    return {
      gradient: 'linear-gradient(135deg, #F25C05 0%, #C94600 60%, #8A2D00 100%)',
      accent: '#FFE082',
      badge: (
        <span className="w-brand-badge" style={{ background: '#F25C05', border: '1px solid rgba(255,255,255,0.4)', padding: '2px 6px', color: '#FFFFFF', fontWeight: 800, fontSize: '10px', borderRadius: '5px' }}>
          SeaBank
        </span>
      ),
    };
  }

  if (s.includes('tunai') || s.includes('cash')) {
    return {
      gradient: 'linear-gradient(135deg, #1B4D3E 0%, #113329 60%, #0A1F18 100%)',
      accent: '#6EE7B7',
      badge: (
        <span className="w-brand-badge" style={{ background: '#10B981', padding: '2px 6px', color: '#FFFFFF', fontWeight: 800, fontSize: '10px', borderRadius: '5px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
          <svg viewBox="0 0 16 12" width="12" height="9" fill="none">
            <rect x="0.5" y="0.5" width="15" height="11" rx="1.5" stroke="#FFFFFF" />
            <circle cx="8" cy="6" r="2.5" fill="#FFFFFF" />
          </svg>
          CASH
        </span>
      ),
    };
  }

  if (s.includes('bank')) {
    return {
      gradient: 'linear-gradient(135deg, #1E3A5F 0%, #132742 60%, #0A1626 100%)',
      accent: '#93C5FD',
      badge: (
        <span className="w-brand-badge" style={{ background: '#2563EB', padding: '2px 6px', color: '#FFFFFF', fontWeight: 800, fontSize: '10px', borderRadius: '5px' }}>
          BANK
        </span>
      ),
    };
  }

  return {
    gradient: 'linear-gradient(135deg, #374151 0%, #1F2937 60%, #111827 100%)',
    accent: '#D1D5DB',
    badge: (
      <span className="w-brand-badge" style={{ background: '#4B5563', padding: '2px 6px', color: '#FFFFFF', fontWeight: 700, fontSize: '10px', borderRadius: '5px' }}>
        DOMPET
      </span>
    ),
  };
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const f = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [onClose]);
  return (
    <div className="ov" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-h"><h2>{title}</h2><button className="icbtn" onClick={onClose} aria-label="Tutup"><Ic d="M18 6L6 18M6 6l12 12" /></button></div>
        {children}
      </div>
    </div>
  );
}

export default function Page() {
  const [book, setBook] = useState(MAIN);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>('home');
  const [data, setData] = useState<WebFinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [sheet, setSheet] = useState<null | 'budget' | 'debt' | 'tx' | 'goal' | 'deposit' | 'more' | 'transfer'>(null);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [q, setQ] = useState('');
  const [typeF, setTypeF] = useState<'all' | 'Pemasukan' | 'Pengeluaran'>('all');
  const [monthF, setMonthF] = useState('all');
  const [limit, setLimit] = useState(40);
  const [open, setOpen] = useState<string | null>(null);
  const [wSel, setWSel] = useState<string | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [gf, setGf] = useState({ id: '', name: '', target: '', due: '', amount: '' });
  const [form, setForm] = useState({ id: '', book: '', row: 0, type: 'Pengeluaran', category: '', amount: '', desc: '', date: '', wallet: 'Cash' });
  const [tf, setTf] = useState({ mode: 'wallet', from: '', to: '', toBook: '', amount: '', desc: '' });
  const [meta, setMeta] = useState<string[]>([]);
  const [installEv, setInstallEv] = useState<any>(null);
  const [pick, setPick] = useState<number | null>(null);
  const [budMode, setBudMode] = useState<'monthly' | 'daily'>('monthly');
  const [budIn, setBudIn] = useState('');
  const [debtTab, setDebtTab] = useState<'active' | 'settled'>('active');
  const [df, setDf] = useState({ type: 'Piutang', person: '', amount: '', desc: '' });
  const [missions, setMissions] = useState<MissionData[]>([]);
  const [missionXp, setMissionXp] = useState(0);
  const [missionLoading, setMissionLoading] = useState(false);
  const [misiSel, setMisiSel] = useState<MissionData | null>(null);
  const [newUnlocks, setNewUnlocks] = useState<string[]>([]);
  const [showMisi, setShowMisi] = useState(false);
  const [misiTab, setMisiTab] = useState<'quest' | 'album'>('quest');
  const [claimedIds, setClaimedIds] = useState<string[]>([]);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [partnerBubble, setPartnerBubble] = useState(false);
  const [rewardReveal, setRewardReveal] = useState<MissionData | null>(null);

  useEffect(() => {
    try {
      const p = new URLSearchParams(location.search);
      const b = p.get('buku') || p.get('book') || localStorage.getItem('last_active_book');
      if (b) setBook(b);
      const t = p.get('tab') as Tab | null;
      if (t && TABS.some((x) => x.id === t)) setTab(t);
      const c = localStorage.getItem('misi_claimed_ids');
      if (c) setClaimedIds(JSON.parse(c));
      const pt = localStorage.getItem('misi_partner_id');
      if (pt) setPartnerId(pt);
    } catch { /* abaikan */ }
    setReady(true);
  }, []);

  const load = useCallback(async (b: string, force = false) => {
    force ? setBusy(true) : setLoading(true);
    setError('');
    try {
      const r = await fetch(`/api/finances?book=${encodeURIComponent(b)}${force ? '&force=true' : ''}`, { cache: 'no-store' });
      const j = await r.json();
      if (!j.success) throw new Error(j.error || 'Data belum bisa dimuat');
      setData(j.data);
    } catch (e: any) {
      setError(e?.message || 'Data belum bisa dimuat');
    } finally { setLoading(false); setBusy(false); }
  }, []);

  const loadGoals = useCallback((b: string) => {
    fetch(`/api/goals?book=${encodeURIComponent(b)}`, { cache: 'no-store' }).then((r) => r.json()).then((j) => j.success && setGoals(j.goals)).catch(() => {});
  }, []);

  const loadMissions = useCallback((b: string) => {
    setMissionLoading(true);
    fetch(`/api/missions?book=${encodeURIComponent(b)}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => {
        if (j.success) {
          setMissions((prev) => {
            const prevUnlocked = new Set(prev.filter((m) => m.unlocked).map((m) => m.id));
            const freshUnlocks = (j.missions as MissionData[]).filter((m) => m.unlocked && !prevUnlocked.has(m.id)).map((m) => m.id);
            if (freshUnlocks.length > 0 && prev.length > 0) setNewUnlocks(freshUnlocks);
            return j.missions;
          });
          setMissionXp(j.totalXp);
        }
      })
      .catch(() => {})
      .finally(() => setMissionLoading(false));
  }, []);

  useEffect(() => {
    if (!ready) return;
    load(book);
    loadGoals(book);
    loadMissions(book);
    try {
      localStorage.setItem('last_active_book', book);
      const u = new URL(location.href);
      u.searchParams.set('buku', book);
      history.replaceState(null, '', u);
    } catch { /* abaikan */ }
    document.title = `${book === ALL ? 'Semua pos' : book} - Keuangan Kita`;
  }, [book, ready, load, loadGoals, loadMissions]);

  useEffect(() => {
    fetch('/api/transactions').then((r) => r.json()).then((j) => j.success && setMeta(j.wallets)).catch(() => {});
    const f = (e: any) => { e.preventDefault(); setInstallEv(e); };
    window.addEventListener('beforeinstallprompt', f);
    return () => window.removeEventListener('beforeinstallprompt', f);
  }, []);

  const st = bookStyle(book);
  const kind = book === MAIN ? 'Kas utama' : book === ALL ? 'Gabungan semua pos' : 'Pos kegiatan';
  const txs = useMemo(() => data?.transactions ?? [], [data]);
  const years = useMemo(() => {
    const s = new Set<string>([String(new Date().getFullYear())]);
    txs.forEach((t) => { const d = parseDate(t.date); if (d) s.add(String(d.getFullYear())); });
    return [...Array.from(s).sort().reverse(), ALL];
  }, [txs]);
  const yTx = useMemo(() => txs.filter((t) => year === ALL || String(parseDate(t.date)?.getFullYear()) === year), [txs, year]);
  const stats = useMemo(() => {
    let i = 0, e = 0;
    yTx.forEach((t) => { if (!isTransfer(t)) t.type === 'Pemasukan' ? (i += t.amount) : (e += t.amount); });
    return { i, e, s: i - e };
  }, [yTx]);
  const months = useMemo(() => {
    const y = year === ALL ? String(new Date().getFullYear()) : year;
    let run = 0;
    return MONTHS.map((name, i) => {
      let inc = 0, exp = 0;
      yTx.forEach((t) => {
        if (isTransfer(t)) return;
        const d = parseDate(t.date);
        if (d && String(d.getFullYear()) === y && d.getMonth() === i) t.type === 'Pemasukan' ? (inc += t.amount) : (exp += t.amount);
      });
      run += inc - exp;
      return { i, name, inc, exp, bal: run };
    });
  }, [yTx, year]);
  const maxBar = Math.max(1, ...months.flatMap((m) => [m.inc, m.exp]));
  const cats = useMemo(() => {
    const m: Record<string, number> = {};
    let tot = 0;
    yTx.forEach((t) => {
      if (isTransfer(t) || t.type !== 'Pengeluaran') return;
      if (pick !== null && parseDate(t.date)?.getMonth() !== pick) return;
      m[t.category] = (m[t.category] || 0) + t.amount;
      tot += t.amount;
    });
    const list = Object.entries(m).sort((a, b) => b[1] - a[1]).map(([name, amt], k) => ({ name, amt, pct: Math.round((amt / (tot || 1)) * 100), color: PAL[k % PAL.length] }));
    let a = 0;
    const parts = list.map((c) => { const s = a; a += (c.amt / (tot || 1)) * 100; return `${c.color} ${s}% ${a}%`; });
    return { list, tot, bg: parts.length ? `conic-gradient(${parts.join(',')})` : 'var(--line)' };
  }, [yTx, pick]);
  const week = useMemo(() => {
    const n = new Date();
    const dow = (n.getDay() + 6) % 7;
    return ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((l, i) => {
      const day = new Date(n.getFullYear(), n.getMonth(), n.getDate() - dow + i).getTime();
      let exp = 0;
      txs.forEach((t) => { if (!isTransfer(t) && t.type === 'Pengeluaran' && parseDate(t.date)?.getTime() === day) exp += t.amount; });
      return { l, exp, today: i === dow, future: i > dow };
    });
  }, [txs]);
  const maxWeek = Math.max(1, ...week.map((w) => w.exp));
  const wal = useMemo(() => {
    const n = new Date();
    const g = new Map<string, WebTransactionItem[]>();
    txs.forEach((t) => { const k = t.wallet || 'Cash'; g.set(k, [...(g.get(k) || []), t]); });
    const cnt: Record<string, number> = {};
    return Array.from(g.entries()).map(([key, list]) => {
      const kind = kindOf(key);
      const label = wLabel(key);
      const theme = getWalletTheme(key, label);
      list.sort((a, b) => (parseDate(b.date)?.getTime() || 0) - (parseDate(a.date)?.getTime() || 0));
      let bal = 0, inM = 0, outM = 0;
      list.forEach((t) => {
        const c = t.type === 'Pemasukan' ? t.amount : -t.amount;
        bal += c;
        const d = parseDate(t.date);
        if (!isTransfer(t) && d && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear()) c > 0 ? (inM += c) : (outM -= c);
      });
      return { key, kind, label, theme, list, bal, inM, outM };
    }).sort((a, b) => b.bal - a.bal);
  }, [txs]);
  const walTotal = wal.reduce((s, w) => s + w.bal, 0);
  const listed = useMemo(() => {
    const k = q.trim().toLowerCase();
    return yTx
      .filter((t) => (typeF === 'all' || t.type === typeF) && (monthF === 'all' || parseDate(t.date)?.getMonth() === +monthF) && (!k || `${t.description} ${t.category} ${t.pic || ''}`.toLowerCase().includes(k)))
      .sort((a, b) => (parseDate(b.date)?.getTime() || 0) - (parseDate(a.date)?.getTime() || 0));
  }, [yTx, q, typeF, monthF]);
  const groups = useMemo(() => {
    const g: [string, WebTransactionItem[]][] = [];
    listed.slice(0, limit).forEach((t) => { const l = g[g.length - 1]; if (l && l[0] === t.date) l[1].push(t); else g.push([t.date, [t]]); });
    return g;
  }, [listed, limit]);

  const debts = data?.debts?.items ?? [];
  const actD = debts.filter((d) => d.status === 'Belum Lunas');
  const doneD = debts.filter((d) => d.status === 'Lunas');
  const sumD = (t: string) => actD.filter((d) => d.type === t).reduce((s, d) => s + (d.remainingAmount || d.amount), 0);
  const bud = data?.budget;
  const bAmt = (budMode === 'monthly' ? bud?.amount : bud?.dailyAmount) || 0;
  const bSpent = (budMode === 'monthly' ? bud?.spent : bud?.dailySpent) || 0;
  const bPct = (budMode === 'monthly' ? bud?.percentage : bud?.dailyPercentage) || 0;
  const writeBook = book === ALL ? MAIN : book;
  const insights = useMemo(() => {
    const out: string[] = [];
    const n = new Date();
    const DAY = 864e5;
    const spend = (f: (d: Date) => boolean) => txs.reduce((s, t) => { if (isTransfer(t) || t.type !== 'Pengeluaran') return s; const d = parseDate(t.date); return d && f(d) ? s + t.amount : s; }, 0);
    const dow = (n.getDay() + 6) % 7;
    const mon = new Date(n.getFullYear(), n.getMonth(), n.getDate() - dow).getTime();
    const thisW = spend((d) => d.getTime() >= mon);
    const lastW = spend((d) => d.getTime() >= mon - 7 * DAY && d.getTime() < mon - 7 * DAY + (dow + 1) * DAY);
    if (thisW > 0 && lastW > 0) {
      const pc = Math.round(((thisW - lastW) / lastW) * 100);
      out.push(pc >= 0 ? `Pengeluaran minggu ini ${pc}% lebih tinggi dari minggu lalu pada hari yang sama.` : `Pengeluaran minggu ini ${-pc}% lebih hemat dari minggu lalu pada hari yang sama.`);
    }
    const byCat: Record<string, number> = {};
    txs.forEach((t) => { const d = parseDate(t.date); if (!isTransfer(t) && t.type === 'Pengeluaran' && d && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear()) byCat[t.category] = (byCat[t.category] || 0) + t.amount; });
    const top = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];
    if (top) out.push(`Kategori terbesar bulan ini: ${top[0]} (${rp(top[1])}).`);
    const spent = bud?.spent || 0, amt = bud?.amount || 0;
    if (amt > 0 && spent > 0) {
      const perDay = spent / n.getDate();
      const dim = new Date(n.getFullYear(), n.getMonth() + 1, 0).getDate();
      out.push(perDay * dim > amt ? (spent >= amt ? 'Budget bulan ini sudah terlampaui.' : `Dengan laju sekarang, budget bulan ini habis sekitar tanggal ${Math.ceil(amt / perDay)}.`) : `Laju belanja aman, perkiraan akhir bulan ${rp(Math.round(perDay * dim))} dari budget ${rp(amt)}.`);
    }
    return out.slice(0, 3);
  }, [txs, bud]);
  const walletOpts = useMemo(() => Array.from(new Set(['Cash', ...meta, ...wal.map((w) => w.key)])), [meta, wal]);
  const catOpts = useMemo(() => {
    const m: Record<string, number> = {};
    txs.forEach((t) => { if (!isTransfer(t)) m[t.category] = (m[t.category] || 0) + 1; });
    return Object.keys(m).sort((a, b) => m[b] - m[a]);
  }, [txs]);

  const say = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3200); };
  const post = async (url: string, body: object) => {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!j.success) throw new Error(j.error || 'Gagal menyimpan');
  };
  const saveBudget = async () => {
    const n = parseInt(budIn.replace(/\D/g, ''), 10);
    if (isNaN(n)) return say('Isi nominal budget dulu');
    try { await post('/api/budget', { book: writeBook, amount: n, type: budMode }); setSheet(null); say('Budget disimpan'); load(book, true); } catch (e: any) { say(e.message); }
  };
  const settle = async (d: DebtItem) => {
    if (!confirm(d.type === 'Piutang' ? `Uang dari ${d.person} sudah diterima?` : `Utang ke ${d.person} sudah dibayar lunas?`)) return;
    try { await post('/api/debts', { action: 'settle', debtId: d.id }); say('Ditandai lunas'); load(book, true); } catch (e: any) { say(e.message); }
  };
  const addDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseInt(df.amount.replace(/\D/g, ''), 10);
    if (!df.person.trim() || !n) return say('Isi nama dan nominal');
    try {
      await post('/api/debts', { action: 'add', book: writeBook, type: df.type, person: df.person.trim(), amount: n, description: df.desc.trim() || '-' });
      setDf({ type: df.type, person: '', amount: '', desc: '' }); setSheet(null); say('Catatan disimpan'); load(book, true);
    } catch (er: any) { say(er.message); }
  };

  const rowNo = (t: WebTransactionItem) => Number(t.id.split('-').slice(-2)[0]);
  const openAdd = () => { setForm({ id: '', book: writeBook, row: 0, type: 'Pengeluaran', category: '', amount: '', desc: '', date: ymd(new Date()), wallet: 'Cash' }); setSheet('tx'); };
  const openEdit = (t: WebTransactionItem) => { setForm({ id: t.id, book: t.book, row: rowNo(t), type: t.type, category: t.category, amount: String(t.amount), desc: t.description, date: ymd(parseDate(t.date) || new Date()), wallet: t.wallet || 'Cash' }); setSheet('tx'); };
  const saveTx = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseInt(form.amount.replace(/\D/g, ''), 10);
    if (!n) return say('Isi nominal dulu');
    try { await post('/api/transactions', { action: form.id ? 'edit' : 'add', book: form.book, row: form.row, type: form.type, category: form.category || 'Lain-lain', amount: n, description: form.desc, date: form.date, wallet: form.wallet }); setSheet(null); say(form.id ? 'Perubahan disimpan' : 'Transaksi dicatat'); load(book, true); } catch (er: any) { say(er.message); }
  };
  const delTx = async (t: WebTransactionItem) => {
    if (!confirm(`Hapus "${t.description || t.category}" ${rp(t.amount)}?`)) return;
    try { await post('/api/transactions', { action: 'delete', book: t.book, row: rowNo(t) }); say('Transaksi dihapus'); load(book, true); } catch (er: any) { say(er.message); }
  };
  const goalCall = async (body: object, ok: string) => { try { await post('/api/goals', body); setSheet(null); say(ok); loadGoals(book); } catch (er: any) { say(er.message); } };
  const openTransfer = () => { setTf({ mode: 'wallet', from: walletOpts[0] || 'Cash', to: walletOpts[1] || '', toBook: books.find((b) => b !== writeBook) || '', amount: '', desc: '' }); setSheet('transfer'); };
  const doTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseInt(tf.amount.replace(/\D/g, ''), 10);
    if (!n) return say('Isi nominal dulu');
    if (tf.mode === 'wallet' && (!tf.to || tf.to === tf.from)) return say('Pilih dompet asal dan tujuan yang berbeda');
    if (tf.mode === 'book' && !tf.toBook) return say('Pilih pos tujuan');
    try { await post('/api/transfer', { mode: tf.mode, book: writeBook, from: tf.from, to: tf.to, toBook: tf.toBook, amount: n, description: tf.desc }); setSheet(null); say('Berhasil dipindahkan'); load(book, true); } catch (er: any) { say(er.message); }
  };
  const exportCsv = () => {
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [['Tanggal', 'Jenis', 'Kategori', 'Nominal', 'Keterangan', 'Dompet', 'Pos'], ...yTx.map((t) => [t.date, t.type, t.category, t.amount, t.description, t.wallet || '', t.book])];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\ufeff' + rows.map((r) => r.map(esc).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' }));
    a.download = `transaksi-${book}-${year}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    setSheet(null);
  };
  const printReport = () => { setTab('report'); setSheet(null); setTimeout(() => window.print(), 350); };
  const install = async () => {
    if (installEv) { installEv.prompt(); setInstallEv(null); setSheet(null); } else say('iPhone: ketuk Bagikan lalu Tambah ke Layar Utama. Android: menu browser lalu Instal aplikasi.');
  };
  const claimMission = (m: MissionData) => {
    setClaimedIds((prev) => {
      if (prev.includes(m.id)) return prev;
      const next = [...prev, m.id];
      try { localStorage.setItem('misi_claimed_ids', JSON.stringify(next)); } catch { /* */ }
      return next;
    });
    setRewardReveal(m);
  };
  const claimAllMissions = (list: MissionData[]) => {
    if (!list.length) return;
    setClaimedIds((prev) => {
      const next = Array.from(new Set([...prev, ...list.map((m) => m.id)]));
      try { localStorage.setItem('misi_claimed_ids', JSON.stringify(next)); } catch { /* */ }
      return next;
    });
    setRewardReveal(list[0]);
    say(`${list.length} stiker berhasil diklaim!`);
  };
  const togglePartner = (m: MissionData) => {
    const next = partnerId === m.id ? null : m.id;
    setPartnerId(next);
    setPartnerBubble(false);
    try { next ? localStorage.setItem('misi_partner_id', next) : localStorage.removeItem('misi_partner_id'); } catch { /* */ }
    say(next ? `${m.title} dipasang di halaman utama!` : 'Partner beranda dilepas');
  };

  const row = (t: WebTransactionItem) => (
    <li key={t.id} className="tx">
      <button className="tx-main" onClick={() => setOpen(open === t.id ? null : t.id)} aria-expanded={open === t.id}>
        <span className="tx-ic">{icon(t.category)}</span>
        <span className="tx-t"><b>{t.description || t.category}</b><small>{t.category}{t.wallet ? `, ${t.wallet}` : ''}</small></span>
        <span className={`num tx-a ${t.type === 'Pemasukan' ? 'in' : 'out'}`}>{t.type === 'Pemasukan' ? '+' : '-'}{rp(t.amount)}</span>
      </button>
      {open === t.id && (
        <div className="tx-more">
          <span>{dayLabel(t.date)}{t.inputTime ? `, ${t.inputTime}` : ''}</span>
          {t.pic && <span>Dicatat oleh {t.pic}</span>}
          {isTransfer(t) && <span>Pindah saldo antar pos</span>}
          {t.noteLink && <a href={t.noteLink} target="_blank" rel="noopener noreferrer">Lihat foto nota</a>}
          {!isTransfer(t) && <span className="tx-act"><button onClick={() => openEdit(t)}>Ubah</button><button className="out" onClick={() => delTx(t)}>Hapus</button></span>}
        </div>
      )}
    </li>
  );
  const Empty = ({ children }: { children: React.ReactNode }) => <p className="empty">{children}</p>;
  const yearChips = (
    <div className="chips" role="group" aria-label="Pilih tahun">
      {years.map((y) => <button key={y} className={year === y ? 'on' : ''} onClick={() => setYear(y)}>{y === ALL ? 'Semua tahun' : y}</button>)}
    </div>
  );
  const pm = pick !== null ? months[pick] : null;
  const books = (data?.books ?? [book]).filter((b) => !b.startsWith('_'));

  return (
    <div className="app" style={{ '--accent': st.c } as React.CSSProperties}>
      <header className="top">
        <button
          type="button"
          className="bookbtn"
          onClick={() => { setShowMisi((v) => !v); window.scrollTo({ top: 0 }); }}
          aria-label={`Pos aktif: ${book}. Ketuk untuk buka misi`}
          style={{ cursor: 'pointer', textAlign: 'left', border: 'none' }}
        >
          <span className="bk-emoji" style={{ color: st.c }}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </span>
          <span className="bk-t"><b>{book === ALL ? 'Semua pos' : book}</b><small>{kind}</small></span>
        </button>
        <button className={`icbtn ${busy ? 'spin' : ''}`} onClick={() => load(book, true)} disabled={busy} aria-label="Muat ulang dari Google Sheets">
          <Ic d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" />
        </button>
        <button className="icbtn" onClick={() => setSheet('more')} aria-label="Menu lainnya"><Ic d="M5 12h.01M12 12h.01M19 12h.01" /></button>
      </header>

      <main className="content">
        {error && <div className="err" role="alert"><span>{error}</span><button onClick={() => load(book)}>Coba lagi</button></div>}
        {loading && !data ? <><div className="skel h" /><div className="skel" /><div className="skel" /></> : (
          <>
            {!showMisi && tab !== 'debt' && tab !== 'wallet' && yearChips}

            {!showMisi && tab === 'home' && (
              <>
                <section className="card hero" style={{ position: 'relative', overflow: 'visible' }}>
                  <small>Saldo {year === ALL ? 'semua tahun' : year}</small>
                  <div className="big">{rp(stats.s)}</div>
                  <div className="pair">
                    <div><small>Masuk</small><b className="num">+{rp(stats.i)}</b></div>
                    <div><small>Keluar</small><b className="num">-{rp(stats.e)}</b></div>
                  </div>
                  <small>{yTx.length} transaksi. Diperbarui {data?.lastUpdated}</small>
                  {(() => {
                    const partner = partnerId ? missions.find((m) => m.id === partnerId && m.unlocked) : null;
                    if (!partner) return null;
                    return (
                      <div style={{ position: 'absolute', right: 14, bottom: 10, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        {partnerBubble && (
                          <div style={{
                            background: '#fff', color: '#111827', fontSize: 11, fontWeight: 600,
                            padding: '6px 10px', borderRadius: 12, boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
                            marginBottom: 4, maxWidth: 165, textAlign: 'right', lineHeight: 1.35,
                          }}>
                            {partner.quote}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => setPartnerBubble((v) => !v)}
                          aria-label={`Stiker partner ${partner.title}`}
                          style={{
                            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                            width: 62, height: 62, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.28))',
                            transition: 'transform 0.15s',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1) rotate(-4deg)')}
                          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={`/stiker/${partner.stiker}`} alt={partner.stikerAlt} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        </button>
                      </div>
                    );
                  })()}
                </section>

                {insights.length > 0 && (
                  <section className="card">
                    <h3>Yang perlu diperhatikan</h3>
                    <ul className="notes">{insights.map((s) => <li key={s}>{s}</li>)}</ul>
                  </section>
                )}

                <section className="card">
                  <div className="card-h">
                    <h3>Budget</h3>
                    <div className="seg">
                      <button className={budMode === 'monthly' ? 'on' : ''} onClick={() => setBudMode('monthly')}>Bulan ini</button>
                      <button className={budMode === 'daily' ? 'on' : ''} onClick={() => setBudMode('daily')}>Per hari</button>
                    </div>
                  </div>
                  {bAmt > 0 ? (
                    <>
                      <div className="prog"><i style={{ width: `${Math.min(100, bPct)}%` }} className={bPct >= 100 ? 'over' : ''} /></div>
                      <p className="line"><b className="num">{rp(bSpent)}</b> terpakai dari <span className="num">{rp(bAmt)}</span></p>
                      <p className="mute">{bPct >= 100 ? `Lewat ${rp(bSpent - bAmt)} dari batas` : `Sisa ${rp(bAmt - bSpent)} (${bPct}% terpakai)`}</p>
                    </>
                  ) : <Empty>Belum ada budget {budMode === 'monthly' ? 'bulanan' : 'harian'} untuk pos ini.</Empty>}
                  <button className="btn ghost" onClick={() => { setBudIn(bAmt ? String(bAmt) : ''); setSheet('budget'); }}>{bAmt ? 'Ubah budget' : 'Atur budget'}</button>
                </section>

                <section className="card">
                  <div className="card-h"><h3>Target tabungan</h3><button className="link" onClick={() => { setGf({ id: '', name: '', target: '', due: '', amount: '' }); setSheet('goal'); }}>Tambah target</button></div>
                  {goals.length === 0 ? <Empty>Belum ada target di pos ini. Contoh: Liburan Rp 10.000.000.</Empty> : goals.map((g) => {
                    const pc = Math.min(100, Math.round((g.saved / (g.target || 1)) * 100));
                    return (
                      <button className="goal" key={g.id} onClick={() => { setGf({ id: g.id, name: g.name, target: '', due: '', amount: '' }); setSheet('deposit'); }} aria-label={`${g.name}, ${pc}%. Ketuk untuk menyetor`}>
                        <span className="card-h"><b>{g.name}</b><b className="num">{pc}%</b></span>
                        <span className="prog"><i style={{ width: `${pc}%` }} /></span>
                        <small>{rp(g.saved)} dari {rp(g.target)}{goalNote(g)}</small>
                      </button>
                    );
                  })}
                </section>

                <section className="card">
                  <div className="card-h"><h3>Pengeluaran minggu ini</h3><small className="mute num">{rp(week.reduce((s, w) => s + w.exp, 0))}</small></div>
                  <div className="week">
                    {week.map((w) => (
                      <div key={w.l} className={`wd ${w.today ? 'today' : ''}`}>
                        <span className="num wv">{w.future ? '' : short(w.exp)}</span>
                        <span className="wb"><i style={{ height: `${w.future ? 0 : Math.max(w.exp ? 6 : 0, (w.exp / maxWeek) * 100)}%` }} /></span>
                        <small>{w.l}</small>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="card">
                  <div className="card-h"><h3>Dompet</h3><button className="link" onClick={() => setTab('wallet')}>Buka dompet</button></div>
                  {wal.slice(0, 4).map((w) => <div className="kv" key={w.key}><span>{w.label}</span><b className="num">{rp(w.bal)}</b></div>)}
                </section>

                <section className="card">
                  <div className="card-h"><h3>Transaksi terakhir</h3><button className="link" onClick={() => setTab('tx')}>Lihat semua</button></div>
                  {yTx.length ? <ul className="txs">{[...yTx].sort((a, b) => (parseDate(b.date)?.getTime() || 0) - (parseDate(a.date)?.getTime() || 0)).slice(0, 5).map(row)}</ul>
                    : <Empty>Belum ada transaksi. Kirim catatan lewat bot Telegram, nanti muncul di sini.</Empty>}
                </section>
              </>
            )}

            {!showMisi && tab === 'wallet' && (() => {
              const sel = wal.find((w) => w.key === wSel) || null;
              const ordered = sel ? [sel, ...wal.filter((w) => w !== sel)] : wal;
              return (
                <>
                  <div className={`wstack ${sel ? 'sel' : ''}`}>
                    {ordered.map((w) => {
                      const isExpanded = sel?.key === w.key;
                      return (
                        <div
                          key={w.key}
                          className={`wcard ${isExpanded ? 'is-sel' : ''}`}
                          style={{ background: w.theme.gradient }}
                          onClick={() => setWSel(isExpanded ? null : w.key)}
                          role="button"
                          tabIndex={0}
                          aria-expanded={isExpanded}
                          aria-label={`${w.label}, saldo ${rp(w.bal)}`}
                        >
                          {isExpanded ? (
                            <div className="wc-inner">
                              <div className="wc-header">
                                <div className="wc-brand">
                                  {w.theme.badge}
                                  <span className="wc-name">{w.label}</span>
                                </div>
                                <div className="wc-header-right">
                                  <ContactlessWave />
                                </div>
                              </div>

                              <div className="wc-mid">
                                <CardChip />
                                <div className="wc-bal-wrap">
                                  <span className="wc-bal-label">Saldo Saat Ini</span>
                                  <span className="wc-bal">{rp(w.bal)}</span>
                                </div>
                              </div>

                              <div className="wc-foot">
                                <div className="wc-pill in">
                                  <span>Masuk</span>
                                  <b className="num">+{rp(w.inM)}</b>
                                </div>
                                <div className="wc-pill out">
                                  <span>Keluar</span>
                                  <b className="num">-{rp(w.outM)}</b>
                                </div>
                                <div className="wc-card-no">
                                  •••• {Math.abs(w.key.split('').reduce((a, b) => a + b.charCodeAt(0), 1000) % 9000 + 1000)}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="wc-peek">
                              <div className="wc-brand">
                                {w.theme.badge}
                                <span className="wc-name">{w.label}</span>
                              </div>
                              <div className="wc-peek-right">
                                <b className="num wc-mini">{rp(w.bal)}</b>
                                <span className="wc-chevron">›</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {sel ? (
                    <section className="card flush">
                      <div className="card-h" style={{ padding: '8px 16px' }}>
                        <h3 className="day" style={{ padding: 0 }}>Mutasi {sel.label}</h3>
                        <button className="link" onClick={() => setWSel(null)} style={{ fontSize: '13px' }}>Tutup kartu</button>
                      </div>
                      {sel.list.length ? <ul className="txs">{sel.list.slice(0, 30).map(row)}</ul> : <div className="pad"><Empty>Belum ada transaksi di dompet ini.</Empty></div>}
                    </section>
                  ) : (
                    <section className="card">
                      <div className="kv"><span>Total semua dompet</span><b className="num">{rp(walTotal)}</b></div>
                      <p className="mute">Ketuk salah satu kartu untuk melihat rincian mutasi dompet.</p>
                      <button className="btn ghost" onClick={openTransfer}>Pindah uang antar dompet</button>
                    </section>
                  )}
                </>
              );
            })()}

            {!showMisi && tab === 'tx' && (
              <>
                <div className="filters">
                  <input type="search" placeholder="Cari keterangan atau kategori" value={q} onChange={(e) => { setQ(e.target.value); setLimit(40); }} aria-label="Cari transaksi" />
                  <select value={monthF} onChange={(e) => { setMonthF(e.target.value); setLimit(40); }} aria-label="Filter bulan">
                    <option value="all">Semua bulan</option>
                    {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                  </select>
                </div>
                <div className="seg wide">
                  {([['all', 'Semua'], ['Pemasukan', 'Masuk'], ['Pengeluaran', 'Keluar']] as const).map(([v, l]) => (
                    <button key={v} className={typeF === v ? 'on' : ''} onClick={() => { setTypeF(v); setLimit(40); }}>{l}</button>
                  ))}
                </div>
                <p className="mute">{listed.length} transaksi</p>
                {groups.length === 0 && <Empty>Tidak ada transaksi yang cocok. Ubah filter atau pilih tahun lain.</Empty>}
                {groups.map(([date, items]) => (
                  <section key={date} className="card flush"><h3 className="day">{dayLabel(date)}</h3><ul className="txs">{items.map(row)}</ul></section>
                ))}
                {listed.length > limit && <button className="btn" onClick={() => setLimit(limit + 40)}>Tampilkan lebih banyak</button>}
              </>
            )}

            {!showMisi && tab === 'report' && (
              <>
                <section className="card">
                  <div className="card-h">
                    <h3>Arus kas per bulan</h3>
                    <span className="legend"><i className="in" />Masuk<i className="out" />Keluar</span>
                  </div>
                  <div className="bars">
                    {months.map((m) => (
                      <button key={m.i} className={pick === m.i ? 'on' : ''} onClick={() => setPick(pick === m.i ? null : m.i)} aria-label={`${m.name}: masuk ${rp(m.inc)}, keluar ${rp(m.exp)}`} aria-pressed={pick === m.i}>
                        <span className="bc"><i className="in" style={{ height: `${(m.inc / maxBar) * 100}%` }} /><i className="out" style={{ height: `${(m.exp / maxBar) * 100}%` }} /></span>
                        <small>{m.name.slice(0, 3)}</small>
                      </button>
                    ))}
                  </div>
                  <div className="kv"><span>{pm ? `${pm.name}, masuk` : 'Total masuk'}</span><b className="num in">+{rp(pm ? pm.inc : months.reduce((s, m) => s + m.inc, 0))}</b></div>
                  <div className="kv"><span>{pm ? `${pm.name}, keluar` : 'Total keluar'}</span><b className="num out">-{rp(pm ? pm.exp : months.reduce((s, m) => s + m.exp, 0))}</b></div>
                  <div className="kv"><span>{pm ? 'Saldo akhir bulan' : 'Saldo akhir tahun'}</span><b className="num">{rp(pm ? pm.bal : months[11].bal)}</b></div>
                  {pm && <button className="link" onClick={() => setPick(null)}>Tampilkan setahun penuh</button>}
                </section>

                <section className="card">
                  <h3>Pengeluaran per kategori{pm ? `, ${pm.name}` : ''}</h3>
                  {cats.list.length === 0 ? <Empty>Belum ada pengeluaran pada periode ini.</Empty> : (
                    <>
                      <div className="donut" style={{ background: cats.bg }}><div><small>Total</small><b className="num">{rp(cats.tot)}</b></div></div>
                      <ul className="cats">
                        {cats.list.map((c) => (
                          <li key={c.name}>
                            <span className="dot" style={{ background: c.color }} />
                            <span className="cn"><CatIcon category={c.name} size={15} /> <span>{c.name}</span></span>
                            <b className="num">{rp(c.amt)}</b><small>{c.pct}%</small>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </section>

                {data?.monthlyComparison && (
                  <section className="card">
                    <h3>Rekor dan rata-rata</h3>
                    <div className="kv"><span>Pemasukan tertinggi</span><b className="num">{data.monthlyComparison.highestIncomeMonth ? `${rp(data.monthlyComparison.highestIncomeMonth.amount)} (${data.monthlyComparison.highestIncomeMonth.monthLabel})` : '-'}</b></div>
                    <div className="kv"><span>Pengeluaran tertinggi</span><b className="num">{data.monthlyComparison.highestExpenseMonth ? `${rp(data.monthlyComparison.highestExpenseMonth.amount)} (${data.monthlyComparison.highestExpenseMonth.monthLabel})` : '-'}</b></div>
                    <div className="kv"><span>Rata-rata masuk per bulan</span><b className="num">{rp(data.monthlyComparison.averageMonthlyIncome)}</b></div>
                    <div className="kv"><span>Rata-rata keluar per bulan</span><b className="num">{rp(data.monthlyComparison.averageMonthlyExpense)}</b></div>
                  </section>
                )}
              </>
            )}

            {!showMisi && tab === 'debt' && (
              <>
                <div className="pair tiles">
                  <div className="card"><small>Piutang (uang kita di orang)</small><b className="num in">{rp(sumD('Piutang'))}</b></div>
                  <div className="card"><small>Utang (harus kita bayar)</small><b className="num out">{rp(sumD('Utang'))}</b></div>
                </div>
                <div className="seg wide">
                  <button className={debtTab === 'active' ? 'on' : ''} onClick={() => setDebtTab('active')}>Belum lunas ({actD.length})</button>
                  <button className={debtTab === 'settled' ? 'on' : ''} onClick={() => setDebtTab('settled')}>Sudah lunas ({doneD.length})</button>
                </div>
                {(debtTab === 'active' ? actD : doneD).length === 0 && <Empty>{debtTab === 'active' ? 'Tidak ada utang atau piutang yang aktif.' : 'Belum ada yang dilunasi.'}</Empty>}
                {(debtTab === 'active' ? actD : doneD).map((d) => (
                  <section key={d.id} className="card debt">
                    <div className="card-h"><b>{d.person}</b><b className={`num ${d.type === 'Piutang' ? 'in' : 'out'}`}>{rp(debtTab === 'active' ? d.remainingAmount || d.amount : d.amount)}</b></div>
                    <p className="mute">{d.type}{book === ALL ? `, pos ${d.book}` : ''}. {d.description && d.description !== '-' ? d.description : 'Tanpa keterangan'}</p>
                    <p className="mute">Dicatat {d.date}{d.settledDate ? `, lunas ${d.settledDate}` : ''}</p>
                    {debtTab === 'active' && <button className="btn ghost" onClick={() => settle(d)}>{d.type === 'Piutang' ? 'Tandai sudah diterima' : 'Tandai sudah dibayar'}</button>}
                  </section>
                ))}
                <button className="btn" onClick={() => setSheet('debt')}>Catat utang atau piutang</button>
              </>
            )}

            {showMisi && (() => {
              const claimedSet = new Set(claimedIds);
              const readyToClaim = missions.filter((m) => m.unlocked && !claimedSet.has(m.id));
              const claimedList = missions.filter((m) => m.unlocked && claimedSet.has(m.id));
              const lockedList = missions.filter((m) => !m.unlocked);
              const activeXp = claimedList.reduce((s, m) => s + m.xp, 0);
              const rank = getRank(activeXp);
              const rankPct = rank.lv === 5 ? 100 : Math.min(100, Math.round(((activeXp - rank.min) / (rank.max - rank.min)) * 100));
              const partner = partnerId ? missions.find((m) => m.id === partnerId && m.unlocked) : null;

              return (
                <>
                  {/* Player Rank Hero Card */}
                  <section className="card hero" style={{ padding: '18px 18px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.2)', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, marginBottom: 6 }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                          LEVEL {rank.lv}
                        </div>
                        <div className="big" style={{ fontSize: 22, lineHeight: 1.2 }}>{rank.name}</div>
                        <small style={{ opacity: 0.9, display: 'block', marginTop: 4 }}>
                          {activeXp} XP · {claimedList.length}/{missions.length} Stiker
                        </small>
                      </div>
                      <div style={{ width: 68, height: 68, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {partner ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={`/stiker/${partner.stiker}`} alt={partner.stikerAlt} style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.3))' }} />
                        ) : (
                          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ marginTop: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, opacity: 0.85, marginBottom: 4 }}>
                        <span>Progress Level</span>
                        <span>{rank.lv === 5 ? 'MAX' : `${activeXp} / ${rank.max} XP`}</span>
                      </div>
                      <div style={{ height: 8, borderRadius: 8, background: 'rgba(255,255,255,0.24)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 8, background: '#FDE68A', width: `${rankPct}%`, transition: 'width 0.5s ease' }} />
                      </div>
                    </div>
                  </section>

                  {/* Banner Klaim Hadiah */}
                  {readyToClaim.length > 0 && (
                    <section className="card" style={{ border: '1.5px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--line)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polyline points="20 12 20 22 4 22 4 12" /><rect x="2" y="7" width="20" height="5" rx="1" /><line x1="12" y1="22" x2="12" y2="7" />
                            <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
                          </svg>
                        </div>
                        <div>
                          <b style={{ fontSize: 14 }}>{readyToClaim.length} Hadiah Siap Diklaim!</b>
                          <p style={{ margin: 0, fontSize: 12, color: 'var(--mute)' }}>Buka stiker kucing barumu sekarang</p>
                        </div>
                      </div>
                      <button type="button" className="btn" style={{ width: 'auto', padding: '8px 14px', fontSize: 13 }} onClick={() => claimAllMissions(readyToClaim)}>
                        Klaim
                      </button>
                    </section>
                  )}

                  {/* Sub-tab Game: Misi vs Album Stiker */}
                  <div className="seg wide">
                    <button type="button" className={misiTab === 'quest' ? 'on' : ''} onClick={() => setMisiTab('quest')}>
                      Daftar Misi ({missions.length})
                    </button>
                    <button type="button" className={misiTab === 'album' ? 'on' : ''} onClick={() => setMisiTab('album')}>
                      Album Stiker ({claimedList.length}/{missions.length})
                    </button>
                  </div>

                  {missionLoading ? (
                    <><div className="skel h" /><div className="skel" /></>
                  ) : misiTab === 'album' ? (
                    <section className="card">
                      <div className="card-h" style={{ marginBottom: 8 }}>
                        <h3>Album Stiker</h3>
                        <small className="mute">Ketuk stiker untuk pasang di beranda</small>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                        {missions.map((m) => {
                          const isClaimed = m.unlocked && claimedSet.has(m.id);
                          const isReady = m.unlocked && !claimedSet.has(m.id);
                          const isPartner = partnerId === m.id;
                          const rar = RARITY_CFG[m.rarity] || RARITY_CFG.common;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => isReady ? claimMission(m) : setMisiSel(m)}
                              style={{
                                position: 'relative',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                padding: '10px 6px 8px',
                                borderRadius: 14,
                                border: isPartner ? '2px solid var(--accent)' : isReady ? '1.5px dashed var(--accent)' : '1px solid var(--line)',
                                background: isPartner ? 'rgba(15,118,110,0.06)' : 'var(--bg)',
                                cursor: 'pointer',
                                textAlign: 'center',
                              }}
                            >
                              {isPartner && (
                                <span style={{ position: 'absolute', top: 5, right: 5, fontSize: 9, fontWeight: 800, background: 'var(--accent)', color: '#fff', padding: '1px 5px', borderRadius: 6 }}>
                                  AKTIF
                                </span>
                              )}
                              {isReady && (
                                <span style={{ position: 'absolute', top: 5, right: 5, fontSize: 9, fontWeight: 800, background: '#D97706', color: '#fff', padding: '1px 5px', borderRadius: 6 }}>
                                  KLAIM
                                </span>
                              )}
                              <div style={{ width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={`/stiker/${m.stiker}`}
                                  alt={m.stikerAlt}
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'contain',
                                    filter: isClaimed ? 'drop-shadow(0 3px 6px rgba(0,0,0,0.16))' : 'brightness(0) opacity(0.18)',
                                  }}
                                />
                              </div>
                              <span style={{ fontSize: 11, fontWeight: 700, color: isClaimed ? 'inherit' : 'var(--mute)', lineHeight: 1.2 }}>
                                {isClaimed ? m.title : '???'}
                              </span>
                              <span style={{ marginTop: 4, fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 6, background: rar.bg, color: rar.color }}>
                                {rar.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  ) : (
                    <>
                      {[
                        { key: 'ready', label: 'Siap Diklaim', list: readyToClaim },
                        { key: 'progress', label: 'Dalam Progress', list: lockedList },
                        { key: 'done', label: 'Sudah Diklaim', list: claimedList },
                      ].filter((g) => g.list.length > 0).map((group) => (
                        <section key={group.key} className="card flush">
                          <div className="card-h" style={{ padding: '12px 16px 8px' }}>
                            <h3 style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                              {group.key === 'ready' ? (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <polyline points="20 12 20 22 4 22 4 12" /><rect x="2" y="7" width="20" height="5" rx="1" /><line x1="12" y1="22" x2="12" y2="7" />
                                </svg>
                              ) : group.key === 'done' ? (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" />
                                </svg>
                              ) : (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                                </svg>
                              )}
                              {group.label}
                            </h3>
                          </div>
                          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {group.list.map((m) => {
                              const rar = RARITY_CFG[m.rarity] || RARITY_CFG.common;
                              const isClaimed = group.key === 'done';
                              const isReady = group.key === 'ready';
                              return (
                                <li
                                  key={m.id}
                                  onClick={() => isReady ? claimMission(m) : setMisiSel(m)}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12,
                                    padding: '10px 16px',
                                    borderBottom: '1px solid var(--line)',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <div style={{ width: 52, height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={`/stiker/${m.stiker}`}
                                      alt={m.stikerAlt}
                                      style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'contain',
                                        filter: isClaimed ? 'drop-shadow(0 2px 5px rgba(0,0,0,0.15))' : isReady ? 'brightness(0.85)' : 'brightness(0) opacity(0.18)',
                                      }}
                                    />
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                      <b style={{ fontSize: 14 }}>{m.title}</b>
                                      <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 6, background: rar.bg, color: rar.color }}>
                                        {rar.label}
                                      </span>
                                    </div>
                                    <p style={{ margin: '2px 0 4px', fontSize: 12, color: 'var(--mute)', lineHeight: 1.4 }}>{m.desc}</p>
                                    {!m.unlocked && m.progress !== undefined && (
                                      <div>
                                        <div style={{ height: 4, borderRadius: 4, background: 'var(--line)', overflow: 'hidden' }}>
                                          <div style={{ height: '100%', borderRadius: 4, background: 'var(--accent)', width: `${m.progress}%`, transition: 'width 0.5s ease' }} />
                                        </div>
                                        {m.progressLabel && <small style={{ fontSize: 10, color: 'var(--mute)', marginTop: 2, display: 'block' }}>{m.progressLabel}</small>}
                                      </div>
                                    )}
                                    {isClaimed && m.progressLabel && (
                                      <small style={{ fontSize: 11, color: 'var(--accent)' }}>+{m.xp} XP · {m.progressLabel}</small>
                                    )}
                                  </div>
                                  {isReady ? (
                                    <button
                                      type="button"
                                      className="btn"
                                      style={{ width: 'auto', padding: '6px 12px', fontSize: 12, flexShrink: 0 }}
                                      onClick={(e) => { e.stopPropagation(); claimMission(m); }}
                                    >
                                      Klaim +{m.xp}
                                    </button>
                                  ) : (
                                    <span style={{ fontSize: 11, fontWeight: 700, color: isClaimed ? 'var(--accent)' : 'var(--mute)', whiteSpace: 'nowrap' }}>
                                      +{m.xp} XP
                                    </span>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </section>
                      ))}
                    </>
                  )}
                </>
              );
            })()}
          </>
        )}
      </main>

      <nav className="nav" aria-label="Menu utama">
        {TABS.map((t) => (
          <button key={t.id} aria-current={!showMisi && tab === t.id ? 'page' : undefined} onClick={() => { setShowMisi(false); setTab(t.id); window.scrollTo({ top: 0 }); }}>
            <Ic d={t.d} /><span>{t.label}</span>
          </button>
        ))}
      </nav>

      {sheet === 'budget' && (
        <Sheet title={`Budget ${budMode === 'monthly' ? 'bulanan' : 'harian'}, ${writeBook}`} onClose={() => setSheet(null)}>
          <div className="seg wide">
            <button className={budMode === 'monthly' ? 'on' : ''} onClick={() => setBudMode('monthly')}>Bulanan</button>
            <button className={budMode === 'daily' ? 'on' : ''} onClick={() => setBudMode('daily')}>Harian</button>
          </div>
          <label className="fld">Nominal (Rp)<input inputMode="numeric" placeholder={budMode === 'monthly' ? '3000000' : '50000'} value={budIn} onChange={(e) => setBudIn(e.target.value)} /></label>
          <button className="btn" onClick={saveBudget}>Simpan budget</button>
        </Sheet>
      )}

      {sheet === 'debt' && (
        <Sheet title="Catat utang atau piutang" onClose={() => setSheet(null)}>
          <form onSubmit={addDebt} className="form">
            <div className="seg wide">
              <button type="button" className={df.type === 'Piutang' ? 'on' : ''} onClick={() => setDf({ ...df, type: 'Piutang' })}>Piutang</button>
              <button type="button" className={df.type === 'Utang' ? 'on' : ''} onClick={() => setDf({ ...df, type: 'Utang' })}>Utang</button>
            </div>
            <label className="fld">Nama orang atau pihak<input value={df.person} onChange={(e) => setDf({ ...df, person: e.target.value })} placeholder="Mamah, Kak Budi, Toko ABC" required /></label>
            <label className="fld">Nominal (Rp)<input inputMode="numeric" value={df.amount} onChange={(e) => setDf({ ...df, amount: e.target.value })} placeholder="70000" required /></label>
            <label className="fld">Keterangan<input value={df.desc} onChange={(e) => setDf({ ...df, desc: e.target.value })} placeholder="Untuk apa" /></label>
            <button className="btn" type="submit">Simpan {df.type.toLowerCase()}</button>
          </form>
        </Sheet>
      )}

      {tab !== 'debt' && tab !== 'report' && !sheet && <button className="fab" onClick={openAdd} aria-label="Catat transaksi">+</button>}

      {sheet === 'tx' && (
        <Sheet title={form.id ? 'Ubah transaksi' : 'Catat transaksi'} onClose={() => setSheet(null)}>
          <form onSubmit={saveTx} className="form">
            <div className="seg wide">
              <button type="button" className={form.type === 'Pengeluaran' ? 'on' : ''} onClick={() => setForm({ ...form, type: 'Pengeluaran' })}>Keluar</button>
              <button type="button" className={form.type === 'Pemasukan' ? 'on' : ''} onClick={() => setForm({ ...form, type: 'Pemasukan' })}>Masuk</button>
            </div>
            {book === ALL && !form.id && <label className="fld">Pos<select value={form.book} onChange={(e) => setForm({ ...form, book: e.target.value })}>{books.map((b) => <option key={b}>{b}</option>)}</select></label>}
            <label className="fld">Nominal (Rp)<input inputMode="numeric" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="35000" required /></label>
            <label className="fld">Kategori<input list="cat-opts" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Makan, Transport, Gaji" /></label>
            <datalist id="cat-opts">{catOpts.map((c) => <option key={c} value={c} />)}</datalist>
            <label className="fld">Keterangan<input value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} placeholder="Makan siang" /></label>
            <div className="two">
              <label className="fld">Tanggal<input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
              <label className="fld">Dompet<select value={form.wallet} onChange={(e) => setForm({ ...form, wallet: e.target.value })}>{walletOpts.map((w) => <option key={w} value={w}>{wLabel(w)}</option>)}</select></label>
            </div>
            <button className="btn" type="submit">Simpan</button>
          </form>
        </Sheet>
      )}

      {sheet === 'goal' && (
        <Sheet title={`Target baru, ${writeBook}`} onClose={() => setSheet(null)}>
          <form className="form" onSubmit={(e) => { e.preventDefault(); const n = parseInt(gf.target.replace(/\D/g, ''), 10); if (!gf.name.trim() || !n) return say('Isi nama dan target'); goalCall({ action: 'add', book: writeBook, name: gf.name, target: n, due: gf.due }, 'Target dibuat'); }}>
            <label className="fld">Nama target<input value={gf.name} onChange={(e) => setGf({ ...gf, name: e.target.value })} placeholder="Liburan, dana darurat" required /></label>
            <label className="fld">Target (Rp)<input inputMode="numeric" value={gf.target} onChange={(e) => setGf({ ...gf, target: e.target.value })} placeholder="10000000" required /></label>
            <label className="fld">Tenggat (boleh dikosongkan)<input type="date" value={gf.due} onChange={(e) => setGf({ ...gf, due: e.target.value })} /></label>
            <button className="btn" type="submit">Buat target</button>
          </form>
        </Sheet>
      )}

      {sheet === 'deposit' && (
        <Sheet title={gf.name} onClose={() => setSheet(null)}>
          <form className="form" onSubmit={(e) => { e.preventDefault(); const n = parseInt(gf.amount.replace(/\D/g, ''), 10); if (!n) return say('Isi nominal setoran'); goalCall({ action: 'deposit', id: gf.id, amount: n }, 'Setoran dicatat'); }}>
            <label className="fld">Setor ke target (Rp)<input inputMode="numeric" value={gf.amount} onChange={(e) => setGf({ ...gf, amount: e.target.value })} placeholder="500000" /></label>
            <button className="btn" type="submit">Setor</button>
            <button type="button" className="link out" onClick={() => confirm(`Hapus target "${gf.name}"?`) && goalCall({ action: 'delete', id: gf.id }, 'Target dihapus')}>Hapus target ini</button>
          </form>
        </Sheet>
      )}

      {sheet === 'transfer' && (
        <Sheet title="Pindah saldo" onClose={() => setSheet(null)}>
          <form className="form" onSubmit={doTransfer}>
            <div className="seg wide">
              <button type="button" className={tf.mode === 'wallet' ? 'on' : ''} onClick={() => setTf({ ...tf, mode: 'wallet' })}>Antar dompet</button>
              <button type="button" className={tf.mode === 'book' ? 'on' : ''} onClick={() => setTf({ ...tf, mode: 'book' })}>Antar pos</button>
            </div>
            {tf.mode === 'wallet' ? (
              <div className="two">
                <label className="fld">Dari<select value={tf.from} onChange={(e) => setTf({ ...tf, from: e.target.value })}>{walletOpts.map((w) => <option key={w} value={w}>{wLabel(w)}</option>)}</select></label>
                <label className="fld">Ke<select value={tf.to} onChange={(e) => setTf({ ...tf, to: e.target.value })}><option value="">Pilih</option>{walletOpts.map((w) => <option key={w} value={w}>{wLabel(w)}</option>)}</select></label>
              </div>
            ) : (
              <label className="fld">Dari {writeBook} ke pos<select value={tf.toBook} onChange={(e) => setTf({ ...tf, toBook: e.target.value })}>{books.filter((b) => b !== writeBook).map((b) => <option key={b}>{b}</option>)}</select></label>
            )}
            <label className="fld">Nominal (Rp)<input inputMode="numeric" value={tf.amount} onChange={(e) => setTf({ ...tf, amount: e.target.value })} placeholder="100000" required /></label>
            {tf.mode === 'book' && <label className="fld">Catatan (boleh dikosongkan)<input value={tf.desc} onChange={(e) => setTf({ ...tf, desc: e.target.value })} /></label>}
            <button className="btn" type="submit">Pindahkan</button>
          </form>
        </Sheet>
      )}

      {sheet === 'more' && (
        <Sheet title="Lainnya" onClose={() => setSheet(null)}>
          <ul className="menu">
            <li><button onClick={openTransfer}>Pindah saldo</button></li>
            <li><button onClick={exportCsv}>Ekspor transaksi ke CSV</button></li>
            <li><button onClick={printReport}>Cetak laporan atau simpan PDF</button></li>
            <li><button onClick={install}>Pasang di layar utama</button></li>
            <li><a href="https://t.me/nabung_date_bot" target="_blank" rel="noopener noreferrer">Buka bot Telegram</a></li>
          </ul>
        </Sheet>
      )}

      {toast && <div className="toast" role="status">{toast}</div>}

      {/* Modal detail misi / stiker */}
      {misiSel && (() => {
        const isClaimed = misiSel.unlocked && claimedIds.includes(misiSel.id);
        const isPartner = partnerId === misiSel.id;
        const rar = RARITY_CFG[misiSel.rarity] || RARITY_CFG.common;
        return (
          <div className="ov" onClick={() => setMisiSel(null)}>
            <div className="sheet" role="dialog" aria-modal="true" aria-label={misiSel.title} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 340, margin: '0 auto' }}>
              <div style={{ textAlign: 'center', padding: '24px 20px 20px' }}>
                <div style={{ width: 140, height: 140, margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/stiker/${misiSel.stiker}`}
                    alt={misiSel.stikerAlt}
                    style={{
                      width: '100%', height: '100%', objectFit: 'contain',
                      filter: isClaimed ? 'drop-shadow(0 8px 18px rgba(0,0,0,0.22))' : 'brightness(0) opacity(0.2)',
                    }}
                  />
                </div>
                <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 10, background: rar.bg, color: rar.color, marginBottom: 8 }}>
                  {rar.label} · +{misiSel.xp} XP
                </span>
                <h2 style={{ margin: '0 0 6px', fontSize: 18 }}>{misiSel.title}</h2>
                <p style={{ color: 'var(--mute)', fontSize: 14, margin: '0 0 12px' }}>{misiSel.desc}</p>
                {isClaimed && (
                  <p style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--accent)', margin: '0 0 14px' }}>
                    &ldquo;{misiSel.quote}&rdquo;
                  </p>
                )}
                {!misiSel.unlocked && misiSel.progress !== undefined && (
                  <div style={{ marginTop: 8, marginBottom: 12 }}>
                    <div style={{ height: 6, borderRadius: 6, background: 'var(--line)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 6, background: 'var(--accent)', width: `${misiSel.progress}%` }} />
                    </div>
                    <small style={{ fontSize: 11, color: 'var(--mute)', marginTop: 4, display: 'block' }}>{misiSel.progressLabel}</small>
                  </div>
                )}
                {isClaimed && (
                  <button
                    type="button"
                    className={isPartner ? 'btn ghost' : 'btn'}
                    style={{ width: '100%', marginBottom: 8 }}
                    onClick={() => { togglePartner(misiSel); setMisiSel(null); }}
                  >
                    {isPartner ? 'Lepas dari Halaman Utama' : 'Pasang di Halaman Utama'}
                  </button>
                )}
                {misiSel.unlocked && !isClaimed && (
                  <button
                    type="button"
                    className="btn"
                    style={{ width: '100%', marginBottom: 8 }}
                    onClick={() => { setMisiSel(null); claimMission(misiSel); }}
                  >
                    Klaim Stiker (+{misiSel.xp} XP)
                  </button>
                )}
                <button type="button" className="btn ghost" style={{ width: '100%' }} onClick={() => setMisiSel(null)}>
                  Tutup
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal Reward Reveal saat klaim stiker */}
      {rewardReveal && (
        <div className="ov" onClick={() => setRewardReveal(null)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-label="Hadiah Stiker Baru" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 340, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', padding: '26px 20px 22px' }}>
              <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', color: 'var(--accent)', marginBottom: 8 }}>
                STIKER TERBUKA · +{rewardReveal.xp} XP
              </span>
              <div style={{ width: 150, height: 150, margin: '6px auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/stiker/${rewardReveal.stiker}`}
                  alt={rewardReveal.stikerAlt}
                  style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 10px 22px rgba(0,0,0,0.25))' }}
                />
              </div>
              <h2 style={{ margin: '0 0 6px', fontSize: 20 }}>{rewardReveal.title}</h2>
              <p style={{ color: 'var(--mute)', fontSize: 13, margin: '0 0 16px' }}>&ldquo;{rewardReveal.quote}&rdquo;</p>
              <button
                type="button"
                className="btn"
                style={{ width: '100%', marginBottom: 8 }}
                onClick={() => { togglePartner(rewardReveal); setRewardReveal(null); }}
              >
                Pasang di Halaman Utama
              </button>
              <button type="button" className="btn ghost" style={{ width: '100%' }} onClick={() => setRewardReveal(null)}>
                Simpan ke Album
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notif stiker baru unlock */}
      {newUnlocks.length > 0 && (() => {
        const m = missions.find((x) => x.id === newUnlocks[0]);
        if (!m) return null;
        return (
          <div
            style={{
              position: 'fixed',
              bottom: 80,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 200,
              background: 'var(--card)',
              borderRadius: 16,
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              maxWidth: 320,
              width: 'calc(100vw - 32px)',
              cursor: 'pointer',
              border: '1.5px solid var(--accent)',
            }}
            onClick={() => { setNewUnlocks((prev) => prev.slice(1)); setMisiSel(m); setShowMisi(true); }}
          >
            <div style={{ width: 48, height: 48, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/stiker/${m.stiker}`} alt={m.stikerAlt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div>
              <b style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                Misi selesai!
              </b>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--mute)' }}>{m.title} · +{m.xp} XP</p>
            </div>
            <button
              style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', opacity: 0.5, flexShrink: 0 }}
              onClick={(e) => { e.stopPropagation(); setNewUnlocks((prev) => prev.slice(1)); }}
              aria-label="Tutup notifikasi"
            >×</button>
          </div>
        );
      })()}
    </div>
  );
}
