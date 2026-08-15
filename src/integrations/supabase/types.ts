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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      badges: {
        Row: {
          badge_url: string
          generated_at: string
          id: string
          participant_id: string
          qr_payload: string
          sent_email: boolean
          sent_whatsapp: boolean
        }
        Insert: {
          badge_url: string
          generated_at?: string
          id?: string
          participant_id: string
          qr_payload: string
          sent_email?: boolean
          sent_whatsapp?: boolean
        }
        Update: {
          badge_url?: string
          generated_at?: string
          id?: string
          participant_id?: string
          qr_payload?: string
          sent_email?: boolean
          sent_whatsapp?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "badges_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: true
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      checkins: {
        Row: {
          created_at: string
          id: string
          participant_id: string
          scanned_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          participant_id: string
          scanned_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          participant_id?: string
          scanned_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checkins_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      delegations: {
        Row: {
          created_at: string
          email: string | null
          event_id: string
          id: string
          phone: string | null
          primary_contact_name: string
          source: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          event_id: string
          id?: string
          phone?: string | null
          primary_contact_name: string
          source?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          event_id?: string
          id?: string
          phone?: string | null
          primary_contact_name?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "delegations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          branding: Json
          created_at: string
          end_date: string
          id: string
          location: string
          name: string
          slug: string
          start_date: string
          status: string
        }
        Insert: {
          branding?: Json
          created_at?: string
          end_date: string
          id?: string
          location: string
          name: string
          slug: string
          start_date: string
          status?: string
        }
        Update: {
          branding?: Json
          created_at?: string
          end_date?: string
          id?: string
          location?: string
          name?: string
          slug?: string
          start_date?: string
          status?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          event_id: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          event_id: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          event_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_subscribers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          created_at: string
          description: string
          event_id: string
          id: string
          included_badges: number
          is_public: boolean
          kicker: string
          name: string
          perks: string[]
          price: number
          profile_type_id: string
          sort_order: number
          unit_label: string
        }
        Insert: {
          created_at?: string
          description?: string
          event_id: string
          id?: string
          included_badges?: number
          is_public?: boolean
          kicker: string
          name: string
          perks?: string[]
          price: number
          profile_type_id: string
          sort_order?: number
          unit_label?: string
        }
        Update: {
          created_at?: string
          description?: string
          event_id?: string
          id?: string
          included_badges?: number
          is_public?: boolean
          kicker?: string
          name?: string
          perks?: string[]
          price?: number
          profile_type_id?: string
          sort_order?: number
          unit_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_profile_type_id_fkey"
            columns: ["profile_type_id"]
            isOneToOne: false
            referencedRelation: "profile_types"
            referencedColumns: ["id"]
          },
        ]
      }
      participants: {
        Row: {
          badge_quantity: number
          city: string | null
          company: string | null
          country: string | null
          created_at: string
          delegation_id: string | null
          email: string
          event_id: string
          full_name: string
          function: string | null
          id: string
          offer_id: string | null
          phone: string | null
          profile_type_id: string | null
          registration_id: string | null
          sector: string | null
          status: string
        }
        Insert: {
          badge_quantity?: number
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          delegation_id?: string | null
          email: string
          event_id: string
          full_name: string
          function?: string | null
          id?: string
          offer_id?: string | null
          phone?: string | null
          profile_type_id?: string | null
          registration_id?: string | null
          sector?: string | null
          status?: string
        }
        Update: {
          badge_quantity?: number
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          delegation_id?: string | null
          email?: string
          event_id?: string
          full_name?: string
          function?: string | null
          id?: string
          offer_id?: string | null
          phone?: string | null
          profile_type_id?: string | null
          registration_id?: string | null
          sector?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "participants_delegation_id_fkey"
            columns: ["delegation_id"]
            isOneToOne: false
            referencedRelation: "delegations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participants_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participants_profile_type_id_fkey"
            columns: ["profile_type_id"]
            isOneToOne: false
            referencedRelation: "profile_types"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          checkout_url: string | null
          created_at: string
          id: string
          participant_id: string
          provider: string
          provider_session_id: string | null
          provider_transaction_id: string | null
          status: string
          webhook_payload: Json | null
        }
        Insert: {
          amount: number
          checkout_url?: string | null
          created_at?: string
          id?: string
          participant_id: string
          provider: string
          provider_session_id?: string | null
          provider_transaction_id?: string | null
          status?: string
          webhook_payload?: Json | null
        }
        Update: {
          amount?: number
          checkout_url?: string | null
          created_at?: string
          id?: string
          participant_id?: string
          provider?: string
          provider_session_id?: string | null
          provider_transaction_id?: string | null
          status?: string
          webhook_payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_types: {
        Row: {
          badge_prefix: string | null
          color_code: string
          created_at: string
          event_id: string
          id: string
          ink_color: string
          is_public: boolean
          label: string
          price: number | null
          requires_payment: boolean
          sort_order: number
          zone_label: string | null
        }
        Insert: {
          badge_prefix?: string | null
          color_code?: string
          created_at?: string
          event_id: string
          id?: string
          ink_color?: string
          is_public?: boolean
          label: string
          price?: number | null
          requires_payment?: boolean
          sort_order?: number
          zone_label?: string | null
        }
        Update: {
          badge_prefix?: string | null
          color_code?: string
          created_at?: string
          event_id?: string
          id?: string
          ink_color?: string
          is_public?: boolean
          label?: string
          price?: number | null
          requires_payment?: boolean
          sort_order?: number
          zone_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_profiles: {
        Row: {
          approved: boolean
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          user_id: string
        }
        Insert: {
          approved?: boolean
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          user_id: string
        }
        Update: {
          approved?: boolean
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ensure_staff_profile: { Args: never; Returns: undefined }
      find_registrations_by_email: {
        Args: { p_email: string; p_event_id: string }
        Returns: {
          full_name: string
          registration_id: string
          status: string
        }[]
      }
      get_registration: {
        Args: { p_registration_id: string }
        Returns: {
          badge_prefix: string
          badge_url: string
          city: string
          company: string
          country: string
          full_name: string
          function: string
          offer_name: string
          payment_status: string
          profile_color: string
          profile_ink: string
          profile_label: string
          qr_payload: string
          registration_id: string
          status: string
          zone_label: string
        }[]
      }
      is_approved_staff: { Args: { _user_id: string }; Returns: boolean }
      list_delegation_names: {
        Args: { p_event_id: string }
        Returns: {
          id: string
          primary_contact_name: string
        }[]
      }
      register_participant: {
        Args: {
          p_badge_quantity?: number
          p_city: string
          p_company: string
          p_country: string
          p_delegation_id: string
          p_email: string
          p_event_id: string
          p_full_name: string
          p_function: string
          p_offer_id: string
          p_phone: string
          p_profile_type_id: string
          p_sector: string
          p_status: string
        }
        Returns: {
          id: string
          registration_id: string
        }[]
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
