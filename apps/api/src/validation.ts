import { z } from 'zod';

export const roundQuerySchema = z.object({
  level: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().min(1, 'Level must be >= 1').max(100, 'Level must be <= 100')),
});

export const verifyBodySchema = z.object({
  token: z.string().min(1, 'Token is required'),
  answer: z
    .array(z.number().int().min(0).max(3))
    .min(1, 'Answer must contain at least 1 element')
    .max(105, 'Answer exceeds maximum allowed length'),
});

export const scoreBodySchema = z.object({
  score: z.number().int().min(0, 'Score must be non-negative'),
  level: z.number().int().min(1, 'Level must be >= 1'),
  playerName: z.string().trim().max(50).optional(),
});

export type RoundQuery = z.infer<typeof roundQuerySchema>;
export type VerifyBody = z.infer<typeof verifyBodySchema>;
export type ScoreBody = z.infer<typeof scoreBodySchema>;
