import type { Expense, Group, Member, Transfer } from '../types';
import { distributeCents, toCents } from './money';

export type CentsMap = Record<string, number>;

/** Returns how much each participant owes for one expense, in cents. */
export function expenseSharesCents(expense: Expense): CentsMap {
  const amountCents = toCents(expense.amount);
  const participants = [...new Set(expense.participants)];

  if (amountCents <= 0 || participants.length === 0) return {};

  let weights: number[];
  switch (expense.splitMethod) {
    case 'exact':
      weights = participants.map((id) => Math.max(0, toCents(expense.weights?.[id] ?? 0)));
      break;
    case 'percent':
    case 'shares':
      weights = participants.map((id) => Math.max(0, expense.weights?.[id] ?? 0));
      break;
    default:
      weights = participants.map(() => 1);
  }

  if (weights.reduce((sum, weight) => sum + weight, 0) <= 0) return {};

  const parts = distributeCents(amountCents, weights);
  return Object.fromEntries(participants.map((id, index) => [id, parts[index]]));
}

export function emptyBalances(members: Member[]): CentsMap {
  return Object.fromEntries(members.map((member) => [member.id, 0]));
}

/** Net balance per member: positive = should receive money, negative = owes money. */
export function computeBalances(group: Group): CentsMap {
  const balances = emptyBalances(group.members);

  for (const expense of group.expenses) {
    if (toCents(expense.amount) <= 0) continue;

    if (expense.paidBy in balances) {
      balances[expense.paidBy] += toCents(expense.amount);
    }

    const shares = expenseSharesCents(expense);
    for (const [memberId, cents] of Object.entries(shares)) {
      if (memberId in balances) {
        balances[memberId] -= cents;
      }
    }
  }

  return balances;
}

/**
 * Greedy debt simplification: repeatedly matches the biggest creditor with the
 * biggest debtor. Produces at most n-1 transfers and every balance ends at 0.
 */
export function settlementsFromBalances(balances: CentsMap): Transfer[] {
  const creditors = Object.entries(balances)
    .filter(([, cents]) => cents > 0)
    .map(([id, cents]) => ({ id, amount: cents }))
    .sort((a, b) => b.amount - a.amount);

  const debtors = Object.entries(balances)
    .filter(([, cents]) => cents < 0)
    .map(([id, cents]) => ({ id, amount: -cents }))
    .sort((a, b) => b.amount - a.amount);

  const transfers: Transfer[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amountCents = Math.min(debtor.amount, creditor.amount);

    if (amountCents > 0) {
      transfers.push({ from: debtor.id, to: creditor.id, amountCents });
    }

    debtor.amount -= amountCents;
    creditor.amount -= amountCents;

    if (debtor.amount === 0) debtorIndex += 1;
    if (creditor.amount === 0) creditorIndex += 1;
  }

  return transfers;
}

export function computeSettlements(group: Group): Transfer[] {
  return settlementsFromBalances(computeBalances(group));
}

export function totalSpentCents(group: Group): number {
  return group.expenses
    .filter((expense) => !expense.settlement)
    .reduce((sum, expense) => sum + toCents(expense.amount), 0);
}

export function memberPaidCents(group: Group, memberId: string): number {
  return group.expenses
    .filter((expense) => !expense.settlement && expense.paidBy === memberId)
    .reduce((sum, expense) => sum + toCents(expense.amount), 0);
}

export function memberShareCents(group: Group, memberId: string): number {
  return group.expenses
    .filter((expense) => !expense.settlement)
    .reduce((sum, expense) => sum + (expenseSharesCents(expense)[memberId] ?? 0), 0);
}

export function memberTotalPaidCents(group: Group, memberId: string): number {
  return group.expenses
    .filter((expense) => expense.paidBy === memberId)
    .reduce((sum, expense) => sum + toCents(expense.amount), 0);
}
