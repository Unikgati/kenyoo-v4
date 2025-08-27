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
      products: {
        Row: {
          id: string
          name: string
          price: number
          commission: number
          imageUrl: string
          status: 'active' | 'inactive'
        }
        Insert: {
          id?: string
          name: string
          price: number
          commission: number
          imageUrl: string
          status: 'active' | 'inactive'
        }
        Update: {
          id?: string
          name?: string
          price?: number
          commission?: number
          imageUrl?: string
          status?: 'active' | 'inactive'
        }
        Relationships: []
      }
      drivers: {
        Row: {
            id: string
            name: string
            type: "Dedicated" | "Mitra"
            location: string | null
            contact: string
            status: 'active' | 'inactive'
            userId: string
        }
        Insert: {
            id?: string
            name: string
            type: "Dedicated" | "Mitra"
            location?: string | null
            contact: string
            status: 'active' | 'inactive'
            userId: string
        }
        Update: {
            id?: string
            name?: string
            type?: "Dedicated" | "Mitra"
            location?: string | null
            contact?: string
            status?: 'active' | 'inactive'
            userId?: string
        }
        Relationships: []
      }
      sales: {
          Row: {
            id: string
            driverId: string
            driverName: string
            productId: string
            productName: string
            quantity: number
            total: number
            timestamp: string
            location: string
            paymentMethod: 'cash' | 'qris'
          }
          Insert: {
            id?: string
            driverId: string
            driverName: string
            productId: string
            productName: string
            quantity: number
            total: number
            timestamp?: string
            location: string
            paymentMethod: 'cash' | 'qris'
          }
          Update: {
            id?: string
            driverId?: string
            driverName?: string
            productId?: string
            productName?: string
            quantity?: number
            total?: number
            timestamp?: string
            location?: string
            paymentMethod?: 'cash' | 'qris'
          }
          Relationships: []
      }
      locations: {
          Row: {
            id: string
            name: string
            category: "Daily Rotation" | "Special/Event"
          }
          Insert: {
            id?: string
            name: string
            category: "Daily Rotation" | "Special/Event"
          }
          Update: {
            id?: string
            name?: string
            category?: "Daily Rotation" | "Special/Event"
          }
          Relationships: []
      }
      schedule: {
          Row: {
            id: string
            driverId: string
            driverName: string
            date: string
            locationId: string
            locationName: string
          }
          Insert: {
            id?: string
            driverId: string
            driverName: string
            date: string
            locationId: string
            locationName: string
          }
          Update: {
            id?: string
            driverId?: string
            driverName?: string
            date?: string
            locationId?: string
            locationName?: string
          }
          Relationships: []
      }
      payments: {
          Row: {
            id: string
            driverId: string
            period: string
            amount: number
            timestamp: string
          }
          Insert: {
            id?: string
            driverId: string
            period: string
            amount: number
            timestamp?: string
          }
          Update: {
            id?: string
            driverId?: string
            period?: string
            amount?: number
            timestamp?: string
          }
          Relationships: []
      }
      settings: {
        Row: {
          id: string
          name: string
          logoUrl: string
          faviconUrl: string
          icon192Url: string | null
          icon512Url: string | null
          theme: Json
          currency: string
          showDriverCommission: boolean
          showDriverItemsSold: boolean
          showDriverSchedule: boolean
        }
        Insert: {
          id?: string
          name: string
          logoUrl: string
          faviconUrl: string
          icon192Url?: string | null
          icon512Url?: string | null
          theme: Json
          currency: string
          showDriverCommission: boolean
          showDriverItemsSold: boolean
          showDriverSchedule: boolean
        }
        Update: {
          id?: string
          name?: string
          logoUrl?: string
          faviconUrl?: string
          icon192Url?: string | null
          icon512Url?: string | null
          theme?: Json
          currency?: string
          showDriverCommission?: boolean
          showDriverItemsSold?: boolean
          showDriverSchedule?: boolean
        }
        Relationships: []
      }
      driver_daily_setup: {
        Row: {
          id: string
          driver_id: string
          driver_name: string
          date: string
          coconuts_carried: number
          change_amount: number
          created_at: string
        }
        Insert: {
          id?: string
          driver_id: string
          driver_name: string
          date: string
          coconuts_carried: number
          change_amount: number
          created_at?: string
        }
        Update: {
          id?: string
          driver_id?: string
          driver_name?: string
          date?: string
          coconuts_carried?: number
          change_amount?: number
          created_at?: string
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

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
      Database["public"]["Views"])
  ? (Database["public"]["Tables"] &
      Database["public"]["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
  ? Database["public"]["Enums"][PublicEnumNameOrOptions]
  : never
