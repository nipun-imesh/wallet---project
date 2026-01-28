export type CardBrand = "VISA" | "MASTERCARD" | "AMEX" | "OTHER";

export type FinanceCard = {
  id: string;
  label: string;
  brand: CardBrand;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
  createdAt: string;
};

export type TransactionType = "income" | "expense";

export type FinanceTransaction = {
  id: string;
  type: TransactionType;
  amount: number;
  note?: string;
  cardId?: string;
  createdAt: string;
};

export type FinanceSummary = {
  balance: number;
  totalIncome: number;
  totalExpense: number;
  defaultCard: FinanceCard | null;
};
