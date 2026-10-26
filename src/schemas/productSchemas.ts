import { z } from 'zod';
import { CATEGORIES, STATUSES, UNITS } from '../constants';
import { enumField, number, requiredString } from './common';

const category = enumField(CATEGORIES, 'הקטגוריה היא שדה חובה', 'קטגוריה לא תקינה');
const unit = enumField(UNITS, 'יחידת המידה היא שדה חובה', 'יחידת מידה לא תקינה');

export const productSchema = z.object({
  name: requiredString('שם המוצר')
    .min(1, 'שם המוצר הוא שדה חובה')
    .max(50, 'שם המוצר יכול להכיל עד 50 תווים'),
  category,
  quantity: number('הכמות').min(0, 'הכמות חייבת להיות 0 ומעלה'),
  minimumQuantity: number('כמות המינימום').min(0, 'כמות המינימום חייבת להיות 0 ומעלה'),
  unit,
});

export const quantitySchema = z.object({
  quantity: number('הכמות').min(0, 'הכמות חייבת להיות 0 ומעלה'),
});

export const productQuerySchema = z.object({
  search: z.string().trim().optional(),
  category: z.enum(CATEGORIES, { errorMap: () => ({ message: 'קטגוריה לא תקינה' }) }).optional(),
  status: z.enum(STATUSES, { errorMap: () => ({ message: 'סטטוס לא תקין' }) }).optional(),
  sortBy: z.enum(['name', 'quantity'], { errorMap: () => ({ message: 'מיון לפי name או quantity בלבד' }) }).optional(),
  order: z.enum(['asc', 'desc'], { errorMap: () => ({ message: 'סדר מיון asc או desc בלבד' }) }).optional(),
});

export type ProductBody = z.infer<typeof productSchema>;
export type QuantityBody = z.infer<typeof quantitySchema>;
export type ProductQueryParams = z.infer<typeof productQuerySchema>;
