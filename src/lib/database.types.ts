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
            foreignKeyName: "candidate_profiles_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "searchable_candidates"
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
          {
            foreignKeyName: "candidate_skills_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "searchable_candidates"
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
          attempt_count: number
          candidate_id: string | null
          created_at: string
          doc_kind: string
          id: string
          language: string | null
          last_attempted_at: string | null
          parse_error: string | null
          parse_status: string
          source: string
          source_hash: string | null
          source_ref: string | null
          storage_path: string
        }
        Insert: {
          attempt_count?: number
          candidate_id?: string | null
          created_at?: string
          doc_kind: string
          id?: string
          language?: string | null
          last_attempted_at?: string | null
          parse_error?: string | null
          parse_status?: string
          source?: string
          source_hash?: string | null
          source_ref?: string | null
          storage_path: string
        }
        Update: {
          attempt_count?: number
          candidate_id?: string | null
          created_at?: string
          doc_kind?: string
          id?: string
          language?: string | null
          last_attempted_at?: string | null
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
          {
            foreignKeyName: "cv_files_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "searchable_candidates"
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
          resolved_at: string | null
          resolved_by: string | null
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
          resolved_at?: string | null
          resolved_by?: string | null
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
          resolved_at?: string | null
          resolved_by?: string | null
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
            foreignKeyName: "match_scores_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "searchable_candidates"
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
            foreignKeyName: "pipeline_entries_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "searchable_candidates"
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
          recruiter_name: string
          start_date: string
        }
        Insert: {
          created_at?: string
          guarantee_end_date: string
          guarantee_period_days?: number
          id?: string
          pipeline_entry_id: string
          recruiter_name: string
          start_date: string
        }
        Update: {
          created_at?: string
          guarantee_end_date?: string
          guarantee_period_days?: number
          id?: string
          pipeline_entry_id?: string
          recruiter_name?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "placements_pipeline_entry_id_fkey"
            columns: ["pipeline_entry_id"]
            isOneToOne: true
            referencedRelation: "pipeline_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placements_pipeline_entry_id_fkey"
            columns: ["pipeline_entry_id"]
            isOneToOne: true
            referencedRelation: "pipeline_status"
            referencedColumns: ["pipeline_entry_id"]
          },
        ]
      }
      rescore_runs: {
        Row: {
          candidate_ids_scored: Json
          created_at: string
          error: string | null
          id: string
          job_version_id: string
          status: string
          updated_at: string
        }
        Insert: {
          candidate_ids_scored?: Json
          created_at?: string
          error?: string | null
          id?: string
          job_version_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          candidate_ids_scored?: Json
          created_at?: string
          error?: string | null
          id?: string
          job_version_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rescore_runs_job_version_id_fkey"
            columns: ["job_version_id"]
            isOneToOne: false
            referencedRelation: "job_versions"
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
      sg_public_holidays: {
        Row: {
          date: string
          name: string
          year: number
        }
        Insert: {
          date: string
          name: string
          year: number
        }
        Update: {
          date?: string
          name?: string
          year?: number
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
          {
            foreignKeyName: "stage_events_pipeline_entry_id_fkey"
            columns: ["pipeline_entry_id"]
            isOneToOne: false
            referencedRelation: "pipeline_status"
            referencedColumns: ["pipeline_entry_id"]
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
      pipeline_status: {
        Row: {
          candidate_id: string | null
          days_over: number | null
          job_id: string | null
          limit_days: number | null
          pipeline_entry_id: string | null
          stage: string | null
          status: string | null
          waiting_on: string | null
          working_days_used: number | null
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
            foreignKeyName: "pipeline_entries_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "searchable_candidates"
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
      placements_guarantee_flag: {
        Row: {
          flag: string | null
          guarantee_end_date: string | null
          pipeline_entry_id: string | null
          placement_id: string | null
          start_date: string | null
        }
        Insert: {
          flag?: never
          guarantee_end_date?: string | null
          pipeline_entry_id?: string | null
          placement_id?: string | null
          start_date?: string | null
        }
        Update: {
          flag?: never
          guarantee_end_date?: string | null
          pipeline_entry_id?: string | null
          placement_id?: string | null
          start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "placements_pipeline_entry_id_fkey"
            columns: ["pipeline_entry_id"]
            isOneToOne: true
            referencedRelation: "pipeline_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placements_pipeline_entry_id_fkey"
            columns: ["pipeline_entry_id"]
            isOneToOne: true
            referencedRelation: "pipeline_status"
            referencedColumns: ["pipeline_entry_id"]
          },
        ]
      }
      searchable_candidates: {
        Row: {
          consent_date: string | null
          consent_method: string | null
          consent_status: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          last_activity_at: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          consent_date?: string | null
          consent_method?: string | null
          consent_status?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          last_activity_at?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          consent_date?: string | null
          consent_method?: string | null
          consent_status?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          last_activity_at?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      candidate_search_text: {
        Args: { overrides: Json; parsed: Json }
        Returns: string
      }
      candidate_total_years: { Args: { work_history: Json }; Returns: number }
      pgroonga_command:
        | { Args: { groongacommand: string }; Returns: string }
        | {
            Args: { arguments: string[]; groongacommand: string }
            Returns: string
          }
      pgroonga_command_escape_value: {
        Args: { value: string }
        Returns: string
      }
      pgroonga_condition: {
        Args: {
          column_name?: string
          fuzzy_max_distance_ratio?: number
          index_name?: string
          query?: string
          schema_name?: string
          scorers?: string[]
          weights?: number[]
        }
        Returns: Database["public"]["CompositeTypes"]["pgroonga_condition"]
        SetofOptions: {
          from: "*"
          to: "pgroonga_condition"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      pgroonga_equal_query_text_array: {
        Args: { query: string; targets: string[] }
        Returns: boolean
      }
      pgroonga_equal_query_text_array_condition:
        | {
            Args: {
              condition: Database["public"]["CompositeTypes"]["pgroonga_condition"]
              targets: string[]
            }
            Returns: boolean
          }
        | {
            Args: {
              condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition"]
              targets: string[]
            }
            Returns: boolean
          }
      pgroonga_equal_query_varchar_array: {
        Args: { query: string; targets: string[] }
        Returns: boolean
      }
      pgroonga_equal_query_varchar_array_condition:
        | {
            Args: {
              condition: Database["public"]["CompositeTypes"]["pgroonga_condition"]
              targets: string[]
            }
            Returns: boolean
          }
        | {
            Args: {
              condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition"]
              targets: string[]
            }
            Returns: boolean
          }
      pgroonga_equal_text: {
        Args: { other: string; target: string }
        Returns: boolean
      }
      pgroonga_equal_text_condition:
        | {
            Args: {
              condition: Database["public"]["CompositeTypes"]["pgroonga_condition"]
              target: string
            }
            Returns: boolean
          }
        | {
            Args: {
              condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition"]
              target: string
            }
            Returns: boolean
          }
      pgroonga_equal_varchar: {
        Args: { other: string; target: string }
        Returns: boolean
      }
      pgroonga_equal_varchar_condition:
        | {
            Args: {
              condition: Database["public"]["CompositeTypes"]["pgroonga_condition"]
              target: string
            }
            Returns: boolean
          }
        | {
            Args: {
              condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition"]
              target: string
            }
            Returns: boolean
          }
      pgroonga_escape:
        | {
            Args: { value: number }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.pgroonga_escape(value => bool), public.pgroonga_escape(value => int8), public.pgroonga_escape(value => int2), public.pgroonga_escape(value => int4), public.pgroonga_escape(value => text), public.pgroonga_escape(value => float4), public.pgroonga_escape(value => float8), public.pgroonga_escape(value => timestamp), public.pgroonga_escape(value => timestamptz). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { value: boolean }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.pgroonga_escape(value => bool), public.pgroonga_escape(value => int8), public.pgroonga_escape(value => int2), public.pgroonga_escape(value => int4), public.pgroonga_escape(value => text), public.pgroonga_escape(value => float4), public.pgroonga_escape(value => float8), public.pgroonga_escape(value => timestamp), public.pgroonga_escape(value => timestamptz). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { value: number }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.pgroonga_escape(value => bool), public.pgroonga_escape(value => int8), public.pgroonga_escape(value => int2), public.pgroonga_escape(value => int4), public.pgroonga_escape(value => text), public.pgroonga_escape(value => float4), public.pgroonga_escape(value => float8), public.pgroonga_escape(value => timestamp), public.pgroonga_escape(value => timestamptz). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { value: number }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.pgroonga_escape(value => bool), public.pgroonga_escape(value => int8), public.pgroonga_escape(value => int2), public.pgroonga_escape(value => int4), public.pgroonga_escape(value => text), public.pgroonga_escape(value => float4), public.pgroonga_escape(value => float8), public.pgroonga_escape(value => timestamp), public.pgroonga_escape(value => timestamptz). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { value: number }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.pgroonga_escape(value => bool), public.pgroonga_escape(value => int8), public.pgroonga_escape(value => int2), public.pgroonga_escape(value => int4), public.pgroonga_escape(value => text), public.pgroonga_escape(value => float4), public.pgroonga_escape(value => float8), public.pgroonga_escape(value => timestamp), public.pgroonga_escape(value => timestamptz). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { value: number }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.pgroonga_escape(value => bool), public.pgroonga_escape(value => int8), public.pgroonga_escape(value => int2), public.pgroonga_escape(value => int4), public.pgroonga_escape(value => text), public.pgroonga_escape(value => float4), public.pgroonga_escape(value => float8), public.pgroonga_escape(value => timestamp), public.pgroonga_escape(value => timestamptz). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { value: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.pgroonga_escape(value => bool), public.pgroonga_escape(value => int8), public.pgroonga_escape(value => int2), public.pgroonga_escape(value => int4), public.pgroonga_escape(value => text), public.pgroonga_escape(value => float4), public.pgroonga_escape(value => float8), public.pgroonga_escape(value => timestamp), public.pgroonga_escape(value => timestamptz). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { special_characters: string; value: string }
            Returns: string
          }
        | {
            Args: { value: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.pgroonga_escape(value => bool), public.pgroonga_escape(value => int8), public.pgroonga_escape(value => int2), public.pgroonga_escape(value => int4), public.pgroonga_escape(value => text), public.pgroonga_escape(value => float4), public.pgroonga_escape(value => float8), public.pgroonga_escape(value => timestamp), public.pgroonga_escape(value => timestamptz). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { value: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.pgroonga_escape(value => bool), public.pgroonga_escape(value => int8), public.pgroonga_escape(value => int2), public.pgroonga_escape(value => int4), public.pgroonga_escape(value => text), public.pgroonga_escape(value => float4), public.pgroonga_escape(value => float8), public.pgroonga_escape(value => timestamp), public.pgroonga_escape(value => timestamptz). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
      pgroonga_flush: { Args: { indexname: unknown }; Returns: boolean }
      pgroonga_highlight_html:
        | { Args: { keywords: string[]; target: string }; Returns: string }
        | {
            Args: { indexname: unknown; keywords: string[]; target: string }
            Returns: string
          }
        | { Args: { keywords: string[]; targets: string[] }; Returns: string[] }
        | {
            Args: { indexname: unknown; keywords: string[]; targets: string[] }
            Returns: string[]
          }
      pgroonga_index_column_name:
        | { Args: { columnindex: number; indexname: unknown }; Returns: string }
        | { Args: { columnname: string; indexname: unknown }; Returns: string }
      pgroonga_is_writable: { Args: never; Returns: boolean }
      pgroonga_list_broken_indexes: { Args: never; Returns: string[] }
      pgroonga_list_lagged_indexes: { Args: never; Returns: string[] }
      pgroonga_match_positions_byte:
        | { Args: { keywords: string[]; target: string }; Returns: number[] }
        | {
            Args: { indexname: unknown; keywords: string[]; target: string }
            Returns: number[]
          }
      pgroonga_match_positions_character:
        | { Args: { keywords: string[]; target: string }; Returns: number[] }
        | {
            Args: { indexname: unknown; keywords: string[]; target: string }
            Returns: number[]
          }
      pgroonga_match_term:
        | { Args: { target: string; term: string }; Returns: boolean }
        | { Args: { target: string[]; term: string }; Returns: boolean }
        | { Args: { target: string; term: string }; Returns: boolean }
        | { Args: { target: string[]; term: string }; Returns: boolean }
      pgroonga_match_text_array_condition:
        | {
            Args: {
              condition: Database["public"]["CompositeTypes"]["pgroonga_condition"]
              target: string[]
            }
            Returns: boolean
          }
        | {
            Args: {
              condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition"]
              target: string[]
            }
            Returns: boolean
          }
      pgroonga_match_text_array_condition_with_scorers: {
        Args: {
          condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition_with_scorers"]
          target: string[]
        }
        Returns: boolean
      }
      pgroonga_match_text_condition:
        | {
            Args: {
              condition: Database["public"]["CompositeTypes"]["pgroonga_condition"]
              target: string
            }
            Returns: boolean
          }
        | {
            Args: {
              condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition"]
              target: string
            }
            Returns: boolean
          }
      pgroonga_match_text_condition_with_scorers: {
        Args: {
          condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition_with_scorers"]
          target: string
        }
        Returns: boolean
      }
      pgroonga_match_varchar_condition:
        | {
            Args: {
              condition: Database["public"]["CompositeTypes"]["pgroonga_condition"]
              target: string
            }
            Returns: boolean
          }
        | {
            Args: {
              condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition"]
              target: string
            }
            Returns: boolean
          }
      pgroonga_match_varchar_condition_with_scorers: {
        Args: {
          condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition_with_scorers"]
          target: string
        }
        Returns: boolean
      }
      pgroonga_normalize:
        | { Args: { target: string }; Returns: string }
        | { Args: { normalizername: string; target: string }; Returns: string }
      pgroonga_prefix_varchar_condition:
        | {
            Args: {
              conditoin: Database["public"]["CompositeTypes"]["pgroonga_condition"]
              target: string
            }
            Returns: boolean
          }
        | {
            Args: {
              conditoin: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition"]
              target: string
            }
            Returns: boolean
          }
      pgroonga_query_escape: { Args: { query: string }; Returns: string }
      pgroonga_query_expand: {
        Args: {
          query: string
          synonymscolumnname: string
          tablename: unknown
          termcolumnname: string
        }
        Returns: string
      }
      pgroonga_query_extract_keywords: {
        Args: { index_name?: string; query: string }
        Returns: string[]
      }
      pgroonga_query_text_array_condition:
        | {
            Args: {
              condition: Database["public"]["CompositeTypes"]["pgroonga_condition"]
              targets: string[]
            }
            Returns: boolean
          }
        | {
            Args: {
              condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition"]
              targets: string[]
            }
            Returns: boolean
          }
      pgroonga_query_text_array_condition_with_scorers: {
        Args: {
          condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition_with_scorers"]
          targets: string[]
        }
        Returns: boolean
      }
      pgroonga_query_text_condition:
        | {
            Args: {
              condition: Database["public"]["CompositeTypes"]["pgroonga_condition"]
              target: string
            }
            Returns: boolean
          }
        | {
            Args: {
              condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition"]
              target: string
            }
            Returns: boolean
          }
      pgroonga_query_text_condition_with_scorers: {
        Args: {
          condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition_with_scorers"]
          target: string
        }
        Returns: boolean
      }
      pgroonga_query_varchar_condition:
        | {
            Args: {
              condition: Database["public"]["CompositeTypes"]["pgroonga_condition"]
              target: string
            }
            Returns: boolean
          }
        | {
            Args: {
              condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition"]
              target: string
            }
            Returns: boolean
          }
      pgroonga_query_varchar_condition_with_scorers: {
        Args: {
          condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition_with_scorers"]
          target: string
        }
        Returns: boolean
      }
      pgroonga_regexp_text_array: {
        Args: { pattern: string; targets: string[] }
        Returns: boolean
      }
      pgroonga_regexp_text_array_condition: {
        Args: {
          pattern: Database["public"]["CompositeTypes"]["pgroonga_condition"]
          targets: string[]
        }
        Returns: boolean
      }
      pgroonga_result_to_jsonb_objects: {
        Args: { result: Json }
        Returns: Json
      }
      pgroonga_result_to_recordset: {
        Args: { result: Json }
        Returns: Record<string, unknown>[]
      }
      pgroonga_score:
        | { Args: { row: Record<string, unknown> }; Returns: number }
        | { Args: { ctid: unknown; tableoid: unknown }; Returns: number }
      pgroonga_set_writable: {
        Args: { newwritable: boolean }
        Returns: boolean
      }
      pgroonga_snippet_html: {
        Args: { keywords: string[]; target: string; width?: number }
        Returns: string[]
      }
      pgroonga_table_name: { Args: { indexname: unknown }; Returns: string }
      pgroonga_tokenize: {
        Args: { options: string[]; target: string }
        Returns: Json[]
      }
      pgroonga_vacuum: { Args: never; Returns: boolean }
      pgroonga_wal_apply:
        | { Args: never; Returns: number }
        | { Args: { indexname: unknown }; Returns: number }
      pgroonga_wal_set_applied_position:
        | { Args: never; Returns: boolean }
        | { Args: { block: number; offset: number }; Returns: boolean }
        | { Args: { indexname: unknown }; Returns: boolean }
        | {
            Args: { block: number; indexname: unknown; offset: number }
            Returns: boolean
          }
      pgroonga_wal_status: {
        Args: never
        Returns: {
          current_block: number
          current_offset: number
          current_size: number
          last_block: number
          last_offset: number
          last_size: number
          name: string
          oid: unknown
        }[]
      }
      pgroonga_wal_truncate:
        | { Args: never; Returns: number }
        | { Args: { indexname: unknown }; Returns: number }
      resolve_stage_limit: {
        Args: { p_client_id: string; p_job_id: string; p_stage: string }
        Returns: number
      }
      search_candidates: {
        Args: { filters: Json; keyword: string; lim?: number; off?: number }
        Returns: {
          candidate_id: string
          cv_updated_at: string
          full_name: string
          headline: string
          highlight: string
          keyword_score: number
          languages: string[]
          location: string
          total_years: number
        }[]
      }
      sg_add_working_days: {
        Args: { days: number; from_utc: string }
        Returns: string
      }
      sg_working_days_between: {
        Args: { from_utc: string; to_utc: string }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      pgroonga_condition: {
        query: string | null
        weigths: number[] | null
        scorers: string[] | null
        schema_name: string | null
        index_name: string | null
        column_name: string | null
        fuzzy_max_distance_ratio: number | null
      }
      pgroonga_full_text_search_condition: {
        query: string | null
        weigths: number[] | null
        indexname: string | null
      }
      pgroonga_full_text_search_condition_with_scorers: {
        query: string | null
        weigths: number[] | null
        scorers: string[] | null
        indexname: string | null
      }
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

