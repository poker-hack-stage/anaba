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
      areas: {
        Row: {
          boundary: Json | null
          catchphrase: string | null
          center_lat: number
          center_lng: number
          created_at: string
          display_order: number
          id: string
          image_path: string | null
          name: string
          updated_at: string
          zoom: number
        }
        Insert: {
          boundary?: Json | null
          catchphrase?: string | null
          center_lat: number
          center_lng: number
          created_at?: string
          display_order?: number
          id?: string
          image_path?: string | null
          name: string
          updated_at?: string
          zoom?: number
        }
        Update: {
          boundary?: Json | null
          catchphrase?: string | null
          center_lat?: number
          center_lng?: number
          created_at?: string
          display_order?: number
          id?: string
          image_path?: string | null
          name?: string
          updated_at?: string
          zoom?: number
        }
        Relationships: []
      }
      ng_words: {
        Row: {
          created_at: string
          word: string
        }
        Insert: {
          created_at?: string
          word: string
        }
        Update: {
          created_at?: string
          word?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          count: number
          key: string
          window_start: string
        }
        Insert: {
          count?: number
          key: string
          window_start: string
        }
        Update: {
          count?: number
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          body: string
          client_hash: string | null
          created_at: string
          id: string
          nickname: string
          rating: number
          spot_id: string
          status: string
        }
        Insert: {
          body: string
          client_hash?: string | null
          created_at?: string
          id?: string
          nickname: string
          rating: number
          spot_id: string
          status?: string
        }
        Update: {
          body?: string
          client_hash?: string | null
          created_at?: string
          id?: string
          nickname?: string
          rating?: number
          spot_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_spot_id_fkey"
            columns: ["spot_id"]
            isOneToOne: false
            referencedRelation: "spots"
            referencedColumns: ["id"]
          },
        ]
      }
      spot_client_hashes: {
        Row: {
          client_hash: string
          created_at: string
          spot_id: string
        }
        Insert: {
          client_hash: string
          created_at?: string
          spot_id: string
        }
        Update: {
          client_hash?: string
          created_at?: string
          spot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "spot_client_hashes_spot_id_fkey"
            columns: ["spot_id"]
            isOneToOne: true
            referencedRelation: "spots"
            referencedColumns: ["id"]
          },
        ]
      }
      spots: {
        Row: {
          area_id: string
          best_time: string | null
          catchphrase: string | null
          category: string
          created_at: string
          description: string | null
          hidden_gem_score: number | null
          id: string
          image_path: string | null
          lat: number
          lng: number
          local_tip: string | null
          name: string
          nickname: string | null
          rating: number | null
          source: string
          status: string
          stay_minutes: number | null
          tags: string[]
          updated_at: string
        }
        Insert: {
          area_id: string
          best_time?: string | null
          catchphrase?: string | null
          category: string
          created_at?: string
          description?: string | null
          hidden_gem_score?: number | null
          id?: string
          image_path?: string | null
          lat: number
          lng: number
          local_tip?: string | null
          name: string
          nickname?: string | null
          rating?: number | null
          source?: string
          status?: string
          stay_minutes?: number | null
          tags?: string[]
          updated_at?: string
        }
        Update: {
          area_id?: string
          best_time?: string | null
          catchphrase?: string | null
          category?: string
          created_at?: string
          description?: string | null
          hidden_gem_score?: number | null
          id?: string
          image_path?: string | null
          lat?: number
          lng?: number
          local_tip?: string | null
          name?: string
          nickname?: string | null
          rating?: number | null
          source?: string
          status?: string
          stay_minutes?: number | null
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "spots_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      published_reviews: {
        Row: {
          body: string | null
          created_at: string | null
          id: string | null
          nickname: string | null
          rating: number | null
          spot_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string | null
          nickname?: string | null
          rating?: number | null
          spot_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string | null
          nickname?: string | null
          rating?: number | null
          spot_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_spot_id_fkey"
            columns: ["spot_id"]
            isOneToOne: false
            referencedRelation: "spots"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      assert_postable_text: { Args: { p_text: string }; Returns: undefined }
      assert_visible_text: {
        Args: { p_allow_newline: boolean; p_text: string }
        Returns: undefined
      }
      check_rate_limit: {
        Args: { p_key: string; p_max: number; p_window_seconds: number }
        Returns: boolean
      }
      geojson_contains_point: {
        Args: { p_geojson: Json; p_lat: number; p_lng: number }
        Returns: boolean
      }
      normalize_for_moderation: { Args: { p_text: string }; Returns: string }
      submit_spot: {
        Args: {
          p_area_id: string
          p_category: string
          p_client_hash?: string
          p_description: string
          p_lat: number
          p_lng: number
          p_name: string
          p_nickname: string
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

