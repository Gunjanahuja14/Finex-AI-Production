export interface Transaction {
  id?: number;
  amount: number;
  category: string;
  item: string;
  vendor: string | null;
  date: string;
  createdAt?: string;
}
