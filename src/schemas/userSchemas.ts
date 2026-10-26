import { z } from 'zod';
import { boolean } from './common';

export const permissionsSchema = z.object({
  canUpdateQuantity: boolean('canUpdateQuantity').optional(),
  canAddToShoppingList: boolean('canAddToShoppingList').optional(),
  canMarkPurchased: boolean('canMarkPurchased').optional(),
});

export type PermissionsBody = z.infer<typeof permissionsSchema>;
