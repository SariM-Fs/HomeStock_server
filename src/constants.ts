// Single source of truth for the selectable lists. Change them here only.

export const CATEGORIES = [
  'מוצרי חלב',
  'ירקות ופירות',
  'מזון יבש',
  'שתייה',
  'ניקיון',
  'אחר',
] as const;

export const UNITS = ['יחידות', 'ליטר', 'ק״ג', 'גרם', 'חבילות'] as const;

// Computed on the server and sent as-is; the client displays it directly.
export const STATUSES = ['תקין', 'נמוך', 'חסר'] as const;

export const ROLES = ['Admin', 'User'] as const;

export const PERMISSIONS = ['canUpdateQuantity', 'canAddToShoppingList', 'canMarkPurchased'] as const;
