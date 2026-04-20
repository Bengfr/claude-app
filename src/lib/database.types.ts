// Hand-written types matching supabase/migrations/0001_init.sql.
// Regenerate with `supabase gen types typescript --local` once preferred.

export type Database = {
  public: {
    Tables: {
      profile: {
        Row: {
          id: string
          name: string
          age: number | null
          weight_kg: number | null
          height_cm: number | null
          target_calories: number
          target_protein_g: number
          target_carbs_g: number
          target_fat_g: number
          created_at: string
          avatar_url: string | null
        }
        Insert: {
          id: string
          name: string
          age?: number | null
          weight_kg?: number | null
          height_cm?: number | null
          target_calories: number
          target_protein_g: number
          target_carbs_g: number
          target_fat_g: number
          created_at?: string
          avatar_url?: string | null
        }
        Update: {
          id?: string
          name?: string
          age?: number | null
          weight_kg?: number | null
          height_cm?: number | null
          target_calories?: number
          target_protein_g?: number
          target_carbs_g?: number
          target_fat_g?: number
          avatar_url?: string | null
        }
        Relationships: []
      }
      food_log: {
        Row: {
          id: number
          user_id: string
          logged_at: string
          item_name: string | null
          calories: number
          protein_g: number
          carbs_g: number
          fat_g: number
          barcode: string | null
          meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
        }
        Insert: {
          id?: number
          user_id: string
          logged_at?: string
          item_name?: string | null
          calories: number
          protein_g: number
          carbs_g: number
          fat_g: number
          barcode?: string | null
          meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack'
        }
        Update: {
          id?: number
          user_id?: string
          logged_at?: string
          item_name?: string | null
          calories?: number
          protein_g?: number
          carbs_g?: number
          fat_g?: number
          barcode?: string | null
          meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack'
        }
        Relationships: []
      }
      exercise: {
        Row: {
          id: number
          name: string
          is_custom: boolean
          owner_id: string | null
        }
        Insert: {
          id?: number
          name: string
          is_custom?: boolean
          owner_id?: string | null
        }
        Update: {
          id?: number
          name?: string
          is_custom?: boolean
          owner_id?: string | null
        }
        Relationships: []
      }
      workout_session: {
        Row: {
          id: number
          user_id: string
          started_at: string
          name: string | null
        }
        Insert: {
          id?: number
          user_id: string
          started_at?: string
          name?: string | null
        }
        Update: {
          id?: number
          user_id?: string
          started_at?: string
          name?: string | null
        }
        Relationships: []
      }
      workout_log: {
        Row: {
          id: number
          session_id: number
          user_id: string
          exercise_id: number
          set_number: number
          reps: number
          weight_kg: number
          logged_at: string
        }
        Insert: {
          id?: number
          session_id: number
          user_id: string
          exercise_id: number
          set_number: number
          reps: number
          weight_kg: number
          logged_at?: string
        }
        Update: {
          id?: number
          session_id?: number
          user_id?: string
          exercise_id?: number
          set_number?: number
          reps?: number
          weight_kg?: number
          logged_at?: string
        }
        Relationships: []
      }
      feed_event: {
        Row: {
          id: number
          user_id: string
          session_id: number | null
          message: string
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          session_id?: number | null
          message: string
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          session_id?: number | null
          message?: string
          created_at?: string
        }
        Relationships: []
      }
      workout_plan: {
        Row: {
          id: number
          user_id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          name: string
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          name?: string
        }
        Relationships: []
      }
      workout_plan_exercise: {
        Row: {
          id: number
          plan_id: number
          exercise_id: number
          sort_order: number
        }
        Insert: {
          id?: number
          plan_id: number
          exercise_id: number
          sort_order?: number
        }
        Update: {
          id?: number
          plan_id?: number
          exercise_id?: number
          sort_order?: number
        }
        Relationships: []
      }
      weight_log: {
        Row: {
          id: number
          user_id: string
          weight_kg: number
          logged_at: string
        }
        Insert: {
          id?: number
          user_id: string
          weight_kg: number
          logged_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          weight_kg?: number
          logged_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
