export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      themes: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string;
          updated_at?: string;
        };
      };
      memos: {
        Row: {
          id: string;
          theme_id: string;
          user_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          theme_id: string;
          user_id: string;
          content: string;
          created_at?: string;
        };
        Update: {
          content?: string;
        };
      };
      interviews: {
        Row: {
          id: string;
          theme_id: string;
          user_id: string;
          target_length: number;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          theme_id: string;
          user_id: string;
          target_length?: number;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          target_length?: number;
          status?: string;
          updated_at?: string;
        };
      };
      interview_messages: {
        Row: {
          id: string;
          interview_id: string;
          user_id: string;
          role: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          interview_id: string;
          user_id: string;
          role: string;
          content: string;
          created_at?: string;
        };
        Update: {
          content?: string;
        };
      };
      articles: {
        Row: {
          id: string;
          theme_id: string;
          interview_id: string | null;
          user_id: string;
          title: string;
          content: string;
          word_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          theme_id: string;
          interview_id?: string | null;
          user_id: string;
          title: string;
          content: string;
          word_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          content?: string;
          word_count?: number;
          updated_at?: string;
        };
      };
      improvement_requests: {
        Row: {
          id: string;
          user_id: string | null;
          title: string;
          description: string;
          is_official: boolean;
          likes_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          title: string;
          description?: string;
          is_official?: boolean;
          likes_count?: number;
          created_at?: string;
        };
        Update: {
          title?: string;
          description?: string;
          is_official?: boolean;
          likes_count?: number;
        };
      };
      improvement_likes: {
        Row: {
          id: string;
          request_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          request_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          request_id?: string;
          user_id?: string;
        };
      };
      improvement_history: {
        Row: {
          id: string;
          title: string;
          description: string;
          date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string;
          date: string;
          created_at?: string;
        };
        Update: {
          title?: string;
          description?: string;
          date?: string;
        };
      };
      style_references: {
        Row: {
          id: string;
          user_id: string;
          label: string;
          source_text: string;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          label: string;
          source_text: string;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          label?: string;
          source_text?: string;
          is_default?: boolean;
          updated_at?: string;
        };
      };
    };
    Views: {
      [key: string]: {
        Row: Record<string, unknown>;
      };
    };
    Functions: {
      [key: string]: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
    };
    Enums: {
      [key: string]: string;
    };
  };
}
