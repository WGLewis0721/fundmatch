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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_events: {
        Row: {
          actor_id: string | null
          created_at: string
          description: string
          id: string
          investor_id: string | null
          kind: string
          startup_id: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          description: string
          id?: string
          investor_id?: string | null
          kind: string
          startup_id?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          description?: string
          id?: string
          investor_id?: string | null
          kind?: string
          startup_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_events_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_events_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startup_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_metrics: {
        Row: {
          id: string
          label: string
          metric_key: string
          period: string | null
          source_key: string | null
          startup_id: string
          updated_at: string
          value_display: string
          value_numeric: number | null
        }
        Insert: {
          id?: string
          label: string
          metric_key: string
          period?: string | null
          source_key?: string | null
          startup_id: string
          updated_at?: string
          value_display: string
          value_numeric?: number | null
        }
        Update: {
          id?: string
          label?: string
          metric_key?: string
          period?: string | null
          source_key?: string | null
          startup_id?: string
          updated_at?: string
          value_display?: string
          value_numeric?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "company_metrics_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startup_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      data_sources: {
        Row: {
          category: string
          contributes: string[]
          description: string | null
          icon: string | null
          key: string
          name: string
          permissions: string[]
          side: string
        }
        Insert: {
          category: string
          contributes?: string[]
          description?: string | null
          icon?: string | null
          key: string
          name: string
          permissions?: string[]
          side: string
        }
        Update: {
          category?: string
          contributes?: string[]
          description?: string | null
          icon?: string | null
          key?: string
          name?: string
          permissions?: string[]
          side?: string
        }
        Relationships: []
      }
      founder_materials: {
        Row: {
          id: string
          kind: string
          size_label: string | null
          source_key: string | null
          startup_id: string
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          id?: string
          kind: string
          size_label?: string | null
          source_key?: string | null
          startup_id: string
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          id?: string
          kind?: string
          size_label?: string | null
          source_key?: string | null
          startup_id?: string
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "founder_materials_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startup_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          connected_at: string | null
          id: string
          last_sync_at: string | null
          mode: string
          org_id: string | null
          source_key: string
          status: string
        }
        Insert: {
          connected_at?: string | null
          id?: string
          last_sync_at?: string | null
          mode?: string
          org_id?: string | null
          source_key: string
          status?: string
        }
        Update: {
          connected_at?: string | null
          id?: string
          last_sync_at?: string | null
          mode?: string
          org_id?: string | null
          source_key?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "integrations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integrations_source_key_fkey"
            columns: ["source_key"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["key"]
          },
        ]
      }
      intro_requests: {
        Row: {
          created_at: string
          id: string
          investor_id: string | null
          message: string | null
          requester_id: string | null
          startup_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          investor_id?: string | null
          message?: string | null
          requester_id?: string | null
          startup_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          investor_id?: string | null
          message?: string | null
          requester_id?: string | null
          startup_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "intro_requests_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intro_requests_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startup_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      investor_profiles: {
        Row: {
          aum_label: string | null
          created_at: string
          demo_label: string | null
          description: string | null
          firm_name: string
          hq: string | null
          id: string
          is_demo: boolean
          logo_emoji: string | null
          org_id: string | null
        }
        Insert: {
          aum_label?: string | null
          created_at?: string
          demo_label?: string | null
          description?: string | null
          firm_name: string
          hq?: string | null
          id?: string
          is_demo?: boolean
          logo_emoji?: string | null
          org_id?: string | null
        }
        Update: {
          aum_label?: string | null
          created_at?: string
          demo_label?: string | null
          description?: string | null
          firm_name?: string
          hq?: string | null
          id?: string
          is_demo?: boolean
          logo_emoji?: string | null
          org_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "investor_profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      investor_theses: {
        Row: {
          business_models: string[]
          check_max: number | null
          check_min: number | null
          exclusions: string[]
          geographies: string[]
          id: string
          inferred: boolean
          inferred_from: string[]
          investor_id: string
          min_growth_pct: number | null
          sectors: string[]
          stages: string[]
          summary: string | null
          updated_at: string
        }
        Insert: {
          business_models?: string[]
          check_max?: number | null
          check_min?: number | null
          exclusions?: string[]
          geographies?: string[]
          id?: string
          inferred?: boolean
          inferred_from?: string[]
          investor_id: string
          min_growth_pct?: number | null
          sectors?: string[]
          stages?: string[]
          summary?: string | null
          updated_at?: string
        }
        Update: {
          business_models?: string[]
          check_max?: number | null
          check_min?: number | null
          exclusions?: string[]
          geographies?: string[]
          id?: string
          inferred?: boolean
          inferred_from?: string[]
          investor_id?: string
          min_growth_pct?: number | null
          sectors?: string[]
          stages?: string[]
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "investor_theses_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: true
            referencedRelation: "investor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          created_at: string
          explanation: string | null
          generated_by: string
          id: string
          investor_id: string
          rationale: Json
          risks: string[]
          score: number
          startup_id: string
          strengths: string[]
        }
        Insert: {
          created_at?: string
          explanation?: string | null
          generated_by?: string
          id?: string
          investor_id: string
          rationale?: Json
          risks?: string[]
          score: number
          startup_id: string
          strengths?: string[]
        }
        Update: {
          created_at?: string
          explanation?: string | null
          generated_by?: string
          id?: string
          investor_id?: string
          rationale?: Json
          risks?: string[]
          score?: number
          startup_id?: string
          strengths?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "matches_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startup_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          org_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_demo: boolean
          logo_emoji: string | null
          name: string
          type: Database["public"]["Enums"]["org_type"]
          website: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_demo?: boolean
          logo_emoji?: string | null
          name: string
          type: Database["public"]["Enums"]["org_type"]
          website?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_demo?: boolean
          logo_emoji?: string | null
          name?: string
          type?: Database["public"]["Enums"]["org_type"]
          website?: string | null
        }
        Relationships: []
      }
      pipeline_items: {
        Row: {
          created_at: string
          id: string
          investor_id: string | null
          last_note: string | null
          owner_id: string | null
          startup_id: string
          status: Database["public"]["Enums"]["pipeline_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          investor_id?: string | null
          last_note?: string | null
          owner_id?: string | null
          startup_id: string
          status?: Database["public"]["Enums"]["pipeline_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          investor_id?: string | null
          last_note?: string | null
          owner_id?: string | null
          startup_id?: string
          status?: Database["public"]["Enums"]["pipeline_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_items_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_items_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startup_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_org_id: string | null
          avatar_emoji: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          persona: string | null
        }
        Insert: {
          active_org_id?: string | null
          avatar_emoji?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          persona?: string | null
        }
        Update: {
          active_org_id?: string | null
          avatar_emoji?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          persona?: string | null
        }
        Relationships: []
      }
      saved_companies: {
        Row: {
          created_at: string
          id: string
          startup_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          startup_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          startup_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_companies_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startup_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      source_provenance: {
        Row: {
          confidence: number
          field_key: string
          field_label: string
          id: string
          last_updated: string
          source_key: string
          startup_id: string
          value_preview: string | null
        }
        Insert: {
          confidence?: number
          field_key: string
          field_label: string
          id?: string
          last_updated?: string
          source_key: string
          startup_id: string
          value_preview?: string | null
        }
        Update: {
          confidence?: number
          field_key?: string
          field_label?: string
          id?: string
          last_updated?: string
          source_key?: string
          startup_id?: string
          value_preview?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "source_provenance_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startup_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      startup_profiles: {
        Row: {
          ai_summary: string | null
          brand_color: string | null
          business_model: string | null
          created_at: string
          founded_year: number | null
          funding_ask: number | null
          geography: string
          id: string
          is_demo: boolean
          logo_emoji: string | null
          name: string
          org_id: string | null
          sector: string
          stage: string
          story: string | null
          summary: string | null
          tagline: string | null
          tags: string[]
          team_size: number | null
          updated_at: string
          visibility: string
          website: string | null
        }
        Insert: {
          ai_summary?: string | null
          brand_color?: string | null
          business_model?: string | null
          created_at?: string
          founded_year?: number | null
          funding_ask?: number | null
          geography: string
          id?: string
          is_demo?: boolean
          logo_emoji?: string | null
          name: string
          org_id?: string | null
          sector: string
          stage: string
          story?: string | null
          summary?: string | null
          tagline?: string | null
          tags?: string[]
          team_size?: number | null
          updated_at?: string
          visibility?: string
          website?: string | null
        }
        Update: {
          ai_summary?: string | null
          brand_color?: string | null
          business_model?: string | null
          created_at?: string
          founded_year?: number | null
          funding_ask?: number | null
          geography?: string
          id?: string
          is_demo?: boolean
          logo_emoji?: string | null
          name?: string
          org_id?: string | null
          sector?: string
          stage?: string
          story?: string | null
          summary?: string | null
          tagline?: string | null
          tags?: string[]
          team_size?: number | null
          updated_at?: string
          visibility?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "startup_profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      swipes: {
        Row: {
          created_at: string
          decision: Database["public"]["Enums"]["swipe_decision"]
          id: string
          investor_id: string | null
          startup_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          decision: Database["public"]["Enums"]["swipe_decision"]
          id?: string
          investor_id?: string | null
          startup_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          decision?: Database["public"]["Enums"]["swipe_decision"]
          id?: string
          investor_id?: string | null
          startup_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "swipes_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swipes_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startup_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_notes: {
        Row: {
          author_id: string | null
          author_name: string
          body: string
          created_at: string
          id: string
          investor_id: string | null
          likes: number
          startup_id: string
        }
        Insert: {
          author_id?: string | null
          author_name?: string
          body: string
          created_at?: string
          id?: string
          investor_id?: string | null
          likes?: number
          startup_id: string
        }
        Update: {
          author_id?: string | null
          author_name?: string
          body?: string
          created_at?: string
          id?: string
          investor_id?: string | null
          likes?: number
          startup_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_notes_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_notes_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startup_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "founder" | "investor" | "admin"
      org_type: "startup" | "investment_firm"
      pipeline_status: "new" | "reviewing" | "meeting" | "passed"
      swipe_decision: "pass" | "save" | "interested"
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
  public: {
    Enums: {
      app_role: ["founder", "investor", "admin"],
      org_type: ["startup", "investment_firm"],
      pipeline_status: ["new", "reviewing", "meeting", "passed"],
      swipe_decision: ["pass", "save", "interested"],
    },
  },
} as const
