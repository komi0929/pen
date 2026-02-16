export type ActionResult<T = null> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string; code?: string };

// ============================================================
// Table Row Types
// ============================================================

export interface Theme {
  id: string;
  user_id: string;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
  memo_count?: number;
  article_count?: number;
  latest_memo_at?: string | null;
  latest_article_at?: string | null;
}

export interface Memo {
  id: string;
  theme_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface Interview {
  id: string;
  theme_id: string;
  user_id: string;
  target_length: number;
  status: "active" | "completed" | "cancelled";
  created_at: string;
  updated_at: string;
}

export interface InterviewMessage {
  id: string;
  interview_id: string;
  user_id: string;
  role: "assistant" | "user";
  content: string;
  created_at: string;
}

export interface Article {
  id: string;
  theme_id: string;
  interview_id: string | null;
  user_id: string;
  title: string;
  content: string;
  word_count: number;
  created_at: string;
  updated_at: string;
  theme_title?: string;
}
