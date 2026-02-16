import { z } from "zod/v4";

// ========================================
// バリデーションスキーマ定義
// ========================================

export const themeSchema = z.object({
  title: z
    .string()
    .min(1, "テーマ名を入力してください")
    .max(100, "テーマ名は100文字以内にしてください"),
  description: z
    .string()
    .max(500, "説明は500文字以内にしてください")
    .optional()
    .default(""),
});

export const memoSchema = z.object({
  themeId: z.uuid("不正なテーマIDです"),
  content: z
    .string()
    .min(1, "メモを入力してください")
    .max(5000, "メモは5000文字以内にしてください"),
});

export const articleSchema = z.object({
  themeId: z.uuid("不正なテーマIDです"),
  interviewId: z.uuid("不正なインタビューIDです").nullable(),
  title: z
    .string()
    .min(1, "タイトルを入力してください")
    .max(200, "タイトルは200文字以内にしてください"),
  content: z
    .string()
    .min(1, "本文を入力してください")
    .max(100000, "本文は100000文字以内にしてください"),
});

export const interviewSchema = z.object({
  themeId: z.uuid("不正なテーマIDです"),
  targetLength: z
    .number()
    .int()
    .min(100, "100文字以上を指定してください")
    .max(50000, "50000文字以下を指定してください"),
});

export const idSchema = z.object({
  id: z.uuid("不正なIDです"),
});

// ========================================
// バリデーション実行ヘルパー
// ========================================

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export function validate<T>(
  schema: z.ZodType<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const firstError = result.error.issues[0];
  return { success: false, error: firstError?.message ?? "入力内容が不正です" };
}
