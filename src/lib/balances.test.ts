import { describe, expect, it } from 'vitest';
import type { Expense, Group, Member } from '../types';
import {
  computeBalances,
  computeSettlements,
  expenseSharesCents,
  totalSpentCents,
} from './balances';
import { distributeCents, parseAmount, splitEqually } from './money';

const ana: Member = { id: 'ana', name: 'Ana' };
const biel: Member = { id: 'biel', name: 'Biel' };
const carla: Member = { id: 'carla', name: 'Carla' };

function expense(overrides: Partial<Expense>): Expense {
  return {
    id: Math.random().toString(36),
    concept: 'Test',
    amount: 10,
    paidBy: ana.id,
    date: '2026-01-01',
    category: 'other',
    splitMethod: 'equal',
    participants: [ana.id, biel.id],
    createdAt: '2026-01-01T10:00:00.000Z',
    ...overrides,
  };
}

function group(expenses: Expense[], members: Member[] = [ana, biel, carla]): Group {
  return {
    id: 'g1',
    name: 'Test group',
    currency: 'EUR',
    members,
    expenses,
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-01T10:00:00.000Z',
    currentMemberId: ana.id,
  };
}

describe('money', () => {
  it('parses comma and dot decimals', () => {
    expect(parseAmount('12,50')).toBe(12.5);
    expect(parseAmount('12.50')).toBe(12.5);
    expect(parseAmount('1.234,56')).toBe(1234.56);
    expect(parseAmount('0')).toBe(0);
    expect(parseAmount('-5')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
  });

  it('splits cents without losing a single cent', () => {
    expect(splitEqually(1000, 3)).toEqual([334, 333, 333]);
    expect(splitEqually(1, 3)).toEqual([1, 0, 0]);
    expect(distributeCents(1000, [1, 1, 1]).reduce((a, b) => a + b, 0)).toBe(1000);
  });
});

describe('expense shares', () => {
  it('splits equally', () => {
    const shares = expenseSharesCents(expense({ amount: 60, participants: ['ana', 'biel', 'carla'] }));
    expect(shares).toEqual({ ana: 2000, biel: 2000, carla: 2000 });
  });

  it('uses exact amounts', () => {
    const shares = expenseSharesCents(
      expense({
        amount: 30,
        splitMethod: 'exact',
        participants: ['ana', 'biel'],
        weights: { ana: 10, biel: 20 },
      }),
    );
    expect(shares).toEqual({ ana: 1000, biel: 2000 });
  });

  it('uses percentages', () => {
    const shares = expenseSharesCents(
      expense({
        amount: 90,
        splitMethod: 'percent',
        participants: ['ana', 'biel', 'carla'],
        weights: { ana: 50, biel: 25, carla: 25 },
      }),
    );
    expect(shares).toEqual({ ana: 4500, biel: 2250, carla: 2250 });
  });

  it('uses shares/parts', () => {
    const shares = expenseSharesCents(
      expense({
        amount: 60,
        splitMethod: 'shares',
        participants: ['ana', 'biel', 'carla'],
        weights: { ana: 1, biel: 1, carla: 2 },
      }),
    );
    expect(shares).toEqual({ ana: 1500, biel: 1500, carla: 3000 });
  });
});

describe('balances and settlements', () => {
  it('keeps the sum of balances at zero', () => {
    const balances = computeBalances(
      group([
        expense({ amount: 60, paidBy: 'ana', participants: ['ana', 'biel', 'carla'] }),
        expense({ amount: 33.33, paidBy: 'biel', participants: ['ana', 'biel'] }),
      ]),
    );
    expect(Object.values(balances).reduce((a, b) => a + b, 0)).toBe(0);
    expect(balances).toEqual({ ana: 2333, biel: -333, carla: -2000 });
  });

  it('simplifies chains (A owes B, B owes C -> A pays C)', () => {
    const g = group([
      expense({ amount: 10, paidBy: 'biel', participants: ['ana'] }),
      expense({ amount: 10, paidBy: 'carla', participants: ['biel'] }),
    ]);

    expect(computeBalances(g)).toEqual({ ana: -1000, biel: 0, carla: 1000 });
    expect(computeSettlements(g)).toEqual([{ from: 'ana', to: 'carla', amountCents: 1000 }]);
  });

  it('settles multiple creditors and debtors', () => {
    const g = group([
      expense({ amount: 90, paidBy: 'ana', participants: ['ana', 'biel', 'carla'] }),
      expense({ amount: 30, paidBy: 'biel', participants: ['ana', 'biel', 'carla'] }),
    ]);

    const settlements = computeSettlements(g);
    const balances = computeBalances(g);

    expect(settlements.length).toBeLessThanOrEqual(2);
    for (const transfer of settlements) {
      balances[transfer.from] += transfer.amountCents;
      balances[transfer.to] -= transfer.amountCents;
    }
    expect(Object.values(balances).every((value) => value === 0)).toBe(true);
  });

  it('records a settlement as a payment that clears the debt', () => {
    const g = group([expense({ amount: 20, paidBy: ana.id, participants: [biel.id] })]);
    expect(computeSettlements(g)).toEqual([{ from: 'biel', to: 'ana', amountCents: 2000 }]);

    g.expenses.push(
      expense({
        amount: 20,
        paidBy: biel.id,
        participants: [ana.id],
        concept: 'Settlement',
        settlement: true,
      }),
    );

    expect(computeSettlements(g)).toEqual([]);
    expect(totalSpentCents(g)).toBe(2000);
  });

  it('ignores settlements in the total spent', () => {
    const g = group([
      expense({ amount: 100, paidBy: 'ana', participants: ['ana', 'biel'] }),
      expense({ amount: 50, paidBy: 'biel', participants: ['ana'], settlement: true }),
    ]);
    expect(totalSpentCents(g)).toBe(10000);
  });
});
