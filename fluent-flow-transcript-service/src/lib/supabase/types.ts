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
      challenge_participants: {
        Row: {
          avatar: string | null
          challenge_id: string
          completed_at: string | null
          id: string
          joined_at: string | null
          progress: number | null
          rank: number | null
          user_id: string
          username: string
        }
        Insert: {
          avatar?: string | null
          challenge_id: string
          completed_at?: string | null
          id?: string
          joined_at?: string | null
          progress?: number | null
          rank?: number | null
          user_id: string
          username: string
        }
        Update: {
          avatar?: string | null
          challenge_id?: string
          completed_at?: string | null
          id?: string
          joined_at?: string | null
          progress?: number | null
          rank?: number | null
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_participants_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "group_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string | null
          group_id: string | null
          id: string
          metadata: Json | null
          reactions: Json | null
          reply_to: string | null
          sender_avatar: string | null
          sender_id: string
          sender_name: string
          timestamp: string | null
          type: string
        }
        Insert: {
          content: string
          created_at?: string | null
          group_id?: string | null
          id?: string
          metadata?: Json | null
          reactions?: Json | null
          reply_to?: string | null
          sender_avatar?: string | null
          sender_id: string
          sender_name: string
          timestamp?: string | null
          type?: string
        }
        Update: {
          content?: string
          created_at?: string | null
          group_id?: string | null
          id?: string
          metadata?: Json | null
          reactions?: Json | null
          reply_to?: string | null
          sender_avatar?: string | null
          sender_id?: string
          sender_name?: string
          timestamp?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "chat_messages"
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
      contextual_learning_data: {
        Row: {
          collocations: Json
          created_at: string
          examples: Json
          id: string
          loop_id: string | null
          metadata: Json
          updated_at: string
          user_id: string
          vocabulary_id: string | null
          vocabulary_text: string
        }
        Insert: {
          collocations?: Json
          created_at?: string
          examples?: Json
          id?: string
          loop_id?: string | null
          metadata?: Json
          updated_at?: string
          user_id: string
          vocabulary_id?: string | null
          vocabulary_text: string
        }
        Update: {
          collocations?: Json
          created_at?: string
          examples?: Json
          id?: string
          loop_id?: string | null
          metadata?: Json
          updated_at?: string
          user_id?: string
          vocabulary_id?: string | null
          vocabulary_text?: string
        }
        Relationships: []
      }
      conversation_questions: {
        Row: {
          created_at: string | null
          id: string
          loop_id: string | null
          metadata: Json | null
          questions: Json
          segment_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          loop_id?: string | null
          metadata?: Json | null
          questions: Json
          segment_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          loop_id?: string | null
          metadata?: Json | null
          questions?: Json
          segment_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_conversation_questions_segment"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "loop_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_conversation_questions_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      favorite_quizzes: {
        Row: {
          created_at: string | null
          difficulty: string | null
          id: string
          question_set_title: string | null
          quiz_title: string | null
          session_id: string
          total_questions: number | null
          updated_at: string | null
          user_id: string
          user_score: number | null
          video_title: string | null
          video_url: string | null
        }
        Insert: {
          created_at?: string | null
          difficulty?: string | null
          id?: string
          question_set_title?: string | null
          quiz_title?: string | null
          session_id: string
          total_questions?: number | null
          updated_at?: string | null
          user_id: string
          user_score?: number | null
          video_title?: string | null
          video_url?: string | null
        }
        Update: {
          created_at?: string | null
          difficulty?: string | null
          id?: string
          question_set_title?: string | null
          quiz_title?: string | null
          session_id?: string
          total_questions?: number | null
          updated_at?: string | null
          user_id?: string
          user_score?: number | null
          video_title?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      group_challenges: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          duration: number
          end_date: string
          group_id: string | null
          id: string
          rewards: Json
          start_date: string
          status: string
          target: number
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          duration: number
          end_date: string
          group_id?: string | null
          id?: string
          rewards?: Json
          start_date: string
          status?: string
          target: number
          title: string
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          duration?: number
          end_date?: string
          group_id?: string | null
          id?: string
          rewards?: Json
          start_date?: string
          status?: string
          target?: number
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_challenges_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          group_id: string
          id: string
          invite_token: string
          invited_by: string
          message: string | null
          status: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          group_id: string
          id?: string
          invite_token?: string
          invited_by: string
          message?: string | null
          status?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          group_id?: string
          id?: string
          invite_token?: string
          invited_by?: string
          message?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_invitations_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_quiz_results: {
        Row: {
          completed_at: string | null
          correct_answers: number
          id: string
          result_data: Json | null
          score: number
          session_id: string
          time_taken_seconds: number | null
          total_questions: number
          user_id: string
          user_name: string | null
        }
        Insert: {
          completed_at?: string | null
          correct_answers: number
          id?: string
          result_data?: Json | null
          score: number
          session_id: string
          time_taken_seconds?: number | null
          total_questions: number
          user_id: string
          user_name?: string | null
        }
        Update: {
          completed_at?: string | null
          correct_answers?: number
          id?: string
          result_data?: Json | null
          score?: number
          session_id?: string
          time_taken_seconds?: number | null
          total_questions?: number
          user_id?: string
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_quiz_results_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "group_quiz_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      group_quiz_sessions: {
        Row: {
          created_at: string | null
          created_by: string
          ended_at: string | null
          group_id: string
          id: string
          loop_data: Json | null
          questions_data: Json | null
          quiz_title: string | null
          quiz_token: string
          scheduled_at: string | null
          session_type: string | null
          settings: Json | null
          share_token: string | null
          started_at: string | null
          status: string | null
          updated_at: string | null
          video_title: string | null
          video_url: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          ended_at?: string | null
          group_id: string
          id?: string
          loop_data?: Json | null
          questions_data?: Json | null
          quiz_title?: string | null
          quiz_token: string
          scheduled_at?: string | null
          session_type?: string | null
          settings?: Json | null
          share_token?: string | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
          video_title?: string | null
          video_url?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          ended_at?: string | null
          group_id?: string
          id?: string
          loop_data?: Json | null
          questions_data?: Json | null
          quiz_title?: string | null
          quiz_token?: string
          scheduled_at?: string | null
          session_type?: string | null
          settings?: Json | null
          share_token?: string | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
          video_title?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_quiz_sessions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_session_participants: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          joined_at: string | null
          responses: Json | null
          score: number | null
          session_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          joined_at?: string | null
          responses?: Json | null
          score?: number | null
          session_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          joined_at?: string | null
          responses?: Json | null
          score?: number | null
          session_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_session_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "group_quiz_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_goals: {
        Row: {
          completed_at: string | null
          created_at: string | null
          current: number | null
          deadline: string | null
          description: string | null
          id: string
          is_completed: boolean | null
          target: number
          title: string
          type: string
          unit: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          current?: number | null
          deadline?: string | null
          description?: string | null
          id?: string
          is_completed?: boolean | null
          target: number
          title: string
          type: string
          unit: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          current?: number | null
          deadline?: string | null
          description?: string | null
          id?: string
          is_completed?: boolean | null
          target?: number
          title?: string
          type?: string
          unit?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      loop_segments: {
        Row: {
          created_at: string
          description: string | null
          difficulty_level: number | null
          end_time: number
          has_transcript: boolean | null
          id: string
          label: string | null
          practice_count: number | null
          session_id: string
          start_time: number
          transcript_id: string | null
          transcript_metadata: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          difficulty_level?: number | null
          end_time: number
          has_transcript?: boolean | null
          id?: string
          label?: string | null
          practice_count?: number | null
          session_id: string
          start_time: number
          transcript_id?: string | null
          transcript_metadata?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          difficulty_level?: number | null
          end_time?: number
          has_transcript?: boolean | null
          id?: string
          label?: string | null
          practice_count?: number | null
          session_id?: string
          start_time?: number
          transcript_id?: string | null
          transcript_metadata?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_loop_segments_transcript"
            columns: ["transcript_id"]
            isOneToOne: false
            referencedRelation: "transcripts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loop_segments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "practice_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          expires_at: string | null
          id: string
          message: string
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          expires_at?: string | null
          id?: string
          message: string
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          expires_at?: string | null
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
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
      selected_words: {
        Row: {
          collocations: string[] | null
          context: string | null
          created_at: string | null
          definition: string | null
          difficulty: string | null
          example: string | null
          examples: string[] | null
          id: string
          session_context: string | null
          source_id: string | null
          source_title: string | null
          source_type: string | null
          source_url: string | null
          updated_at: string | null
          user_id: string
          word: string
        }
        Insert: {
          collocations?: string[] | null
          context?: string | null
          created_at?: string | null
          definition?: string | null
          difficulty?: string | null
          example?: string | null
          examples?: string[] | null
          id?: string
          session_context?: string | null
          source_id?: string | null
          source_title?: string | null
          source_type?: string | null
          source_url?: string | null
          updated_at?: string | null
          user_id: string
          word: string
        }
        Update: {
          collocations?: string[] | null
          context?: string | null
          created_at?: string | null
          definition?: string | null
          difficulty?: string | null
          example?: string | null
          examples?: string[] | null
          id?: string
          session_context?: string | null
          source_id?: string | null
          source_title?: string | null
          source_type?: string | null
          source_url?: string | null
          updated_at?: string | null
          user_id?: string
          word?: string
        }
        Relationships: []
      }
      shared_question_sets: {
        Row: {
          created_at: string
          created_by: string | null
          end_time: number | null
          expires_at: string
          group_id: string | null
          id: string
          is_public: boolean
          metadata: Json
          questions: Json
          session_id: string | null
          share_token: string
          start_time: number | null
          title: string
          transcript: string | null
          updated_at: string
          video_title: string | null
          video_url: string | null
          vocabulary: Json
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_time?: number | null
          expires_at?: string
          group_id?: string | null
          id?: string
          is_public?: boolean
          metadata?: Json
          questions?: Json
          session_id?: string | null
          share_token?: string
          start_time?: number | null
          title: string
          transcript?: string | null
          updated_at?: string
          video_title?: string | null
          video_url?: string | null
          vocabulary?: Json
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_time?: number | null
          expires_at?: string
          group_id?: string | null
          id?: string
          is_public?: boolean
          metadata?: Json
          questions?: Json
          session_id?: string | null
          share_token?: string
          start_time?: number | null
          title?: string
          transcript?: string | null
          updated_at?: string
          video_title?: string | null
          video_url?: string | null
          vocabulary?: Json
        }
        Relationships: [
          {
            foreignKeyName: "shared_question_sets_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_question_sets_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "group_quiz_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      social_notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          expires_at: string | null
          id: string
          message: string
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          expires_at?: string | null
          id?: string
          message: string
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          expires_at?: string | null
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      study_group_members: {
        Row: {
          avatar: string | null
          contribution: number | null
          group_id: string
          id: string
          joined_at: string | null
          last_active: string | null
          role: string
          user_email: string | null
          user_id: string
          username: string
        }
        Insert: {
          avatar?: string | null
          contribution?: number | null
          group_id: string
          id?: string
          joined_at?: string | null
          last_active?: string | null
          role?: string
          user_email?: string | null
          user_id: string
          username: string
        }
        Update: {
          avatar?: string | null
          contribution?: number | null
          group_id?: string
          id?: string
          joined_at?: string | null
          last_active?: string | null
          role?: string
          user_email?: string | null
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      study_groups: {
        Row: {
          created_at: string | null
          created_by: string
          creator_id: string | null
          current_challenge_id: string | null
          description: string | null
          group_code: string | null
          id: string
          is_private: boolean | null
          language: string
          level: string
          max_members: number | null
          name: string
          stats: Json | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          creator_id?: string | null
          current_challenge_id?: string | null
          description?: string | null
          group_code?: string | null
          id?: string
          is_private?: boolean | null
          language: string
          level: string
          max_members?: number | null
          name: string
          stats?: Json | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          creator_id?: string | null
          current_challenge_id?: string | null
          description?: string | null
          group_code?: string | null
          id?: string
          is_private?: boolean | null
          language?: string
          level?: string
          max_members?: number | null
          name?: string
          stats?: Json | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      transcript_summaries: {
        Row: {
          created_at: string | null
          difficulty_assessment: string | null
          id: string
          key_insights: Json | null
          loop_id: string
          main_points: Json | null
          metadata: Json | null
          recommended_focus_areas: Json | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          difficulty_assessment?: string | null
          id?: string
          key_insights?: Json | null
          loop_id: string
          main_points?: Json | null
          metadata?: Json | null
          recommended_focus_areas?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          difficulty_assessment?: string | null
          id?: string
          key_insights?: Json | null
          loop_id?: string
          main_points?: Json | null
          metadata?: Json | null
          recommended_focus_areas?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      transcripts: {
        Row: {
          created_at: string | null
          end_time: number
          full_text: string
          id: string
          language: string | null
          metadata: Json | null
          segments: Json
          start_time: number
          video_id: string
        }
        Insert: {
          created_at?: string | null
          end_time: number
          full_text: string
          id?: string
          language?: string | null
          metadata?: Json | null
          segments?: Json
          start_time: number
          video_id: string
        }
        Update: {
          created_at?: string | null
          end_time?: number
          full_text?: string
          id?: string
          language?: string | null
          metadata?: Json | null
          segments?: Json
          start_time?: number
          video_id?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          description: string
          icon: string
          id: string
          name: string
          rarity: string
          type: string
          unlocked_at: string | null
          user_id: string
          xp_reward: number | null
        }
        Insert: {
          achievement_id: string
          description: string
          icon: string
          id?: string
          name: string
          rarity: string
          type: string
          unlocked_at?: string | null
          user_id: string
          xp_reward?: number | null
        }
        Update: {
          achievement_id?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          rarity?: string
          type?: string
          unlocked_at?: string | null
          user_id?: string
          xp_reward?: number | null
        }
        Relationships: []
      }
      user_activity_log: {
        Row: {
          action: string
          created_at: string | null
          feature_id: string | null
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          feature_id?: string | null
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          feature_id?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      user_learning_stats: {
        Row: {
          correct_reviews: number | null
          created_at: string | null
          current_streak_days: number | null
          id: string
          last_practice_date: string | null
          longest_streak_days: number | null
          phrases_learned: number | null
          total_phrases_added: number | null
          total_reviews: number | null
          total_words_added: number | null
          updated_at: string | null
          user_id: string | null
          words_learned: number | null
        }
        Insert: {
          correct_reviews?: number | null
          created_at?: string | null
          current_streak_days?: number | null
          id?: string
          last_practice_date?: string | null
          longest_streak_days?: number | null
          phrases_learned?: number | null
          total_phrases_added?: number | null
          total_reviews?: number | null
          total_words_added?: number | null
          updated_at?: string | null
          user_id?: string | null
          words_learned?: number | null
        }
        Update: {
          correct_reviews?: number | null
          created_at?: string | null
          current_streak_days?: number | null
          id?: string
          last_practice_date?: string | null
          longest_streak_days?: number | null
          phrases_learned?: number | null
          total_phrases_added?: number | null
          total_reviews?: number | null
          total_words_added?: number | null
          updated_at?: string | null
          user_id?: string | null
          words_learned?: number | null
        }
        Relationships: []
      }
      user_licenses: {
        Row: {
          created_at: string | null
          expires_at: string
          features: Json
          id: string
          is_active: boolean | null
          issued_at: string | null
          last_validated_at: string | null
          license_token: string
          limits: Json
          user_id: string
          validation_count: number | null
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          features: Json
          id?: string
          is_active?: boolean | null
          issued_at?: string | null
          last_validated_at?: string | null
          license_token: string
          limits: Json
          user_id: string
          validation_count?: number | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          features?: Json
          id?: string
          is_active?: boolean | null
          issued_at?: string | null
          last_validated_at?: string | null
          license_token?: string
          limits?: Json
          user_id?: string
          validation_count?: number | null
        }
        Relationships: []
      }
      user_social_profiles: {
        Row: {
          achievements: Json | null
          avatar: string | null
          created_at: string | null
          display_name: string
          id: string
          is_online: boolean | null
          joined_at: string | null
          language_preferences: Json
          last_seen: string | null
          level_data: Json
          preferences: Json
          stats: Json
          updated_at: string | null
          user_id: string
          username: string
        }
        Insert: {
          achievements?: Json | null
          avatar?: string | null
          created_at?: string | null
          display_name: string
          id?: string
          is_online?: boolean | null
          joined_at?: string | null
          language_preferences?: Json
          last_seen?: string | null
          level_data?: Json
          preferences?: Json
          stats?: Json
          updated_at?: string | null
          user_id: string
          username: string
        }
        Update: {
          achievements?: Json | null
          avatar?: string | null
          created_at?: string | null
          display_name?: string
          id?: string
          is_online?: boolean | null
          joined_at?: string | null
          language_preferences?: Json
          last_seen?: string | null
          level_data?: Json
          preferences?: Json
          stats?: Json
          updated_at?: string | null
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      user_srs_sessions: {
        Row: {
          created_at: string
          id: string
          session_data: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          session_data: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          session_data?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          canceled_at: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          external_customer_id: string | null
          external_subscription_id: string | null
          features: Json
          id: string
          limits: Json
          plan_id: string
          plan_name: string
          status: string
          trial_end: string | null
          trial_start: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          external_customer_id?: string | null
          external_subscription_id?: string | null
          features?: Json
          id?: string
          limits?: Json
          plan_id?: string
          plan_name?: string
          status?: string
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          external_customer_id?: string | null
          external_subscription_id?: string | null
          features?: Json
          id?: string
          limits?: Json
          plan_id?: string
          plan_name?: string
          status?: string
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_usage: {
        Row: {
          ai_requests_made: number | null
          created_at: string | null
          custom_prompts_used: number | null
          export_operations: number | null
          features_accessed: Json | null
          file_uploads: number | null
          id: string
          last_reset_at: string | null
          loops_created: number | null
          month_year: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_requests_made?: number | null
          created_at?: string | null
          custom_prompts_used?: number | null
          export_operations?: number | null
          features_accessed?: Json | null
          file_uploads?: number | null
          id?: string
          last_reset_at?: string | null
          loops_created?: number | null
          month_year: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_requests_made?: number | null
          created_at?: string | null
          custom_prompts_used?: number | null
          export_operations?: number | null
          features_accessed?: Json | null
          file_uploads?: number | null
          id?: string
          last_reset_at?: string | null
          loops_created?: number | null
          month_year?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_vocabulary_deck: {
        Row: {
          antonyms: Json | null
          context: string | null
          created_at: string | null
          definition: string
          definition_vi: string | null
          difficulty: string
          ease_factor: number | null
          example: string | null
          frequency: number | null
          id: string
          interval_days: number | null
          is_starred: boolean
          item_type: string
          last_practiced_at: string | null
          learning_status: string
          next_review_date: string | null
          part_of_speech: string | null
          phrase_type: string | null
          pronunciation: string | null
          repetitions: number | null
          source_loop_id: string | null
          synonyms: Json | null
          text: string
          times_correct: number | null
          times_incorrect: number | null
          times_practiced: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          antonyms?: Json | null
          context?: string | null
          created_at?: string | null
          definition: string
          definition_vi?: string | null
          difficulty: string
          ease_factor?: number | null
          example?: string | null
          frequency?: number | null
          id?: string
          interval_days?: number | null
          is_starred?: boolean
          item_type: string
          last_practiced_at?: string | null
          learning_status?: string
          next_review_date?: string | null
          part_of_speech?: string | null
          phrase_type?: string | null
          pronunciation?: string | null
          repetitions?: number | null
          source_loop_id?: string | null
          synonyms?: Json | null
          text: string
          times_correct?: number | null
          times_incorrect?: number | null
          times_practiced?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          antonyms?: Json | null
          context?: string | null
          created_at?: string | null
          definition?: string
          definition_vi?: string | null
          difficulty?: string
          ease_factor?: number | null
          example?: string | null
          frequency?: number | null
          id?: string
          interval_days?: number | null
          is_starred?: boolean
          item_type?: string
          last_practiced_at?: string | null
          learning_status?: string
          next_review_date?: string | null
          part_of_speech?: string | null
          phrase_type?: string | null
          pronunciation?: string | null
          repetitions?: number | null
          source_loop_id?: string | null
          synonyms?: Json | null
          text?: string
          times_correct?: number | null
          times_incorrect?: number | null
          times_practiced?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_vocabulary_reviews: {
        Row: {
          correct_answer: string | null
          id: string
          is_correct: boolean
          new_ease_factor: number | null
          new_interval_days: number | null
          new_next_review_date: string | null
          response_time_ms: number | null
          review_type: string
          reviewed_at: string | null
          user_id: string | null
          user_response: string | null
          vocabulary_id: string | null
        }
        Insert: {
          correct_answer?: string | null
          id?: string
          is_correct: boolean
          new_ease_factor?: number | null
          new_interval_days?: number | null
          new_next_review_date?: string | null
          response_time_ms?: number | null
          review_type: string
          reviewed_at?: string | null
          user_id?: string | null
          user_response?: string | null
          vocabulary_id?: string | null
        }
        Update: {
          correct_answer?: string | null
          id?: string
          is_correct?: boolean
          new_ease_factor?: number | null
          new_interval_days?: number | null
          new_next_review_date?: string | null
          response_time_ms?: number | null
          review_type?: string
          reviewed_at?: string | null
          user_id?: string | null
          user_response?: string | null
          vocabulary_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_vocabulary_reviews_vocabulary_id_fkey"
            columns: ["vocabulary_id"]
            isOneToOne: false
            referencedRelation: "user_vocabulary_deck"
            referencedColumns: ["id"]
          },
        ]
      }
      vocabulary_analysis: {
        Row: {
          created_at: string | null
          difficulty_level: string | null
          id: string
          loop_id: string
          metadata: Json | null
          phrases: Json | null
          suggested_focus_words: Json | null
          total_words: number | null
          unique_words: number | null
          updated_at: string | null
          user_id: string | null
          words: Json | null
        }
        Insert: {
          created_at?: string | null
          difficulty_level?: string | null
          id?: string
          loop_id: string
          metadata?: Json | null
          phrases?: Json | null
          suggested_focus_words?: Json | null
          total_words?: number | null
          unique_words?: number | null
          updated_at?: string | null
          user_id?: string | null
          words?: Json | null
        }
        Update: {
          created_at?: string | null
          difficulty_level?: string | null
          id?: string
          loop_id?: string
          metadata?: Json | null
          phrases?: Json | null
          suggested_focus_words?: Json | null
          total_words?: number | null
          unique_words?: number | null
          updated_at?: string | null
          user_id?: string | null
          words?: Json | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_user_streak: {
        Args: { user_uuid: string }
        Returns: number
      }
      check_feature_access: {
        Args: { feature_id: string }
        Returns: Json
      }
      cleanup_expired_notifications: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_expired_question_sets: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_usage_data: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      generate_group_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_invitation_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_subscription_summary: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      increment_usage: {
        Args: {
          current_month?: string
          feature_id: string
          usage_amount?: number
        }
        Returns: Json
      }
      increment_user_stat: {
        Args: { p_field: string; p_increment: number; p_user_id: string }
        Returns: undefined
      }
      upsert_contextual_learning_data: {
        Args: {
          p_collocations: Json
          p_examples: Json
          p_loop_id: string
          p_metadata: Json
          p_user_id: string
          p_vocabulary_id: string
          p_vocabulary_text: string
        }
        Returns: string
      }
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
