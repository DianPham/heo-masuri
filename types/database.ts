export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      angry_buzzes: {
        Row: {
          context_note: string | null
          created_at: string | null
          dan_replied_at: string | null
          dan_reply: string | null
          from_user: string
          id: string
          need_type: string
          resolved_at: string | null
        }
        Insert: {
          context_note?: string | null
          created_at?: string | null
          dan_replied_at?: string | null
          dan_reply?: string | null
          from_user: string
          id?: string
          need_type: string
          resolved_at?: string | null
        }
        Update: {
          context_note?: string | null
          created_at?: string | null
          dan_replied_at?: string | null
          dan_reply?: string | null
          from_user?: string
          id?: string
          need_type?: string
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "angry_buzzes_from_user_fkey"
            columns: ["from_user"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ask_masuri_threads: {
        Row: {
          context_source: Json | null
          context_word: string | null
          created_at: string | null
          from_user: string
          id: string
          question_note: string | null
          replied_at: string | null
          reply_audio_url: string | null
          reply_text: string | null
          seen_at: string | null
          to_user: string
        }
        Insert: {
          context_source?: Json | null
          context_word?: string | null
          created_at?: string | null
          from_user: string
          id?: string
          question_note?: string | null
          replied_at?: string | null
          reply_audio_url?: string | null
          reply_text?: string | null
          seen_at?: string | null
          to_user: string
        }
        Update: {
          context_source?: Json | null
          context_word?: string | null
          created_at?: string | null
          from_user?: string
          id?: string
          question_note?: string | null
          replied_at?: string | null
          reply_audio_url?: string | null
          reply_text?: string | null
          seen_at?: string | null
          to_user?: string
        }
        Relationships: [
          {
            foreignKeyName: "ask_masuri_threads_from_user_fkey"
            columns: ["from_user"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ask_masuri_threads_to_user_fkey"
            columns: ["to_user"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          created_at: string | null
          emoji: string | null
          end_at: string
          id: string
          note: string | null
          owner: string
          share_details: boolean
          source: string
          source_ref: string | null
          start_at: string
          title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          emoji?: string | null
          end_at: string
          id?: string
          note?: string | null
          owner: string
          share_details?: boolean
          source?: string
          source_ref?: string | null
          start_at: string
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          emoji?: string | null
          end_at?: string
          id?: string
          note?: string | null
          owner?: string
          share_details?: boolean
          source?: string
          source_ref?: string | null
          start_at?: string
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_owner_fkey"
            columns: ["owner"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_pages: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          cards: Json
          completed_at: string | null
          created_at: string | null
          difficulty: number
          for_user: string
          generated_by: string
          generation_meta: Json | null
          id: string
          published_at: string | null
          scheduled_for: string
          status: string
          title_en: string
          title_vi: string
          topic: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          cards?: Json
          completed_at?: string | null
          created_at?: string | null
          difficulty: number
          for_user: string
          generated_by?: string
          generation_meta?: Json | null
          id?: string
          published_at?: string | null
          scheduled_for: string
          status?: string
          title_en: string
          title_vi: string
          topic: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          cards?: Json
          completed_at?: string | null
          created_at?: string | null
          difficulty?: number
          for_user?: string
          generated_by?: string
          generation_meta?: Json | null
          id?: string
          published_at?: string | null
          scheduled_for?: string
          status?: string
          title_en?: string
          title_vi?: string
          topic?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_pages_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_pages_for_user_fkey"
            columns: ["for_user"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      letter_prompts: {
        Row: {
          active: boolean
          created_at: string | null
          difficulty: number
          id: string
          prompt_en: string
          prompt_vi: string
          starter_words: Json | null
        }
        Insert: {
          active?: boolean
          created_at?: string | null
          difficulty?: number
          id?: string
          prompt_en: string
          prompt_vi: string
          starter_words?: Json | null
        }
        Update: {
          active?: boolean
          created_at?: string | null
          difficulty?: number
          id?: string
          prompt_en?: string
          prompt_vi?: string
          starter_words?: Json | null
        }
        Relationships: []
      }
      letters: {
        Row: {
          attachments: Json | null
          body: string
          created_at: string | null
          delivered_at: string | null
          from_user: string
          id: string
          in_reply_to: string | null
          kind: string
          language: string
          prompt_id: string | null
          scheduled_for: string | null
          seen_at: string | null
          to_user: string
        }
        Insert: {
          attachments?: Json | null
          body: string
          created_at?: string | null
          delivered_at?: string | null
          from_user: string
          id?: string
          in_reply_to?: string | null
          kind: string
          language?: string
          prompt_id?: string | null
          scheduled_for?: string | null
          seen_at?: string | null
          to_user: string
        }
        Update: {
          attachments?: Json | null
          body?: string
          created_at?: string | null
          delivered_at?: string | null
          from_user?: string
          id?: string
          in_reply_to?: string | null
          kind?: string
          language?: string
          prompt_id?: string | null
          scheduled_for?: string | null
          seen_at?: string | null
          to_user?: string
        }
        Relationships: [
          {
            foreignKeyName: "letters_from_user_fkey"
            columns: ["from_user"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "letters_in_reply_to_fkey"
            columns: ["in_reply_to"]
            isOneToOne: false
            referencedRelation: "letters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "letters_to_user_fkey"
            columns: ["to_user"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      missing_signals: {
        Row: {
          acknowledged_at: string | null
          created_at: string | null
          from_user: string
          id: string
          intensity: number
        }
        Insert: {
          acknowledged_at?: string | null
          created_at?: string | null
          from_user: string
          id?: string
          intensity: number
        }
        Update: {
          acknowledged_at?: string | null
          created_at?: string | null
          from_user?: string
          id?: string
          intensity?: number
        }
        Relationships: [
          {
            foreignKeyName: "missing_signals_from_user_fkey"
            columns: ["from_user"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notebook_prefs: {
        Row: {
          ask_masuri_enabled: boolean
          daily_reminder_enabled: boolean
          daily_reminder_time: string
          letter_reply_enabled: boolean
          preferred_topics: string[]
          tts_rate: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ask_masuri_enabled?: boolean
          daily_reminder_enabled?: boolean
          daily_reminder_time?: string
          letter_reply_enabled?: boolean
          preferred_topics?: string[]
          tts_rate?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ask_masuri_enabled?: boolean
          daily_reminder_enabled?: boolean
          daily_reminder_time?: string
          letter_reply_enabled?: boolean
          preferred_topics?: string[]
          tts_rate?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notebook_prefs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_prefs: {
        Row: {
          angry_enabled: boolean | null
          date_planning_enabled: boolean
          gmgn_enabled: boolean
          hug_kiss_enabled: boolean | null
          important_date_enabled: boolean
          missing_enabled: boolean | null
          outfit_enabled: boolean
          quiet_end: string | null
          quiet_start: string | null
          surprise_enabled: boolean
          thinking_enabled: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          angry_enabled?: boolean | null
          date_planning_enabled?: boolean
          gmgn_enabled?: boolean
          hug_kiss_enabled?: boolean | null
          important_date_enabled?: boolean
          missing_enabled?: boolean | null
          outfit_enabled?: boolean
          quiet_end?: string | null
          quiet_start?: string | null
          surprise_enabled?: boolean
          thinking_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          angry_enabled?: boolean | null
          date_planning_enabled?: boolean
          gmgn_enabled?: boolean
          hug_kiss_enabled?: boolean | null
          important_date_enabled?: boolean
          missing_enabled?: boolean | null
          outfit_enabled?: boolean
          quiet_end?: string | null
          quiet_start?: string | null
          surprise_enabled?: boolean
          thinking_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_prefs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_letters: {
        Row: {
          created_at: string | null
          enabled: boolean
          from_user: string
          id: string
          kind: string
          last_delivered_at: string | null
          last_pool_index: number
          pool: Json
          send_at_local: string
          timezone: string
          to_user: string
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean
          from_user: string
          id?: string
          kind: string
          last_delivered_at?: string | null
          last_pool_index?: number
          pool: Json
          send_at_local: string
          timezone?: string
          to_user: string
        }
        Update: {
          created_at?: string | null
          enabled?: boolean
          from_user?: string
          id?: string
          kind?: string
          last_delivered_at?: string | null
          last_pool_index?: number
          pool?: Json
          send_at_local?: string
          timezone?: string
          to_user?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_letters_from_user_fkey"
            columns: ["from_user"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_letters_to_user_fkey"
            columns: ["to_user"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_schedule_template: {
        Row: {
          enabled: boolean
          template: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          enabled?: boolean
          template?: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          enabled?: boolean
          template?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_schedule_template_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reunion_dates: {
        Row: {
          created_at: string | null
          id: string
          is_current: boolean
          label: string
          label_en: string | null
          target_date: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_current?: boolean
          label: string
          label_en?: string | null
          target_date: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_current?: boolean
          label?: string
          label_en?: string | null
          target_date?: string
        }
        Relationships: []
      }
      streaks: {
        Row: {
          current_streak: number
          last_active_date: string | null
          longest_streak: number
          rest_days_remaining: number
          rest_days_used_at: string[]
          rest_replenished_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          current_streak?: number
          last_active_date?: string | null
          longest_streak?: number
          rest_days_remaining?: number
          rest_days_used_at?: string[]
          rest_replenished_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          current_streak?: number
          last_active_date?: string | null
          longest_streak?: number
          rest_days_remaining?: number
          rest_days_used_at?: string[]
          rest_replenished_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "streaks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      surprise_deliveries: {
        Row: {
          delivered_at: string
          id: string
          letter_id: string
          pool_id: string
          shuffle_round: number
        }
        Insert: {
          delivered_at?: string
          id?: string
          letter_id: string
          pool_id: string
          shuffle_round: number
        }
        Update: {
          delivered_at?: string
          id?: string
          letter_id?: string
          pool_id?: string
          shuffle_round?: number
        }
        Relationships: [
          {
            foreignKeyName: "surprise_deliveries_letter_id_fkey"
            columns: ["letter_id"]
            isOneToOne: false
            referencedRelation: "letters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surprise_deliveries_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "surprise_pool"
            referencedColumns: ["id"]
          },
        ]
      }
      surprise_pool: {
        Row: {
          attachments: Json | null
          author: string
          body: string
          created_at: string | null
          id: string
          language: string
          retired_at: string | null
          weight: number
        }
        Insert: {
          attachments?: Json | null
          author: string
          body: string
          created_at?: string | null
          id?: string
          language?: string
          retired_at?: string | null
          weight?: number
        }
        Update: {
          attachments?: Json | null
          author?: string
          body?: string
          created_at?: string | null
          id?: string
          language?: string
          retired_at?: string | null
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "surprise_pool_author_fkey"
            columns: ["author"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      thinking_pings: {
        Row: {
          created_at: string | null
          from_user: string
          id: string
          kind: string
          seen_at: string | null
          to_user: string
        }
        Insert: {
          created_at?: string | null
          from_user: string
          id?: string
          kind: string
          seen_at?: string | null
          to_user: string
        }
        Update: {
          created_at?: string | null
          from_user?: string
          id?: string
          kind?: string
          seen_at?: string | null
          to_user?: string
        }
        Relationships: [
          {
            foreignKeyName: "thinking_pings_from_user_fkey"
            columns: ["from_user"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thinking_pings_to_user_fkey"
            columns: ["to_user"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          display_name: string
          full_name: string
          id: string
          pronoun: string
          slug: string
          timezone: string
        }
        Insert: {
          created_at?: string | null
          display_name: string
          full_name: string
          id?: string
          pronoun: string
          slug: string
          timezone?: string
        }
        Update: {
          created_at?: string | null
          display_name?: string
          full_name?: string
          id?: string
          pronoun?: string
          slug?: string
          timezone?: string
        }
        Relationships: []
      }
      vocabulary: {
        Row: {
          example_en: string | null
          example_vi: string | null
          id: string
          last_reviewed_at: string | null
          pos: string | null
          review_count: number
          saved_at: string | null
          self_confidence: number
          source_kind: string
          source_page_id: string | null
          user_id: string
          word_en: string
          word_vi: string
        }
        Insert: {
          example_en?: string | null
          example_vi?: string | null
          id?: string
          last_reviewed_at?: string | null
          pos?: string | null
          review_count?: number
          saved_at?: string | null
          self_confidence?: number
          source_kind?: string
          source_page_id?: string | null
          user_id: string
          word_en: string
          word_vi: string
        }
        Update: {
          example_en?: string | null
          example_vi?: string | null
          id?: string
          last_reviewed_at?: string | null
          pos?: string | null
          review_count?: number
          saved_at?: string | null
          self_confidence?: number
          source_kind?: string
          source_page_id?: string | null
          user_id?: string
          word_en?: string
          word_vi?: string
        }
        Relationships: [
          {
            foreignKeyName: "vocabulary_source_page_id_fkey"
            columns: ["source_page_id"]
            isOneToOne: false
            referencedRelation: "daily_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vocabulary_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
