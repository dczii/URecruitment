import { z } from "zod";
export const emailSchema = z.string().trim().toLowerCase().pipe(z.email()).pipe(z.string().max(254));
export const codeSchema = z.string().regex(/^[0-9]{6}$/, "Enter the six-digit code.");
