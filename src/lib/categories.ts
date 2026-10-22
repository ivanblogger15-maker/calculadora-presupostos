import type { CategoryId } from '../types';
import type { MessageKey } from '../i18n/messages';

export interface Category {
  id: CategoryId;
  emoji: string;
  labelKey: MessageKey;
}

export const CATEGORIES: Category[] = [
  { id: 'food', emoji: '🍔', labelKey: 'catFood' },
  { id: 'transport', emoji: '🚕', labelKey: 'catTransport' },
  { id: 'home', emoji: '🏠', labelKey: 'catHome' },
  { id: 'fun', emoji: '🎉', labelKey: 'catFun' },
  { id: 'shopping', emoji: '🛒', labelKey: 'catShopping' },
  { id: 'travel', emoji: '✈️', labelKey: 'catTravel' },
  { id: 'bills', emoji: '🧾', labelKey: 'catBills' },
  { id: 'health', emoji: '💊', labelKey: 'catHealth' },
  { id: 'other', emoji: '📦', labelKey: 'catOther' },
];

const CATEGORY_MAP = new Map(CATEGORIES.map((category) => [category.id, category]));

export function categoryEmoji(id: CategoryId): string {
  return CATEGORY_MAP.get(id)?.emoji ?? '📦';
}

export function categoryLabelKey(id: CategoryId): MessageKey {
  return CATEGORY_MAP.get(id)?.labelKey ?? 'catOther';
}
