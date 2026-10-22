import type {
  AppState,
  CategoryId,
  Currency,
  Expense,
  Group,
  Lang,
  Member,
  SplitMethod,
} from '../types';
import { todayISO } from './dates';
import { uid } from './id';

const STORAGE_KEY = 'femcomptes.state.v1';

const LANGS: Lang[] = ['ca', 'es', 'en'];
const CURRENCIES: Currency[] = ['EUR', 'USD', 'GBP'];
const METHODS: SplitMethod[] = ['equal', 'exact', 'percent', 'shares'];
const CATEGORIES: CategoryId[] = [
  'food',
  'transport',
  'home',
  'fun',
  'shopping',
  'travel',
  'bills',
  'health',
  'other',
];

export const defaultState: AppState = { version: 1, groups: [], lang: 'ca' };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function sanitizeMember(value: unknown): Member | null {
  if (!isRecord(value)) return null;
  const name = asString(value.name).trim();
  if (!name) return null;
  return { id: asString(value.id) || uid(), name: name.slice(0, 60) };
}

function sanitizeExpense(value: unknown, memberIds: Set<string>): Expense | null {
  if (!isRecord(value)) return null;

  const amount = typeof value.amount === 'number' ? value.amount : Number(value.amount);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const paidBy = asString(value.paidBy);
  if (!memberIds.has(paidBy)) return null;

  const participants = Array.isArray(value.participants)
    ? value.participants.filter(
        (id): id is string => typeof id === 'string' && memberIds.has(id),
      )
    : [];
  if (participants.length === 0) return null;

  const splitMethod = METHODS.includes(value.splitMethod as SplitMethod)
    ? (value.splitMethod as SplitMethod)
    : 'equal';

  const weights: Record<string, number> = {};
  if (isRecord(value.weights)) {
    for (const id of participants) {
      const weight = Number(value.weights[id]);
      if (Number.isFinite(weight) && weight >= 0) weights[id] = weight;
    }
  }

  const date = /^\d{4}-\d{2}-\d{2}$/.test(asString(value.date))
    ? asString(value.date)
    : todayISO();

  const category = CATEGORIES.includes(value.category as CategoryId)
    ? (value.category as CategoryId)
    : 'other';

  return {
    id: asString(value.id) || uid(),
    concept: asString(value.concept, '—').trim().slice(0, 120) || '—',
    amount: Math.round(amount * 100) / 100,
    paidBy,
    date,
    category,
    splitMethod,
    participants,
    weights: splitMethod === 'equal' ? undefined : weights,
    settlement: value.settlement === true,
    createdAt: asString(value.createdAt) || new Date().toISOString(),
  };
}

export function sanitizeGroup(value: unknown): Group | null {
  if (!isRecord(value)) return null;

  const members = Array.isArray(value.members)
    ? value.members
        .map(sanitizeMember)
        .filter((member): member is Member => member !== null)
        .slice(0, 60)
    : [];

  if (members.length === 0) return null;

  // Keep ids unique even if a malformed payload repeats them.
  const seen = new Set<string>();
  const uniqueMembers = members.map((member) => {
    if (!seen.has(member.id)) {
      seen.add(member.id);
      return member;
    }
    return { ...member, id: uid() };
  });
  const memberIds = new Set(uniqueMembers.map((member) => member.id));

  const name = asString(value.name).trim().slice(0, 80) || 'Grup';
  const currency = CURRENCIES.includes(value.currency as Currency)
    ? (value.currency as Currency)
    : 'EUR';

  const expenses = Array.isArray(value.expenses)
    ? value.expenses
        .map((expense) => sanitizeExpense(expense, memberIds))
        .filter((expense): expense is Expense => expense !== null)
    : [];

  const currentMemberId = memberIds.has(asString(value.currentMemberId))
    ? asString(value.currentMemberId)
    : null;

  return {
    id: asString(value.id) || uid(),
    name,
    currency,
    members: uniqueMembers,
    expenses,
    createdAt: asString(value.createdAt) || new Date().toISOString(),
    updatedAt: asString(value.updatedAt) || new Date().toISOString(),
    currentMemberId,
  };
}

export function sanitizeState(value: unknown): AppState {
  if (!isRecord(value)) return defaultState;

  const groups = Array.isArray(value.groups)
    ? value.groups
        .map(sanitizeGroup)
        .filter((group): group is Group => group !== null)
    : [];

  const lang = LANGS.includes(value.lang as Lang) ? (value.lang as Lang) : 'ca';

  return { version: 1, groups, lang };
}

export function loadState(): AppState {
  if (typeof window === 'undefined') return defaultState;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    return sanitizeState(JSON.parse(raw));
  } catch {
    return defaultState;
  }
}

export function saveState(state: AppState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage can be unavailable (private mode / quota). The app still works in memory.
  }
}
