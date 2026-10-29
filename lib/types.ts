export type TransactionType = 'Pengeluaran' | 'Pemasukan';
export type WalletType = 'Bank' | 'E-Wallet' | 'Cash';

export interface WalletBalances {
  Bank: number;
  'E-Wallet': number;
  Cash: number;
  total: number;
}

export interface ParsedTransaction {
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  date: string; // Format: YYYY-MM-DD
  noteLink?: string;
  rawMerchantOrItem?: string;
  wallet?: string;
}

export interface ExpenseDetail {
  date: string;
  category: string;
  nominal: number;
  description: string;
  noteLink?: string;
  wallet?: string;
}

export interface SummaryReport {
  isAllTime: boolean;
  periodeLabel: string;
  totalPengeluaran: number;
  totalPemasukan: number;
  saldo: number;
  count: number;
  categoryExpenses: Record<string, number>;
  categoryIncome: Record<string, number>;
  expenseDetails: ExpenseDetail[];
  incomeDetails: ExpenseDetail[];
  walletBalances?: WalletBalances;
}

export interface BookSummary {
  bookName: string;
  totalPengeluaran: number;
  totalPemasukan: number;
  saldo: number;
  count: number;
}

export interface GlobalSummaryReport {
  isAllTime: boolean;
  periodeLabel: string;
  totalPengeluaran: number;
  totalPemasukan: number;
  saldo: number;
  count: number;
  categoryExpenses: Record<string, number>;
  categoryIncome: Record<string, number>;
  books: BookSummary[];
}

export interface TransferBalanceParams {
  sourceBook: string;
  targetBook: string;
  amount: number;
  description?: string;
}

export interface TransferBalanceResult {
  success: boolean;
  sourceBook: string;
  targetBook: string;
  amount: number;
  sourceBalanceBefore: number;
  sourceBalanceAfter: number;
  targetBalanceBefore: number;
  targetBalanceAfter: number;
  date: string;
}

export type UserRole = 'Admin' | 'Member';
export type UserAccessStatus = 'Aktif' | 'Menunggu' | 'Ditolak' | 'Nonaktif';

export interface UserAccessRecord {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  status: UserAccessStatus;
  addedAt: string;
}

export interface WebTransactionItem {
  id: string;
  book: string;
  date: string;
  type: 'Pemasukan' | 'Pengeluaran';
  category: string;
  amount: number;
  description: string;
  noteLink?: string;
  pic?: string;
  inputTime?: string;
  wallet?: string;
}

export interface WebFinanceData {
  books: string[];
  activeBook: string;
  transactions: WebTransactionItem[];
  stats: {
    totalPemasukan: number;
    totalPengeluaran: number;
    saldo: number;
    count: number;
    categoryExpenses: Record<string, number>;
    categoryIncome: Record<string, number>;
    walletBalances?: WalletBalances;
  };
  lastUpdated: string;
}
