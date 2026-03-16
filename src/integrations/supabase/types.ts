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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      client_assets: {
        Row: {
          alt_text: string
          asset_type: string
          caption: string
          client_slug: string
          created_at: string
          file_url: string
          folder_slug: string
          id: string
        }
        Insert: {
          alt_text?: string
          asset_type?: string
          caption?: string
          client_slug: string
          created_at?: string
          file_url?: string
          folder_slug?: string
          id?: string
        }
        Update: {
          alt_text?: string
          asset_type?: string
          caption?: string
          client_slug?: string
          created_at?: string
          file_url?: string
          folder_slug?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_assets_client_slug_fkey"
            columns: ["client_slug"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["client_slug"]
          },
        ]
      }
      client_content_images: {
        Row: {
          alt_text: string
          caption: string
          content_item_id: string
          created_at: string
          file_name: string
          file_url: string
          id: string
          sort_order: number
        }
        Insert: {
          alt_text?: string
          caption?: string
          content_item_id: string
          created_at?: string
          file_name?: string
          file_url?: string
          id?: string
          sort_order?: number
        }
        Update: {
          alt_text?: string
          caption?: string
          content_item_id?: string
          created_at?: string
          file_name?: string
          file_url?: string
          id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "client_content_images_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "client_content_items"
            referencedColumns: ["id"]
          },
        ]
      }
      client_content_items: {
        Row: {
          client_slug: string
          content_type: string
          created_at: string
          description: string
          featured_image: string
          id: string
          image_count: number
          item_slug: string
          title: string
        }
        Insert: {
          client_slug: string
          content_type?: string
          created_at?: string
          description?: string
          featured_image?: string
          id?: string
          image_count?: number
          item_slug?: string
          title?: string
        }
        Update: {
          client_slug?: string
          content_type?: string
          created_at?: string
          description?: string
          featured_image?: string
          id?: string
          image_count?: number
          item_slug?: string
          title?: string
        }
        Relationships: []
      }
      client_projects: {
        Row: {
          client_name: string
          client_slug: string
          created_at: string
          id: string
          included_image_limit: number
          uploaded_image_count: number
        }
        Insert: {
          client_name: string
          client_slug: string
          created_at?: string
          id?: string
          included_image_limit?: number
          uploaded_image_count?: number
        }
        Update: {
          client_name?: string
          client_slug?: string
          created_at?: string
          id?: string
          included_image_limit?: number
          uploaded_image_count?: number
        }
        Relationships: []
      }
      demo_sites: {
        Row: {
          created_at: string
          desktop_screenshot_url: string
          id: string
          industry: string
          live_url: string
          mobile_screenshot_url: string
          notes: string
          preview_image: string
          reference_role: string
          site_name: string
        }
        Insert: {
          created_at?: string
          desktop_screenshot_url?: string
          id?: string
          industry?: string
          live_url?: string
          mobile_screenshot_url?: string
          notes?: string
          preview_image?: string
          reference_role?: string
          site_name: string
        }
        Update: {
          created_at?: string
          desktop_screenshot_url?: string
          id?: string
          industry?: string
          live_url?: string
          mobile_screenshot_url?: string
          notes?: string
          preview_image?: string
          reference_role?: string
          site_name?: string
        }
        Relationships: []
      }
      prompts: {
        Row: {
          category: string
          content: string
          created_at: string
          file_path: string
          id: string
          prompt_name: string
          updated_at: string
          version: number
        }
        Insert: {
          category?: string
          content?: string
          created_at?: string
          file_path?: string
          id?: string
          prompt_name: string
          updated_at?: string
          version?: number
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          file_path?: string
          id?: string
          prompt_name?: string
          updated_at?: string
          version?: number
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
