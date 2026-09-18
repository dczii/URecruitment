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
      ai_runs: {
        Row: {
          completed_at: string | null
          cost_usd: number | null
          created_at: string
          duration_ms: number | null
          error: string | null
          id: string
          input_hash: string | null
          input_ref: string | null
          input_tokens: number | null
          model_id: string
          model_version: string
          output: Json | null
          output_tokens: number | null
          prompt_version: string
          provider: string
          status: string
          step: string
        }
        Insert: {
          completed_at?: string | null
          cost_usd?: number | null
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          input_hash?: string | null
          input_ref?: string | null
          input_tokens?: number | null
          model_id: string
          model_version: string
          output?: Json | null
          output_tokens?: number | null
          prompt_version: string
          provider: string
          status?: string
          step: string
        }
        Update: {
          completed_at?: string | null
          cost_usd?: number | null
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          input_hash?: string | null
          input_ref?: string | null
          input_tokens?: number | null
          model_id?: string
          model_version?: string
          output?: Json | null
          output_tokens?: number | null
          prompt_version?: string
          provider?: string
          status?: string
          step?: string
        }
        Relationships: []
      }
      candidate_profiles: {
        Row: {
          ai_run_id: string | null
          candidate_id: string
          created_at: string
          cv_file_id: string | null
          id: string
          overridden_at: string | null
          overridden_by: string | null
          overrides: Json
          parsed: Json
          updated_at: string
        }
        Insert: {
          ai_run_id?: string | null
          candidate_id: string
          created_at?: string
          cv_file_id?: string | null
          id?: string
          overridden_at?: string | null
          overridden_by?: string | null
          overrides?: Json
          parsed?: Json
          updated_at?: string
        }
        Update: {
          ai_run_id?: string | null
          candidate_id?: string
          created_at?: string
          cv_file_id?: string | null
          id?: string
          overridden_at?: string | null
          overridden_by?: string | null
          overrides?: Json
          parsed?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_profiles_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_profiles_cv_file_id_fkey"
            columns: ["cv_file_id"]
            isOneToOne: false
            referencedRelation: "cv_files"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_skills: {
        Row: {
          ai_run_id: string | null
          candidate_id: string
          created_at: string
          id: string
          skill: string
          source_text: string
        }
        Insert: {
          ai_run_id?: string | null
          candidate_id: string
          created_at?: string
          id?: string
          skill: string
          source_text: string
        }
        Update: {
          ai_run_id?: string | null
          candidate_id?: string
          created_at?: string
          id?: string
          skill?: string
          source_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_skills_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          consent_date: string | null
          consent_method: string | null
          consent_status: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          last_activity_at: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          consent_date?: string | null
          consent_method?: string | null
          consent_status?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          last_activity_at?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          consent_date?: string | null
          consent_method?: string | null
          consent_status?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          last_activity_at?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          created_at: string
          guarantee_period_days: number
          id: string
          name: string
          stage_limit_overrides: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          guarantee_period_days?: number
          id?: string
          name: string
          stage_limit_overrides?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          guarantee_period_days?: number
          id?: string
          name?: string
          stage_limit_overrides?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      cv_files: {
        Row: {
          candidate_id: string | null
          created_at: string
          doc_kind: string
          id: string
          language: string | null
          parse_error: string | null
          parse_status: string
          source: string
          source_hash: string | null
          source_ref: string | null
          storage_path: string
        }
        Insert: {
          candidate_id?: string | null
          created_at?: string
          doc_kind: string
          id?: string
          language?: string | null
          parse_error?: string | null
          parse_status?: string
          source?: string
          source_hash?: string | null
          source_ref?: string | null
          storage_path: string
        }
        Update: {
          candidate_id?: string | null
          created_at?: string
          doc_kind?: string
          id?: string
          language?: string | null
          parse_error?: string | null
          parse_status?: string
          source?: string
          source_hash?: string | null
          source_ref?: string | null
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "cv_files_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      embeddings: {
        Row: {
          ai_run_id: string | null
          created_at: string
          embedding: string | null
          embedding_model: string
          id: string
          owner_id: string
          owner_type: string
        }
        Insert: {
          ai_run_id?: string | null
          created_at?: string
          embedding?: string | null
          embedding_model: string
          id?: string
          owner_id: string
          owner_type: string
        }
        Update: {
          ai_run_id?: string | null
          created_at?: string
          embedding?: string | null
          embedding_model?: string
          id?: string
          owner_id?: string
          owner_type?: string
        }
        Relationships: []
      }
      gap_flags: {
        Row: {
          created_at: string
          flag_type: string
          id: string
          job_version_id: string
          reason: string
          resolution_note: string | null
          resolution_state: string
          suggested_question: string | null
        }
        Insert: {
          created_at?: string
          flag_type: string
          id?: string
          job_version_id: string
          reason: string
          resolution_note?: string | null
          resolution_state?: string
          suggested_question?: string | null
        }
        Update: {
          created_at?: string
          flag_type?: string
          id?: string
          job_version_id?: string
          reason?: string
          resolution_note?: string | null
          resolution_state?: string
          suggested_question?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gap_flags_job_version_id_fkey"
            columns: ["job_version_id"]
            isOneToOne: false
            referencedRelation: "job_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      job_versions: {
        Row: {
          created_at: string
          fields: Json
          id: string
          job_id: string
          language_reason: string | null
          must_haves: Json
          nationality_reason: string | null
          nice_to_haves: Json
          requires_language: boolean
          requires_nationality: boolean
        }
        Insert: {
          created_at?: string
          fields: Json
          id?: string
          job_id: string
          language_reason?: string | null
          must_haves?: Json
          nationality_reason?: string | null
          nice_to_haves?: Json
          requires_language?: boolean
          requires_nationality?: boolean
        }
        Update: {
          created_at?: string
          fields?: Json
          id?: string
          job_id?: string
          language_reason?: string | null
          must_haves?: Json
          nationality_reason?: string | null
          nice_to_haves?: Json
          requires_language?: boolean
          requires_nationality?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "job_versions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          client_id: string
          created_at: string
          current_version_id: string | null
          id: string
          owner_name: string
          status: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          current_version_id?: string | null
          id?: string
          owner_name: string
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          current_version_id?: string | null
          id?: string
          owner_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_current_version_id_fkey"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "job_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      match_scores: {
        Row: {
          ai_run_id: string | null
          candidate_id: string
          created_at: string
          id: string
          job_version_id: string
          matched: Json
          missing: Json
          model_version: string
          raw_score: number | null
          score: number
          uncertain: Json
        }
        Insert: {
          ai_run_id?: string | null
          candidate_id: string
          created_at?: string
          id?: string
          job_version_id: string
          matched?: Json
          missing?: Json
          model_version: string
          raw_score?: number | null
          score: number
          uncertain?: Json
        }
        Update: {
          ai_run_id?: string | null
          candidate_id?: string
          created_at?: string
          id?: string
          job_version_id?: string
          matched?: Json
          missing?: Json
          model_version?: string
          raw_score?: number | null
          score?: number
          uncertain?: Json
        }
        Relationships: [
          {
            foreignKeyName: "match_scores_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_scores_job_version_id_fkey"
            columns: ["job_version_id"]
            isOneToOne: false
            referencedRelation: "job_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_entries: {
        Row: {
          candidate_id: string
          created_at: string
          entered_at: string
          id: string
          job_id: string
          owner_name: string
          stage: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          entered_at?: string
          id?: string
          job_id: string
          owner_name: string
          stage: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          entered_at?: string
          id?: string
          job_id?: string
          owner_name?: string
          stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_entries_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_entries_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      placements: {
        Row: {
          created_at: string
          guarantee_end_date: string
          guarantee_period_days: number
          id: string
          pipeline_entry_id: string
          start_date: string
        }
        Insert: {
          created_at?: string
          guarantee_end_date: string
          guarantee_period_days?: number
          id?: string
          pipeline_entry_id: string
          start_date: string
        }
        Update: {
          created_at?: string
          guarantee_end_date?: string
          guarantee_period_days?: number
          id?: string
          pipeline_entry_id?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "placements_pipeline_entry_id_fkey"
            columns: ["pipeline_entry_id"]
            isOneToOne: false
            referencedRelation: "pipeline_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      settings_log: {
        Row: {
          created_at: string
          id: string
          new_value: Json | null
          old_value: Json | null
          recruiter_name: string
          setting_key: string
        }
        Insert: {
          created_at?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          recruiter_name: string
          setting_key: string
        }
        Update: {
          created_at?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          recruiter_name?: string
          setting_key?: string
        }
        Relationships: []
      }
      stage_events: {
        Row: {
          created_at: string
          from_stage: string | null
          id: string
          pipeline_entry_id: string
          recruiter_name: string
          to_stage: string
        }
        Insert: {
          created_at?: string
          from_stage?: string | null
          id?: string
          pipeline_entry_id: string
          recruiter_name: string
          to_stage: string
        }
        Update: {
          created_at?: string
          from_stage?: string | null
          id?: string
          pipeline_entry_id?: string
          recruiter_name?: string
          to_stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "stage_events_pipeline_entry_id_fkey"
            columns: ["pipeline_entry_id"]
            isOneToOne: false
            referencedRelation: "pipeline_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      stage_limits: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          job_id: string | null
          limit_days: number
          scope: string
          stage: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          job_id?: string | null
          limit_days: number
          scope: string
          stage: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          job_id?: string | null
          limit_days?: number
          scope?: string
          stage?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stage_limits_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_limits_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
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

