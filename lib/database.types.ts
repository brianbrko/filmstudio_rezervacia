export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          full_name: string
          phone: string | null
          role: 'customer' | 'admin'
          created_at: string
        }
        Insert: {
          id: string
          full_name: string
          phone?: string | null
          role: 'customer' | 'admin'
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          phone?: string | null
          role?: 'customer' | 'admin'
          created_at?: string
        }
      }
      employees: {
        Row: {
          id: string
          name: string
          position: string | null
          avatar_url: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          position?: string | null
          avatar_url?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          position?: string | null
          avatar_url?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      services: {
        Row: {
          id: string
          name: string
          description: string | null
          price: number
          duration_minutes: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          price: number
          duration_minutes: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          price?: number
          duration_minutes?: number
          created_at?: string
        }
      }
      reservations: {
        Row: {
          id: string
          user_id: string | null
          employee_id: string
          service_id: string
          reservation_date: string
          reservation_time: string
          status: 'pending' | 'confirmed' | 'cancelled'
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          employee_id: string
          service_id: string
          reservation_date: string
          reservation_time: string
          status?: 'pending' | 'confirmed' | 'cancelled'
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          employee_id?: string
          service_id?: string
          reservation_date?: string
          reservation_time?: string
          status?: 'pending' | 'confirmed' | 'cancelled'
          notes?: string | null
          created_at?: string
        }
      }
      working_hours: {
        Row: {
          id: string
          day_of_week: number
          start_time: string
          end_time: string
          is_open: boolean
          created_at: string
        }
        Insert: {
          id?: string
          day_of_week: number
          start_time: string
          end_time: string
          is_open?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          day_of_week?: number
          start_time?: string
          end_time?: string
          is_open?: boolean
          created_at?: string
        }
      }
    }
  }
}
