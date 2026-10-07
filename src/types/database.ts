// Generado desde Supabase (generate_typescript_types). No editar a mano:
// regenerar después de cada migración.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      alert_reviews: {
        Row: { alert_key: string; reviewed_at: string; student_id: string; teacher_id: string }
        Insert: { alert_key: string; reviewed_at?: string; student_id: string; teacher_id: string }
        Update: { alert_key?: string; reviewed_at?: string; student_id?: string; teacher_id?: string }
        Relationships: [
          { foreignKeyName: "alert_reviews_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "student_profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "alert_reviews_teacher_id_fkey"; columns: ["teacher_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      calendar_events: {
        Row: { created_at: string; description: string | null; end_at: string | null; id: string; start_at: string; student_id: string | null; teacher_id: string; title: string; type: string }
        Insert: { created_at?: string; description?: string | null; end_at?: string | null; id?: string; start_at: string; student_id?: string | null; teacher_id: string; title: string; type: string }
        Update: { created_at?: string; description?: string | null; end_at?: string | null; id?: string; start_at?: string; student_id?: string | null; teacher_id?: string; title?: string; type?: string }
        Relationships: [
          { foreignKeyName: "calendar_events_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "student_profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "calendar_events_teacher_id_fkey"; columns: ["teacher_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      checkins: {
        Row: { created_at: string; energy: number; id: string; motivation: number; notes: string | null; pain: number; sleep: number; stress: number; student_id: string; week_start: string; workouts_done: number | null; workouts_planned: number | null }
        Insert: { created_at?: string; energy: number; id?: string; motivation: number; notes?: string | null; pain: number; sleep: number; stress: number; student_id: string; week_start: string; workouts_done?: number | null; workouts_planned?: number | null }
        Update: { created_at?: string; energy?: number; id?: string; motivation?: number; notes?: string | null; pain?: number; sleep?: number; stress?: number; student_id?: string; week_start?: string; workouts_done?: number | null; workouts_planned?: number | null }
        Relationships: [
          { foreignKeyName: "checkins_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "student_profiles"; referencedColumns: ["id"] },
        ]
      }
      exercises: {
        Row: { created_at: string; equipment: string | null; id: string; instructions: string | null; muscle_group: string; name: string; teacher_id: string | null; video_url: string | null }
        Insert: { created_at?: string; equipment?: string | null; id?: string; instructions?: string | null; muscle_group: string; name: string; teacher_id?: string | null; video_url?: string | null }
        Update: { created_at?: string; equipment?: string | null; id?: string; instructions?: string | null; muscle_group?: string; name?: string; teacher_id?: string | null; video_url?: string | null }
        Relationships: [
          { foreignKeyName: "exercises_teacher_id_fkey"; columns: ["teacher_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      invitations: {
        Row: { accepted_at: string | null; created_at: string; email: string; expires_at: string; id: string; status: string; student_id: string; teacher_id: string; token_hash: string }
        Insert: { accepted_at?: string | null; created_at?: string; email: string; expires_at?: string; id?: string; status?: string; student_id: string; teacher_id: string; token_hash: string }
        Update: { accepted_at?: string | null; created_at?: string; email?: string; expires_at?: string; id?: string; status?: string; student_id?: string; teacher_id?: string; token_hash?: string }
        Relationships: [
          { foreignKeyName: "invitations_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "student_profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "invitations_teacher_id_fkey"; columns: ["teacher_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      measurements: {
        Row: { arm: number | null; body_fat: number | null; chest: number | null; created_at: string; created_by: string | null; date: string; hips: number | null; id: string; muscle_mass: number | null; notes: string | null; student_id: string; thigh: number | null; waist: number | null; weight: number | null }
        Insert: { arm?: number | null; body_fat?: number | null; chest?: number | null; created_at?: string; created_by?: string | null; date?: string; hips?: number | null; id?: string; muscle_mass?: number | null; notes?: string | null; student_id: string; thigh?: number | null; waist?: number | null; weight?: number | null }
        Update: { arm?: number | null; body_fat?: number | null; chest?: number | null; created_at?: string; created_by?: string | null; date?: string; hips?: number | null; id?: string; muscle_mass?: number | null; notes?: string | null; student_id?: string; thigh?: number | null; waist?: number | null; weight?: number | null }
        Relationships: [
          { foreignKeyName: "measurements_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "measurements_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "student_profiles"; referencedColumns: ["id"] },
        ]
      }
      messages: {
        Row: { content: string; created_at: string; id: string; read_at: string | null; receiver_id: string; sender_id: string }
        Insert: { content: string; created_at?: string; id?: string; read_at?: string | null; receiver_id: string; sender_id: string }
        Update: { content?: string; created_at?: string; id?: string; read_at?: string | null; receiver_id?: string; sender_id?: string }
        Relationships: [
          { foreignKeyName: "messages_receiver_id_fkey"; columns: ["receiver_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "messages_sender_id_fkey"; columns: ["sender_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      notes: {
        Row: { content: string; created_at: string; id: string; student_id: string; teacher_id: string }
        Insert: { content: string; created_at?: string; id?: string; student_id: string; teacher_id: string }
        Update: { content?: string; created_at?: string; id?: string; student_id?: string; teacher_id?: string }
        Relationships: [
          { foreignKeyName: "notes_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "student_profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "notes_teacher_id_fkey"; columns: ["teacher_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      profiles: {
        Row: { avatar_url: string | null; created_at: string; email: string; first_name: string; id: string; last_name: string; role: string; updated_at: string }
        Insert: { avatar_url?: string | null; created_at?: string; email: string; first_name?: string; id: string; last_name?: string; role: string; updated_at?: string }
        Update: { avatar_url?: string | null; created_at?: string; email?: string; first_name?: string; id?: string; last_name?: string; role?: string; updated_at?: string }
        Relationships: []
      }
      progress_photos: {
        Row: { back_path: string | null; created_at: string; date: string; front_path: string | null; id: string; side_path: string | null; student_id: string }
        Insert: { back_path?: string | null; created_at?: string; date?: string; front_path?: string | null; id?: string; side_path?: string | null; student_id: string }
        Update: { back_path?: string | null; created_at?: string; date?: string; front_path?: string | null; id?: string; side_path?: string | null; student_id?: string }
        Relationships: [
          { foreignKeyName: "progress_photos_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "student_profiles"; referencedColumns: ["id"] },
        ]
      }
      routine_days: {
        Row: { id: string; name: string; position: number; routine_id: string }
        Insert: { id?: string; name: string; position?: number; routine_id: string }
        Update: { id?: string; name?: string; position?: number; routine_id?: string }
        Relationships: [
          { foreignKeyName: "routine_days_routine_id_fkey"; columns: ["routine_id"]; isOneToOne: false; referencedRelation: "routines"; referencedColumns: ["id"] },
        ]
      }
      routine_exercises: {
        Row: { exercise_id: string; id: string; notes: string | null; position: number; progression: string | null; reps: string; rest_seconds: number | null; routine_day_id: string; rpe_target: number | null; sets: number; superset_group: string | null; weight_kg: number | null }
        Insert: { exercise_id: string; id?: string; notes?: string | null; position?: number; progression?: string | null; reps?: string; rest_seconds?: number | null; routine_day_id: string; rpe_target?: number | null; sets?: number; superset_group?: string | null; weight_kg?: number | null }
        Update: { exercise_id?: string; id?: string; notes?: string | null; position?: number; progression?: string | null; reps?: string; rest_seconds?: number | null; routine_day_id?: string; rpe_target?: number | null; sets?: number; superset_group?: string | null; weight_kg?: number | null }
        Relationships: [
          { foreignKeyName: "routine_exercises_exercise_id_fkey"; columns: ["exercise_id"]; isOneToOne: false; referencedRelation: "exercises"; referencedColumns: ["id"] },
          { foreignKeyName: "routine_exercises_routine_day_id_fkey"; columns: ["routine_day_id"]; isOneToOne: false; referencedRelation: "routine_days"; referencedColumns: ["id"] },
        ]
      }
      routines: {
        Row: { created_at: string; description: string | null; duration_weeks: number | null; id: string; name: string; student_note: string | null; teacher_id: string; updated_at: string }
        Insert: { created_at?: string; description?: string | null; duration_weeks?: number | null; id?: string; name: string; student_note?: string | null; teacher_id: string; updated_at?: string }
        Update: { created_at?: string; description?: string | null; duration_weeks?: number | null; id?: string; name?: string; student_note?: string | null; teacher_id?: string; updated_at?: string }
        Relationships: [
          { foreignKeyName: "routines_teacher_id_fkey"; columns: ["teacher_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      student_profiles: {
        Row: { birth_date: string | null; created_at: string; email: string; first_name: string; goal: string | null; height_cm: number | null; id: string; initial_weight: number | null; last_name: string; level: string | null; notes: string | null; phone: string | null; status: string; updated_at: string; user_id: string | null }
        Insert: { birth_date?: string | null; created_at?: string; email: string; first_name: string; goal?: string | null; height_cm?: number | null; id?: string; initial_weight?: number | null; last_name?: string; level?: string | null; notes?: string | null; phone?: string | null; status?: string; updated_at?: string; user_id?: string | null }
        Update: { birth_date?: string | null; created_at?: string; email?: string; first_name?: string; goal?: string | null; height_cm?: number | null; id?: string; initial_weight?: number | null; last_name?: string; level?: string | null; notes?: string | null; phone?: string | null; status?: string; updated_at?: string; user_id?: string | null }
        Relationships: [
          { foreignKeyName: "student_profiles_user_id_fkey"; columns: ["user_id"]; isOneToOne: true; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      student_routines: {
        Row: { assigned_at: string; end_date: string | null; id: string; routine_id: string; sessions_per_week: number | null; start_date: string; status: string; student_id: string }
        Insert: { assigned_at?: string; end_date?: string | null; id?: string; routine_id: string; sessions_per_week?: number | null; start_date?: string; status?: string; student_id: string }
        Update: { assigned_at?: string; end_date?: string | null; id?: string; routine_id?: string; sessions_per_week?: number | null; start_date?: string; status?: string; student_id?: string }
        Relationships: [
          { foreignKeyName: "student_routines_routine_id_fkey"; columns: ["routine_id"]; isOneToOne: false; referencedRelation: "routines"; referencedColumns: ["id"] },
          { foreignKeyName: "student_routines_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "student_profiles"; referencedColumns: ["id"] },
        ]
      }
      teacher_profiles: {
        Row: { bio: string | null; created_at: string; onboarding_done: boolean; phone: string | null; specialization: string | null; updated_at: string; user_id: string }
        Insert: { bio?: string | null; created_at?: string; onboarding_done?: boolean; phone?: string | null; specialization?: string | null; updated_at?: string; user_id: string }
        Update: { bio?: string | null; created_at?: string; onboarding_done?: boolean; phone?: string | null; specialization?: string | null; updated_at?: string; user_id?: string }
        Relationships: [
          { foreignKeyName: "teacher_profiles_user_id_fkey"; columns: ["user_id"]; isOneToOne: true; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      teacher_students: {
        Row: { created_at: string; ended_at: string | null; is_primary: boolean; status: string; student_id: string; teacher_id: string }
        Insert: { created_at?: string; ended_at?: string | null; is_primary?: boolean; status?: string; student_id: string; teacher_id: string }
        Update: { created_at?: string; ended_at?: string | null; is_primary?: boolean; status?: string; student_id?: string; teacher_id?: string }
        Relationships: [
          { foreignKeyName: "teacher_students_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "student_profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "teacher_students_teacher_id_fkey"; columns: ["teacher_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      workout_sets: {
        Row: { completed: boolean; exercise_id: string; id: string; notes: string | null; reps: number | null; routine_exercise_id: string | null; rpe: number | null; set_number: number; weight_kg: number | null; workout_id: string }
        Insert: { completed?: boolean; exercise_id: string; id?: string; notes?: string | null; reps?: number | null; routine_exercise_id?: string | null; rpe?: number | null; set_number: number; weight_kg?: number | null; workout_id: string }
        Update: { completed?: boolean; exercise_id?: string; id?: string; notes?: string | null; reps?: number | null; routine_exercise_id?: string | null; rpe?: number | null; set_number?: number; weight_kg?: number | null; workout_id?: string }
        Relationships: [
          { foreignKeyName: "workout_sets_exercise_id_fkey"; columns: ["exercise_id"]; isOneToOne: false; referencedRelation: "exercises"; referencedColumns: ["id"] },
          { foreignKeyName: "workout_sets_routine_exercise_id_fkey"; columns: ["routine_exercise_id"]; isOneToOne: false; referencedRelation: "routine_exercises"; referencedColumns: ["id"] },
          { foreignKeyName: "workout_sets_workout_id_fkey"; columns: ["workout_id"]; isOneToOne: false; referencedRelation: "workouts"; referencedColumns: ["id"] },
        ]
      }
      workouts: {
        Row: { completed_at: string | null; id: string; notes: string | null; routine_day_id: string | null; routine_id: string | null; started_at: string; student_id: string }
        Insert: { completed_at?: string | null; id?: string; notes?: string | null; routine_day_id?: string | null; routine_id?: string | null; started_at?: string; student_id: string }
        Update: { completed_at?: string | null; id?: string; notes?: string | null; routine_day_id?: string | null; routine_id?: string | null; started_at?: string; student_id?: string }
        Relationships: [
          { foreignKeyName: "workouts_routine_day_id_fkey"; columns: ["routine_day_id"]; isOneToOne: false; referencedRelation: "routine_days"; referencedColumns: ["id"] },
          { foreignKeyName: "workouts_routine_id_fkey"; columns: ["routine_id"]; isOneToOne: false; referencedRelation: "routines"; referencedColumns: ["id"] },
          { foreignKeyName: "workouts_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "student_profiles"; referencedColumns: ["id"] },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_routine: {
        Args: { p_routine_id: string; p_sessions_per_week?: number; p_start_date?: string; p_student_id: string }
        Returns: string
      }
      create_invitation: { Args: { p_student_id: string }; Returns: string }
      create_student: {
        Args: {
          p_birth_date?: string
          p_email: string
          p_first_name: string
          p_goal?: string
          p_height_cm?: number
          p_initial_weight?: number
          p_last_name: string
          p_level?: string
          p_notes?: string
          p_phone?: string
        }
        Returns: string
      }
      delete_my_account: { Args: never; Returns: undefined }
      duplicate_routine: { Args: { p_routine_id: string }; Returns: string }
      get_invitation: {
        Args: { p_token: string }
        Returns: { email: string; student_first_name: string; teacher_name: string }[]
      }
      mark_thread_read: { Args: { p_other: string }; Returns: undefined }
      message_threads: {
        Args: never
        Returns: {
          other_id: string
          first_name: string
          last_name: string
          role: string
          last_content: string | null
          last_at: string | null
          last_from_me: boolean | null
          unread: number
        }[]
      }
      save_routine: { Args: { p: Json }; Returns: string }
      student_exercise_series: {
        Args: { p_student: string; p_exercise: string; p_from: string }
        Returns: { day: string; best_kg: number }[]
      }
      student_weekly_stats: {
        Args: { p_student: string; p_from: string }
        Returns: { week_start: string; sessions: number; volume: number }[]
      }
      student_summaries: {
        Args: { p_student?: string }
        Returns: {
          id: string
          user_id: string | null
          first_name: string
          last_name: string
          email: string
          goal: string | null
          level: string | null
          birth_date: string | null
          status: string
          created_at: string
          workout_dates: string[]
          last_workout_at: string | null
          routine: Json | null
          weights: Json
          last_measured_on: string | null
          last_checkin: Json | null
          lifts: Json
          reviewed: Json
        }[]
      }
      unlink_student: { Args: { p_student_id: string }; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database["public"]

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"]
