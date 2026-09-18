/**
 * Generated database types. Do not hand-edit.
 *
 * Regenerate with `npm run db:types` (needs the local Supabase stack) and
 * commit the result. CI fails when this file drifts from the schema
 * (`npm run db:types:check`).
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      clients: {
        Row: {
          id: string
          name: string
          guarantee_period_days: number
          stage_limit_overrides: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          guarantee_period_days?: number
          stage_limit_overrides?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          guarantee_period_days?: number
          stage_limit_overrides?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      jobs: {
        Row: {
          id: string
          client_id: string
          owner_name: string
          status: string
          current_version_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          owner_name: string
          status?: string
          current_version_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          owner_name?: string
          status?: string
          current_version_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      job_versions: {
        Row: {
          id: string
          job_id: string
          fields: Json
          must_haves: Json
          nice_to_haves: Json
          requires_nationality: boolean
          nationality_reason: string | null
          requires_language: boolean
          language_reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          job_id: string
          fields: Json
          must_haves?: Json
          nice_to_haves?: Json
          requires_nationality?: boolean
          nationality_reason?: string | null
          requires_language?: boolean
          language_reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          fields?: Json
          must_haves?: Json
          nice_to_haves?: Json
          requires_nationality?: boolean
          nationality_reason?: string | null
          requires_language?: boolean
          language_reason?: string | null
          created_at?: string
        }
      }
      gap_flags: {
        Row: {
          id: string
          job_version_id: string
          flag_type: string
          reason: string
          suggested_question: string | null
          resolution_state: string
          resolution_note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          job_version_id: string
          flag_type: string
          reason: string
          suggested_question?: string | null
          resolution_state?: string
          resolution_note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          job_version_id?: string
          flag_type?: string
          reason?: string
          suggested_question?: string | null
          resolution_state?: string
          resolution_note?: string | null
          created_at?: string
        }
      }
      candidates: {
        Row: {
          id: string
          full_name: string
          email: string | null
          phone: string | null
          consent_status: string | null
          consent_date: string | null
          consent_method: string | null
          last_activity_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          full_name: string
          email?: string | null
          phone?: string | null
          consent_status?: string | null
          consent_date?: string | null
          consent_method?: string | null
          last_activity_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          email?: string | null
          phone?: string | null
          consent_status?: string | null
          consent_date?: string | null
          consent_method?: string | null
          last_activity_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      cv_files: {
        Row: {
          id: string
          candidate_id: string | null
          source: string
          source_ref: string | null
          source_hash: string | null
          storage_path: string
          doc_kind: string
          language: string | null
          parse_status: string
          parse_error: string | null
          created_at: string
        }
        Insert: {
          id?: string
          candidate_id?: string | null
          source?: string
          source_ref?: string | null
          source_hash?: string | null
          storage_path: string
          doc_kind: string
          language?: string | null
          parse_status?: string
          parse_error?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          candidate_id?: string | null
          source?: string
          source_ref?: string | null
          source_hash?: string | null
          storage_path?: string
          doc_kind?: string
          language?: string | null
          parse_status?: string
          parse_error?: string | null
          created_at?: string
        }
      }
      candidate_profiles: {
        Row: {
          id: string
          candidate_id: string
          cv_file_id: string | null
          parsed: Json
          overrides: Json
          overridden_by: string | null
          overridden_at: string | null
          ai_run_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          candidate_id: string
          cv_file_id?: string | null
          parsed?: Json
          overrides?: Json
          overridden_by?: string | null
          overridden_at?: string | null
          ai_run_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          candidate_id?: string
          cv_file_id?: string | null
          parsed?: Json
          overrides?: Json
          overridden_by?: string | null
          overridden_at?: string | null
          ai_run_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      candidate_skills: {
        Row: {
          id: string
          candidate_id: string
          skill: string
          source_text: string
          ai_run_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          candidate_id: string
          skill: string
          source_text: string
          ai_run_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          candidate_id?: string
          skill?: string
          source_text?: string
          ai_run_id?: string | null
          created_at?: string
        }
      }
      embeddings: {
        Row: {
          id: string
          owner_type: string
          owner_id: string
          // Placeholder string until ADR-0003 fixes the vector dimension; regenerate with `npm run db:types`.
          embedding: string
          embedding_model: string
          ai_run_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          owner_type: string
          owner_id: string
          embedding?: string
          embedding_model: string
          ai_run_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          owner_type?: string
          owner_id?: string
          embedding?: string
          embedding_model?: string
          ai_run_id?: string | null
          created_at?: string
        }
      }
      match_scores: {
        Row: {
          id: string
          candidate_id: string
          job_version_id: string
          model_version: string
          score: number
          raw_score: number | null
          matched: Json
          missing: Json
          uncertain: Json
          ai_run_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          candidate_id: string
          job_version_id: string
          model_version: string
          score: number
          raw_score?: number | null
          matched?: Json
          missing?: Json
          uncertain?: Json
          ai_run_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          candidate_id?: string
          job_version_id?: string
          model_version?: string
          score?: number
          raw_score?: number | null
          matched?: Json
          missing?: Json
          uncertain?: Json
          ai_run_id?: string | null
          created_at?: string
        }
      }
      pipeline_entries: {
        Row: {
          id: string
          candidate_id: string
          job_id: string
          stage: string
          entered_at: string
          owner_name: string
          created_at: string
        }
        Insert: {
          id?: string
          candidate_id: string
          job_id: string
          stage: string
          entered_at?: string
          owner_name: string
          created_at?: string
        }
        Update: {
          id?: string
          candidate_id?: string
          job_id?: string
          stage?: string
          entered_at?: string
          owner_name?: string
          created_at?: string
        }
      }
      stage_events: {
        Row: {
          id: string
          pipeline_entry_id: string
          from_stage: string | null
          to_stage: string
          recruiter_name: string
          created_at: string
        }
        Insert: {
          id?: string
          pipeline_entry_id: string
          from_stage?: string | null
          to_stage: string
          recruiter_name: string
          created_at?: string
        }
        Update: {
          id?: string
          pipeline_entry_id?: string
          from_stage?: string | null
          to_stage?: string
          recruiter_name?: string
          created_at?: string
        }
      }
      stage_limits: {
        Row: {
          id: string
          scope: string
          client_id: string | null
          job_id: string | null
          stage: string
          limit_days: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          scope: string
          client_id?: string | null
          job_id?: string | null
          stage: string
          limit_days: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          scope?: string
          client_id?: string | null
          job_id?: string | null
          stage?: string
          limit_days?: number
          created_at?: string
          updated_at?: string
        }
      }
      placements: {
        Row: {
          id: string
          pipeline_entry_id: string
          start_date: string
          guarantee_period_days: number
          guarantee_end_date: string
          created_at: string
        }
        Insert: {
          id?: string
          pipeline_entry_id: string
          start_date: string
          guarantee_period_days?: number
          guarantee_end_date: string
          created_at?: string
        }
        Update: {
          id?: string
          pipeline_entry_id?: string
          start_date?: string
          guarantee_period_days?: number
          guarantee_end_date?: string
          created_at?: string
        }
      }
      settings_log: {
        Row: {
          id: string
          setting_key: string
          old_value: Json | null
          new_value: Json | null
          recruiter_name: string
          created_at: string
        }
        Insert: {
          id?: string
          setting_key: string
          old_value?: Json | null
          new_value?: Json | null
          recruiter_name: string
          created_at?: string
        }
        Update: {
          id?: string
          setting_key?: string
          old_value?: Json | null
          new_value?: Json | null
          recruiter_name?: string
          created_at?: string
        }
      }
      ai_runs: {
        Row: {
          id: string
          step: string
          provider: string
          model_id: string
          model_version: string
          prompt_version: string
          input_ref: string | null
          input_hash: string | null
          output: Json | null
          status: string
          error: string | null
          input_tokens: number | null
          output_tokens: number | null
          cost_usd: number | null
          duration_ms: number | null
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          step: string
          provider: string
          model_id: string
          model_version: string
          prompt_version: string
          input_ref?: string | null
          input_hash?: string | null
          output?: Json | null
          status?: string
          error?: string | null
          input_tokens?: number | null
          output_tokens?: number | null
          cost_usd?: number | null
          duration_ms?: number | null
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          step?: string
          provider?: string
          model_id?: string
          model_version?: string
          prompt_version?: string
          input_ref?: string | null
          input_hash?: string | null
          output?: Json | null
          status?: string
          error?: string | null
          input_tokens?: number | null
          output_tokens?: number | null
          cost_usd?: number | null
          duration_ms?: number | null
          created_at?: string
          completed_at?: string | null
        }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

