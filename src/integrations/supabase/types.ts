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
      audit_log: {
        Row: {
          aksi: string
          detail: string | null
          id: string
          ip: string | null
          modul: string
          nama: string
          pengurus_id: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          waktu: string
        }
        Insert: {
          aksi: string
          detail?: string | null
          id?: string
          ip?: string | null
          modul: string
          nama: string
          pengurus_id?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          waktu?: string
        }
        Update: {
          aksi?: string
          detail?: string | null
          id?: string
          ip?: string | null
          modul?: string
          nama?: string
          pengurus_id?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          waktu?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_pengurus_id_fkey"
            columns: ["pengurus_id"]
            isOneToOne: false
            referencedRelation: "pengurus"
            referencedColumns: ["id"]
          },
        ]
      }
      pengurus: {
        Row: {
          aktif: boolean
          created_at: string
          created_by: string | null
          gagal_login: number
          harus_ganti_pin: boolean
          id: string
          jabatan: Database["public"]["Enums"]["app_role"]
          last_login_at: string | null
          locked_until: string | null
          nama: string
          pin_hash: string
        }
        Insert: {
          aktif?: boolean
          created_at?: string
          created_by?: string | null
          gagal_login?: number
          harus_ganti_pin?: boolean
          id?: string
          jabatan: Database["public"]["Enums"]["app_role"]
          last_login_at?: string | null
          locked_until?: string | null
          nama: string
          pin_hash: string
        }
        Update: {
          aktif?: boolean
          created_at?: string
          created_by?: string | null
          gagal_login?: number
          harus_ganti_pin?: boolean
          id?: string
          jabatan?: Database["public"]["Enums"]["app_role"]
          last_login_at?: string | null
          locked_until?: string | null
          nama?: string
          pin_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "pengurus_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "pengurus"
            referencedColumns: ["id"]
          },
        ]
      }
      pengurus_session: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          pengurus_id: string
          token_hash: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          pengurus_id: string
          token_hash: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          pengurus_id?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "pengurus_session_pengurus_id_fkey"
            columns: ["pengurus_id"]
            isOneToOne: false
            referencedRelation: "pengurus"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          pengurus_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          id?: string
          pengurus_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          id?: string
          pengurus_id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_pengurus_id_fkey"
            columns: ["pengurus_id"]
            isOneToOne: false
            referencedRelation: "pengurus"
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
          _pengurus_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "ketua_rt"
        | "sekretaris"
        | "bendahara_1"
        | "bendahara_2"
        | "humas"
        | "keamanan_1"
        | "keamanan_2"
        | "sie_perlengkapan"
        | "sie_kematian"
        | "sie_umum"
        | "warga"
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
      app_role: [
        "super_admin",
        "ketua_rt",
        "sekretaris",
        "bendahara_1",
        "bendahara_2",
        "humas",
        "keamanan_1",
        "keamanan_2",
        "sie_perlengkapan",
        "sie_kematian",
        "sie_umum",
        "warga",
      ],
    },
  },
} as const
