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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      audio_recordings: {
        Row: {
          audio_format: string | null
          created_at: string
          duration: number
          file_path: string | null
          file_size: number | null
          id: string
          is_favorite: boolean | null
          metadata: Json | null
          notes: string | null
          quality_score: number | null
          segment_id: string | null
          session_id: string
          tags: string[] | null
          transcription: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          audio_format?: string | null
          created_at?: string
          duration: number
          file_path?: string | null
          file_size?: number | null
          id?: string
          is_favorite?: boolean | null
          metadata?: Json | null
          notes?: string | null
          quality_score?: number | null
          segment_id?: string | null
          session_id: string
          tags?: string[] | null
          transcription?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          audio_format?: string | null
          created_at?: string
          duration?: number
          file_path?: string | null
          file_size?: number | null
          id?: string
          is_favorite?: boolean | null
          metadata?: Json | null
          notes?: string | null
          quality_score?: number | null
          segment_id?: string | null
          session_id?: string
          tags?: string[] | null
          transcription?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audio_recordings_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "loop_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audio_recordings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "practice_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audio_recordings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comparison_results: {
        Row: {
          created_at: string
          id: string
          improvement_suggestions: string[] | null
          original_segment_end: number
          original_segment_start: number
          pronunciation_feedback: Json | null
          recording_id: string
          similarity_score: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          improvement_suggestions?: string[] | null
          original_segment_end: number
          original_segment_start: number
          pronunciation_feedback?: Json | null
          recording_id: string
          similarity_score?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          improvement_suggestions?: string[] | null
          original_segment_end?: number
          original_segment_start?: number
          pronunciation_feedback?: Json | null
          recording_id?: string
          similarity_score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comparison_results_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "audio_recordings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comparison_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      loop_segments: {
        Row: {
          created_at: string
          description: string | null
          difficulty_level: number | null
          end_time: number
          id: string
          label: string | null
          practice_count: number | null
          session_id: string
          start_time: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          difficulty_level?: number | null
          end_time: number
          id?: string
          label?: string | null
          practice_count?: number | null
          session_id: string
          start_time: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          difficulty_level?: number | null
          end_time?: number
          id?: string
          label?: string | null
          practice_count?: number | null
          session_id?: string
          start_time?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loop_segments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "practice_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_sessions: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          recordings_count: number | null
          segments_count: number | null
          session_duration: number | null
          status: string | null
          total_practice_time: number | null
          updated_at: string
          user_id: string
          video_channel: string | null
          video_duration: number | null
          video_id: string
          video_title: string
          video_url: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          recordings_count?: number | null
          segments_count?: number | null
          session_duration?: number | null
          status?: string | null
          total_practice_time?: number | null
          updated_at?: string
          user_id: string
          video_channel?: string | null
          video_duration?: number | null
          video_id: string
          video_title: string
          video_url: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          recordings_count?: number | null
          segments_count?: number | null
          session_duration?: number | null
          status?: string | null
          total_practice_time?: number | null
          updated_at?: string
          user_id?: string
          video_channel?: string | null
          video_duration?: number | null
          video_id?: string
          video_title?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_statistics: {
        Row: {
          avg_session_duration: number | null
          created_at: string
          date: string
          id: string
          recordings_count: number | null
          sessions_count: number | null
          streak_days: number | null
          total_practice_time: number | null
          unique_videos_count: number | null
          updated_at: string
          user_id: string
          weekly_goal_progress: number | null
        }
        Insert: {
          avg_session_duration?: number | null
          created_at?: string
          date: string
          id?: string
          recordings_count?: number | null
          sessions_count?: number | null
          streak_days?: number | null
          total_practice_time?: number | null
          unique_videos_count?: number | null
          updated_at?: string
          user_id: string
          weekly_goal_progress?: number | null
        }
        Update: {
          avg_session_duration?: number | null
          created_at?: string
          date?: string
          id?: string
          recordings_count?: number | null
          sessions_count?: number | null
          streak_days?: number | null
          total_practice_time?: number | null
          unique_videos_count?: number | null
          updated_at?: string
          user_id?: string
          weekly_goal_progress?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "practice_statistics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          api_config: Json | null
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          language_learning: Json | null
          native_language: string | null
          settings: Json | null
          subscription_tier: string | null
          updated_at: string
          user_preferences: Json | null
        }
        Insert: {
          api_config?: Json | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          language_learning?: Json | null
          native_language?: string | null
          settings?: Json | null
          subscription_tier?: string | null
          updated_at?: string
          user_preferences?: Json | null
        }
        Update: {
          api_config?: Json | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          language_learning?: Json | null
          native_language?: string | null
          settings?: Json | null
          subscription_tier?: string | null
          updated_at?: string
          user_preferences?: Json | null
        }
        Relationships: []
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