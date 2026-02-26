export interface Transaction {
  id?: number;
  amount: number;
  category: TransactionCategory;
  item: string;
  vendor: string | null;
  date: string;
  createdAt?: string;
}

/**
 * 'Savings' is intentionally separated from expense categories.
 * It is EXCLUDED from totalSpent and tracked as a wealth-building asset.
 */
export type TransactionCategory =
  | 'Food'
  | 'Transport'
  | 'Entertainment'
  | 'Health'
  | 'Shopping'
  | 'Utilities'
  | 'Education'
  | 'Other'
  | 'Savings'; // ← wealth accumulation — NOT an expense

export const EXPENSE_CATEGORIES: TransactionCategory[] = [
  'Food', 'Transport', 'Entertainment', 'Health',
  'Shopping', 'Utilities', 'Education', 'Other',
];

export const ALL_CATEGORIES: TransactionCategory[] = [
  ...EXPENSE_CATEGORIES,
  'Savings',
];