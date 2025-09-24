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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      channel: {
        Row: {
          api_credentials: string | null
          api_endpoint: string
          country_code: Database["public"]["Enums"]["countries"]
          created_at: string
          id: number
          locales: Database["public"]["Enums"]["countries"][] | null
          name: string | null
          type: Database["public"]["Enums"]["channel_type"]
        }
        Insert: {
          api_credentials?: string | null
          api_endpoint: string
          country_code: Database["public"]["Enums"]["countries"]
          created_at?: string
          id?: number
          locales?: Database["public"]["Enums"]["countries"][] | null
          name?: string | null
          type: Database["public"]["Enums"]["channel_type"]
        }
        Update: {
          api_credentials?: string | null
          api_endpoint?: string
          country_code?: Database["public"]["Enums"]["countries"]
          created_at?: string
          id?: number
          locales?: Database["public"]["Enums"]["countries"][] | null
          name?: string | null
          type?: Database["public"]["Enums"]["channel_type"]
        }
        Relationships: []
      }
      content: {
        Row: {
          content: string | null
          created_at: string
          description: string | null
          id: number
          locale: Database["public"]["Enums"]["countries"] | null
          product_id: number | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          description?: string | null
          id?: number
          locale?: Database["public"]["Enums"]["countries"] | null
          product_id?: number | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          description?: string | null
          id?: number
          locale?: Database["public"]["Enums"]["countries"] | null
          product_id?: number | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product"
            referencedColumns: ["id"]
          },
        ]
      }
      price: {
        Row: {
          country_code: string | null
          created_at: string
          ean_reference: string | null
          id: number
          price: number | null
          updated_at: string | null
        }
        Insert: {
          country_code?: string | null
          created_at?: string
          ean_reference?: string | null
          id?: number
          price?: number | null
          updated_at?: string | null
        }
        Update: {
          country_code?: string | null
          created_at?: string
          ean_reference?: string | null
          id?: number
          price?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      product: {
        Row: {
          active_channel_ids: number[] | null
          brand: string | null
          created_at: string
          gaslooswonen_id: number | null
          id: number
          title: string | null
          updated_at: string
        }
        Insert: {
          active_channel_ids?: number[] | null
          brand?: string | null
          created_at?: string
          gaslooswonen_id?: number | null
          id?: number
          title?: string | null
          updated_at?: string
        }
        Update: {
          active_channel_ids?: number[] | null
          brand?: string | null
          created_at?: string
          gaslooswonen_id?: number | null
          id?: number
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      product_image: {
        Row: {
          created_at: string
          id: number
          position: number
          product_id: number
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: number
          position: number
          product_id: number
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          id?: number
          position?: number
          product_id?: number
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_image_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product"
            referencedColumns: ["id"]
          },
        ]
      }
      repricer: {
        Row: {
          created_at: string
          ean_reference: string | null
          id: number
          is_active: boolean | null
          minimum_price: number | null
          urls: Json | null
        }
        Insert: {
          created_at?: string
          ean_reference?: string | null
          id?: number
          is_active?: boolean | null
          minimum_price?: number | null
          urls?: Json | null
        }
        Update: {
          created_at?: string
          ean_reference?: string | null
          id?: number
          is_active?: boolean | null
          minimum_price?: number | null
          urls?: Json | null
        }
        Relationships: []
      }
      todo_list: {
        Row: {
          created_at: string
          description: string | null
          done: boolean
          done_at: string | null
          id: number
          owner: string
          title: string
          urgent: boolean
        }
        Insert: {
          created_at?: string
          description?: string | null
          done?: boolean
          done_at?: string | null
          id?: number
          owner: string
          title: string
          urgent?: boolean
        }
        Update: {
          created_at?: string
          description?: string | null
          done?: boolean
          done_at?: string | null
          id?: number
          owner?: string
          title?: string
          urgent?: boolean
        }
        Relationships: []
      }
      variant: {
        Row: {
          buyprice: number | null
          created_at: string
          ean: string | null
          id: number
          picqer_idproduct: number | null
          position: number | null
          product_id: number | null
          title: string | null
          updated_at: string
        }
        Insert: {
          buyprice?: number | null
          created_at?: string
          ean?: string | null
          id?: number
          picqer_idproduct?: number | null
          position?: number | null
          product_id?: number | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          buyprice?: number | null
          created_at?: string
          ean?: string | null
          id?: number
          picqer_idproduct?: number | null
          position?: number | null
          product_id?: number | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "variant_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product"
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
      channel_type: "lightspeed" | "woocommerce" | "channable"
      countries: "NL" | "BE" | "DE" | "FR" | "ES"
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
    Enums: {
      channel_type: ["lightspeed", "woocommerce", "channable"],
      countries: ["NL", "BE", "DE", "FR", "ES"],
    },
  },
} as const
