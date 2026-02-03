import type {
  FinanceCard,
  FinanceSummary,
  FinanceTransaction,
  TransactionType,
} from "../types/finance";
import { getAuth } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";

const auth = getAuth();

const requireUserId = () => {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated.");
  return user.uid;
};

const userCardsCollection = (uid: string) =>
  collection(db, "users", uid, "cards");

const userTransactionsCollection = (uid: string) =>
  collection(db, "users", uid, "transactions");

const userTransactionDoc = (uid: string, txId: string) =>
  doc(db, "users", uid, "transactions", txId);

const normalizeLast4 = (last4: string) =>
  String(last4).replace(/\D/g, "").slice(-4);

export const addFinanceCard = async (input: {
  label: string;
  brand?: FinanceCard["brand"];
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault?: boolean;
}) => {
  const uid = requireUserId();

  const last4 = normalizeLast4(input.last4);
  if (last4.length !== 4) throw new Error("Card last 4 must be 4 digits");

  const expMonth = Number(input.expMonth);
  const expYear = Number(input.expYear);
  if (!Number.isFinite(expMonth) || expMonth < 1 || expMonth > 12) {
    throw new Error("Invalid expiry month");
  }
  if (!Number.isFinite(expYear) || expYear < 2000 || expYear > 2100) {
    throw new Error("Invalid expiry year");
  }

  const isDefault = Boolean(input.isDefault);

  if (isDefault) {
    // Clear existing defaults
    const existing = await getDocs(userCardsCollection(uid));
    await Promise.all(
      existing.docs.map((d) => updateDoc(d.ref, { isDefault: false })),
    );
  }

  await addDoc(userCardsCollection(uid), {
    label: input.label.trim() || "Card",
    brand: input.brand || "VISA",
    last4,
    expMonth,
    expYear,
    isDefault,
    createdAt: new Date().toISOString(),
  });
};

export const listFinanceCards = async (): Promise<FinanceCard[]> => {
  const uid = requireUserId();
  const q = query(userCardsCollection(uid), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data() as any;
    return {
      id: d.id,
      label: String(data.label || "Card"),
      brand: (data.brand as FinanceCard["brand"]) || "VISA",
      last4: String(data.last4 || ""),
      expMonth: Number(data.expMonth || 0),
      expYear: Number(data.expYear || 0),
      isDefault: Boolean(data.isDefault),
      createdAt: String(data.createdAt || ""),
    };
  });
};

export const setDefaultFinanceCard = async (cardId: string) => {
  const uid = requireUserId();
  const cards = await getDocs(userCardsCollection(uid));

  await Promise.all(
    cards.docs.map((d) => updateDoc(d.ref, { isDefault: d.id === cardId })),
  );
};

export const addFinanceTransaction = async (input: {
  type: TransactionType;
  amount: number;
  note?: string;
  cardId?: string;
}) => {
  const uid = requireUserId();

  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be a positive number");
  }

  await addDoc(userTransactionsCollection(uid), {
    type: input.type,
    amount,
    note: (input.note || "").trim(),
    cardId: input.cardId || "",
    createdAt: new Date().toISOString(),
  });
};

export const updateFinanceTransaction = async (
  id: string,
  input: {
    amount?: number;
    note?: string;
    cardId?: string;
    type?: TransactionType;
  },
) => {
  const uid = requireUserId();
  const ref = userTransactionDoc(uid, id);

  const updates: Record<string, any> = {};

  if (typeof input.type === "string") updates.type = input.type;

  if (typeof input.amount === "number") {
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Amount must be a positive number");
    }
    updates.amount = amount;
  }

  if (typeof input.note === "string") updates.note = input.note.trim();
  if (typeof input.cardId === "string") updates.cardId = input.cardId;

  await updateDoc(ref, updates);
};

export const deleteFinanceTransaction = async (id: string) => {
  const uid = requireUserId();
  const ref = userTransactionDoc(uid, id);
  await deleteDoc(ref);
};

export const listFinanceTransactions = async (
  take: number = 50,
): Promise<FinanceTransaction[]> => {
  const uid = requireUserId();
  const q = query(
    userTransactionsCollection(uid),
    orderBy("createdAt", "desc"),
    limit(take),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data() as any;
    return {
      id: d.id,
      type: (data.type as TransactionType) || "expense",
      amount:
        typeof data.amount === "number"
          ? data.amount
          : Number(data.amount || 0),
      note: String(data.note || ""),
      cardId: String(data.cardId || "") || undefined,
      createdAt: String(data.createdAt || ""),
    };
  });
};

export const getFinanceSummary = async (): Promise<FinanceSummary> => {
  const uid = requireUserId();

  const [cards, transactions] = await Promise.all([
    listFinanceCards(),
    listFinanceTransactions(250),
  ]);

  const defaultCard =
    cards.find((c) => c.isDefault) ||
    (cards.length === 1 ? cards[0] : null) ||
    null;

  let totalIncome = 0;
  let totalExpense = 0;
  for (const t of transactions) {
    if (t.type === "income") totalIncome += t.amount;
    else totalExpense += t.amount;
  }

  return {
    balance: totalIncome - totalExpense,
    totalIncome,
    totalExpense,
    defaultCard,
  };
};
