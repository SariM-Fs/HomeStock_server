import { z } from 'zod';

export const requiredString = (label: string) =>
  z.string({ required_error: `${label} הוא שדה חובה`, invalid_type_error: `${label} חייב להיות טקסט` }).trim();

export const number = (label: string) =>
  z
    .number({ required_error: `${label} הוא שדה חובה`, invalid_type_error: `${label} חייב להיות מספר` })
    .finite(`${label} חייב להיות מספר`);

export const boolean = (label: string) =>
  z.boolean({ invalid_type_error: `${label} חייב להיות true או false` });

export const idParamSchema = z.object({
  id: z.coerce
    .number({ invalid_type_error: 'מזהה לא תקין' })
    .int('מזהה לא תקין')
    .positive('מזהה לא תקין'),
});

/** Enum with a "required" message when missing and an "invalid" message otherwise. */
export const enumField = <T extends readonly [string, ...string[]]>(values: T, requiredMessage: string, invalidMessage: string) =>
  z.enum(values, {
    errorMap: (issue, ctx) => ({
      message: issue.code === 'invalid_type' && ctx.data === undefined ? requiredMessage : invalidMessage,
    }),
  });
