import { z } from 'zod';
import { boolean, number } from './common';

const itemQuantity = number('הכמות').min(1, 'הכמות לקנייה חייבת להיות 1 ומעלה');

export const addItemSchema = z.object({
  productId: number('המוצר').int('מוצר לא תקין').positive('מוצר לא תקין'),
  quantity: itemQuantity,
});

export const updateItemSchema = z
  .object({
    quantity: itemQuantity.optional(),
    purchased: boolean('purchased').optional(),
  })
  .refine((body) => body.quantity !== undefined || body.purchased !== undefined, {
    message: 'יש לשלוח quantity או purchased',
  });

export const shoppingQuerySchema = z.object({
  purchased: z
    .enum(['true', 'false', 'all'], { errorMap: () => ({ message: 'purchased חייב להיות true, false או all' }) })
    .default('false'),
});

export type AddItemBody = z.infer<typeof addItemSchema>;
export type UpdateItemBody = z.infer<typeof updateItemSchema>;
export type ShoppingQueryParams = z.infer<typeof shoppingQuerySchema>;
