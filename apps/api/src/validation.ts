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
  sessionToken: z.string().trim().min(1).optional(),
  recipientEmail: z.string().trim().email().optional(),
});

export const sendOtpSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
});

export const verifyOtpSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  otp: z.string().trim().regex(/^\d{6}$/, 'OTP must be exactly 6 digits'),
  otpToken: z.string().trim().min(1, 'OTP token is required'),
});

export type RoundQuery = z.infer<typeof roundQuerySchema>;
export type VerifyBody = z.infer<typeof verifyBodySchema>;
export type ScoreBody = z.infer<typeof scoreBodySchema>;
export type SendOtpBody = z.infer<typeof sendOtpSchema>;
export type VerifyOtpBody = z.infer<typeof verifyOtpSchema>;
