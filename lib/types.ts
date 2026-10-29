export type TransactionType = 'Pemasukan' | 'Pengeluaran';

export type WalletType = 'Bank' | 'E-Wallet' | 'Cash';

export interface WalletBalances {
  Bank: number;
  'E-Wallet': number;
  Cash: number;
  total: number;
  details?: Record<string, number>;
}

export interface RegisteredWallets {
  banks: string[];
  ewallets: string[];
}

export interface TransferWalletParams {
  activeBook: string;
  fromWallet: WalletType;
  toWallet: WalletType;
  amount: number;
  senderName?: string;
}

export interface ParsedTransaction {
  type: TransactionType;
  category: string;
  amount: number;
  description: string;
  date: string;
  noteLink?: string;
  wallet?: string;
  isTransfer?: boolean;
}

export interface ExpenseDetail {
  date: string;
  category: string;
  nominal: number;
  amount?: number;
  description: string;
  noteLink?: string;
  wallet?: string;
  isTransfer?: boolean;
}

export interface SummaryReport {
  isAllTime?: boolean;
  periodeLabel?: string;
  totalPengeluaran: number;
  totalPemasukan: number;
  saldo: number;
  count: number;
  categoryExpenses: Record<string, number>;
  categoryIncome: Record<string, number>;
  expenseDetails: ExpenseDetail[];
  incomeDetails: ExpenseDetail[];
  bookName?: string;
  walletBalances?: WalletBalances;
}

export interface BookSummary {
  bookName: string;
  totalPengeluaran: number;
  totalPemasukan: number;
  saldo: number;
  count: number;
}

export interface MonthBreakdownItem {
  month: string;
  monthName: string;
  pemasukan: number;
  pengeluaran: number;
  saldo: number;
  count: number;
}

export interface YearSummaryReport {
  year: string;
  bookName: string;
  totalPemasukan: number;
  totalPengeluaran: number;
  saldo: number;
  count: number;
  monthlyBreakdown: MonthBreakdownItem[];
  categoryExpenses: Record<string, number>;
  categoryIncome: Record<string, number>;
  availableYears: string[];
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
  isTransfer?: boolean;
}

export interface BudgetInfo {
  book: string;
  month: string; // 'YYYY-MM'
  monthLabel: string; // 'Oktober 2026'
  amount: number;
  spent: number;
  remaining: number;
  percentage: number;
  status: 'none' | 'safe' | 'half' | 'warning' | 'overbudget';
  dailyAmount?: number;
  dailySpent?: number;
  dailyRemaining?: number;
  dailyPercentage?: number;
  dailyStatus?: 'none' | 'safe' | 'half' | 'warning' | 'overbudget';
}

export interface MonthlyStatsItem {
  month: string; // '2026-10'
  monthLabel: string; // 'Oktober 2026'
  income: number;
  expense: number;
  balance: number;
  budget?: number;
  percentageOfBudget?: number;
  expenseChangePercent?: number; // Perubahan % dibanding bulan sebelumnya (+ / -)
}

export interface MonthlyComparisonReport {
  months: MonthlyStatsItem[];
  highestIncomeMonth?: { month: string; monthLabel: string; amount: number };
  highestExpenseMonth?: { month: string; monthLabel: string; amount: number };
  lowestExpenseMonth?: { month: string; monthLabel: string; amount: number };
  averageMonthlyIncome: number;
  averageMonthlyExpense: number;
}

export interface WebFinanceData {
  books: string[];
  activeBook: string;
  bookBalances?: Record<string, number>;
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
  budget?: BudgetInfo;
  monthlyComparison?: MonthlyComparisonReport;
  lastUpdated: string;
}
