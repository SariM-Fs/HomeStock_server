import { z } from 'zod';
import { requiredString } from './common';

export const loginSchema = z.object({
  username: requiredString('שם המשתמש').min(1, 'שם המשתמש הוא שדה חובה'),
  password: z.string({ required_error: 'הסיסמה היא שדה חובה' }).min(1, 'הסיסמה היא שדה חובה'),
});

const FAMILY_CHOICE_MESSAGE = 'יש למלא שם משפחה חדשה או קוד משפחה (אחד מהם בלבד)';

/**
 * Registration either creates a new family (familyName → the user becomes its Admin)
 * or joins an existing one (familyCode → the user joins as a regular member).
 * Exactly one of the two must be sent.
 */
export const registerSchema = z
  .object({
    username: requiredString('שם המשתמש')
      .min(3, 'שם המשתמש חייב להכיל 3 עד 20 תווים')
      .max(20, 'שם המשתמש חייב להכיל 3 עד 20 תווים'),
    password: z
      .string({ required_error: 'הסיסמה היא שדה חובה', invalid_type_error: 'הסיסמה חייבת להיות טקסט' })
      .min(6, 'הסיסמה חייבת להכיל 6 תווים לפחות'),
    displayName: requiredString('שם התצוגה')
      .min(1, 'שם התצוגה הוא שדה חובה')
      .max(30, 'שם התצוגה יכול להכיל עד 30 תווים'),
    familyName: requiredString('שם המשפחה')
      .max(40, 'שם המשפחה יכול להכיל עד 40 תווים')
      .optional()
      .transform((v) => v || undefined), // "" counts as not sent
    familyCode: requiredString('קוד המשפחה')
      .toUpperCase()
      .optional()
      .transform((v) => v || undefined),
  })
  .superRefine((body, ctx) => {
    if (Boolean(body.familyName) === Boolean(body.familyCode)) {
      for (const path of ['familyName', 'familyCode']) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: FAMILY_CHOICE_MESSAGE, path: [path] });
      }
    }
  });

export type LoginBody = z.infer<typeof loginSchema>;
export type RegisterBody = z.infer<typeof registerSchema>;
