export type Lang = 'ca' | 'es' | 'en';

export type Currency = 'EUR' | 'USD' | 'GBP';

export type CategoryId =
  | 'food'
  | 'transport'
  | 'home'
  | 'fun'
  | 'shopping'
  | 'travel'
  | 'bills'
  | 'health'
  | 'other';

export type SplitMethod = 'equal' | 'exact' | 'percent' | 'shares';

export interface Member {
  id: string;
  name: string;
}

export interface Expense {
  id: string;
  concept: string;
  /** Amount in major units, e.g. 60.5 for 60,50 €. Always rounded to 2 decimals. */
  amount: number;
  paidBy: string;
  /** ISO date (yyyy-mm-dd). */
  date: string;
  category: CategoryId;
  splitMethod: SplitMethod;
  participants: string[];
  /**
   * Only for non-equal splits:
   * - exact: amount in major units per participant
   * - percent: percentage per participant (sums to 100)
   * - shares: arbitrary positive weight per participant
   */
  weights?: Record<string, number>;
  /** Marks an internal payment recorded from the "settle up" flow. */
  settlement?: boolean;
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  currency: Currency;
  members: Member[];
  expenses: Expense[];
  createdAt: string;
  updatedAt: string;
  currentMemberId: string | null;
}

export interface AppState {
  version: 1;
  groups: Group[];
  lang: Lang;
}

export interface Transfer {
  from: string;
  to: string;
  amountCents: number;
}
