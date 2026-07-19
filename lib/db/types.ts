/**
 * Tipos de la base de datos de Ressy.
 *
 * ⚠️ ESTE ARCHIVO ESTÁ ESCRITO A MANO, no generado.
 *
 * Lo correcto es generarlo desde el esquema real:
 *
 *   pnpm db:types          # contra la DB local (necesita Docker)
 *   pnpm db:types:remote   # contra el proyecto enlazado
 *
 * Se escribió a mano porque esta sesión no tuvo una DB contra la cual correr
 * las migraciones. En cuanto tengas una, REGENÉRALO y borra esta nota: la
 * versión generada trae además el bloque `Relationships`, que es lo que permite
 * tipar los joins anidados (`.select('*, services(*)')`). Aquí van vacíos, así
 * que esos joins no tendrán tipos.
 *
 * Convención (CLAUDE.md §4): snake_case aquí porque es el reflejo literal de la
 * DB. El mapeo a camelCase vive en ./mappers.ts y no debe hacerse en la UI.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      businesses: {
        Row: {
          id: string;
          slug: string;
          name: string;
          category: string | null;
          timezone: string;
          currency: string;
          booking_locale: string;
          logo_url: string | null;
          accent_color: string | null;
          address: string | null;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          category?: string | null;
          timezone: string;
          currency: string;
          booking_locale?: string;
          logo_url?: string | null;
          accent_color?: string | null;
          address?: string | null;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['businesses']['Insert']>;
        Relationships: [];
      };

      business_members: {
        Row: {
          id: string;
          business_id: string;
          user_id: string;
          role: Database['public']['Enums']['business_role'];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          user_id: string;
          role?: Database['public']['Enums']['business_role'];
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['business_members']['Insert']>;
        Relationships: [];
      };

      reserved_slugs: {
        Row: { slug: string; reason: string | null };
        Insert: { slug: string; reason?: string | null };
        Update: Partial<{ slug: string; reason: string | null }>;
        Relationships: [];
      };

      staff_members: {
        Row: {
          id: string;
          business_id: string;
          user_id: string | null;
          name: string;
          role: string | null;
          avatar_url: string | null;
          can_view_all_bookings: boolean;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          user_id?: string | null;
          name: string;
          role?: string | null;
          avatar_url?: string | null;
          can_view_all_bookings?: boolean;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['staff_members']['Insert']>;
        Relationships: [];
      };

      business_hours: {
        Row: {
          id: string;
          business_id: string;
          /** ISO-8601: 1=lunes … 7=domingo */
          weekday: number;
          /** Hora LOCAL del negocio ('HH:MM:SS'). Nunca UTC. */
          open_time: string;
          close_time: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          weekday: number;
          open_time: string;
          close_time: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['business_hours']['Insert']>;
        Relationships: [];
      };

      staff_schedules: {
        Row: {
          id: string;
          business_id: string;
          staff_member_id: string;
          /** ISO-8601: 1=lunes … 7=domingo */
          weekday: number;
          /** Hora LOCAL del negocio ('HH:MM:SS'). Nunca UTC (CLAUDE.md §3, DST). */
          start_time: string;
          end_time: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          staff_member_id: string;
          weekday: number;
          start_time: string;
          end_time: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['staff_schedules']['Insert']>;
        Relationships: [];
      };

      schedule_overrides: {
        Row: {
          id: string;
          business_id: string;
          /** NULL = aplica a todo el negocio. */
          staff_member_id: string | null;
          kind: Database['public']['Enums']['override_kind'];
          /** UTC (ISO 8601). */
          starts_at: string;
          ends_at: string;
          reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          staff_member_id?: string | null;
          kind?: Database['public']['Enums']['override_kind'];
          starts_at: string;
          ends_at: string;
          reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['schedule_overrides']['Insert']>;
        Relationships: [];
      };

      services: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          description: string | null;
          duration_min: number;
          /** Integer en la unidad menor de businesses.currency. */
          price_amount: number;
          buffer_before_min: number;
          buffer_after_min: number;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          description?: string | null;
          duration_min: number;
          price_amount: number;
          buffer_before_min?: number;
          buffer_after_min?: number;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['services']['Insert']>;
        Relationships: [];
      };

      service_staff: {
        Row: {
          business_id: string;
          service_id: string;
          staff_member_id: string;
          created_at: string;
        };
        Insert: {
          business_id: string;
          service_id: string;
          staff_member_id: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['service_staff']['Insert']>;
        Relationships: [];
      };

      customers: {
        Row: {
          id: string;
          business_id: string;
          full_name: string;
          email: string | null;
          phone: string | null;
          /** PII interna: nunca exponer a anon ni loguear (CLAUDE.md §9). */
          notes: string | null;
          tags: string[];
          locale: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          full_name: string;
          email?: string | null;
          phone?: string | null;
          notes?: string | null;
          tags?: string[];
          locale?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['customers']['Insert']>;
        Relationships: [];
      };

      bookings: {
        Row: {
          id: string;
          business_id: string;
          service_id: string;
          staff_member_id: string;
          customer_id: string;
          /** UTC (ISO 8601). Renderizar en businesses.timezone. */
          starts_at: string;
          ends_at: string;
          status: Database['public']['Enums']['booking_status'];
          source: Database['public']['Enums']['booking_source'];
          notes: string | null;
          internal_notes: string | null;
          /** Snapshot al reservar: no sigue a services.price_amount. */
          price_amount: number;
          currency: string;
          cancelled_at: string | null;
          cancellation_reason: string | null;
          rescheduled_from_booking_id: string | null;
          /** Secreto por reserva para gestión sin login (migración 07). */
          management_token: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          service_id: string;
          staff_member_id: string;
          customer_id: string;
          starts_at: string;
          ends_at: string;
          status?: Database['public']['Enums']['booking_status'];
          source?: Database['public']['Enums']['booking_source'];
          notes?: string | null;
          internal_notes?: string | null;
          price_amount: number;
          currency: string;
          cancelled_at?: string | null;
          cancellation_reason?: string | null;
          rescheduled_from_booking_id?: string | null;
          management_token?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['bookings']['Insert']>;
        Relationships: [];
      };

      booking_payments: {
        Row: {
          id: string;
          business_id: string;
          booking_id: string;
          kind: Database['public']['Enums']['payment_kind'];
          amount: number;
          currency: string;
          provider: Database['public']['Enums']['payment_provider'];
          status: Database['public']['Enums']['payment_status'];
          external_id: string | null;
          external_payload: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          booking_id: string;
          kind?: Database['public']['Enums']['payment_kind'];
          amount: number;
          currency: string;
          provider: Database['public']['Enums']['payment_provider'];
          status?: Database['public']['Enums']['payment_status'];
          external_id?: string | null;
          external_payload?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['booking_payments']['Insert']>;
        Relationships: [];
      };

      business_policies: {
        Row: {
          business_id: string;
          min_lead_time_min: number;
          max_advance_days: number;
          cancellation_window_hours: number;
          deposit_type: Database['public']['Enums']['deposit_type'];
          deposit_percent: number | null;
          deposit_amount: number | null;
          no_show_fee_amount: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          business_id: string;
          min_lead_time_min?: number;
          max_advance_days?: number;
          cancellation_window_hours?: number;
          deposit_type?: Database['public']['Enums']['deposit_type'];
          deposit_percent?: number | null;
          deposit_amount?: number | null;
          no_show_fee_amount?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['business_policies']['Insert']>;
        Relationships: [];
      };

      subscriptions: {
        Row: {
          business_id: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          tier: Database['public']['Enums']['subscription_tier'];
          status: Database['public']['Enums']['subscription_status'];
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          business_id: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          tier?: Database['public']['Enums']['subscription_tier'];
          status?: Database['public']['Enums']['subscription_status'];
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['subscriptions']['Insert']>;
        Relationships: [];
      };

      notifications: {
        Row: {
          id: string;
          business_id: string;
          booking_id: string | null;
          type: Database['public']['Enums']['notification_type'];
          channel: Database['public']['Enums']['notification_channel'];
          status: Database['public']['Enums']['notification_status'];
          recipient: string | null;
          dedup_key: string;
          external_id: string | null;
          error: string | null;
          created_at: string;
          sent_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          booking_id?: string | null;
          type: Database['public']['Enums']['notification_type'];
          channel: Database['public']['Enums']['notification_channel'];
          status?: Database['public']['Enums']['notification_status'];
          recipient?: string | null;
          dedup_key: string;
          external_id?: string | null;
          error?: string | null;
          created_at?: string;
          sent_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>;
        Relationships: [];
      };

      notification_settings: {
        Row: {
          business_id: string;
          confirmation_enabled: boolean;
          reminder_1_enabled: boolean;
          reminder_1_hours: number;
          reminder_2_enabled: boolean;
          reminder_2_hours: number;
          rescheduled_enabled: boolean;
          cancelled_enabled: boolean;
          business_new_booking_enabled: boolean;
          business_cancellation_enabled: boolean;
          daily_summary_enabled: boolean;
          daily_summary_hour: number;
          whatsapp_enabled: boolean;
          custom_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          business_id: string;
          confirmation_enabled?: boolean;
          reminder_1_enabled?: boolean;
          reminder_1_hours?: number;
          reminder_2_enabled?: boolean;
          reminder_2_hours?: number;
          rescheduled_enabled?: boolean;
          cancelled_enabled?: boolean;
          business_new_booking_enabled?: boolean;
          business_cancellation_enabled?: boolean;
          daily_summary_enabled?: boolean;
          daily_summary_hour?: number;
          whatsapp_enabled?: boolean;
          custom_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['notification_settings']['Insert']>;
        Relationships: [];
      };

      notification_usage: {
        Row: {
          business_id: string;
          period: string;
          channel: Database['public']['Enums']['notification_channel'];
          count: number;
        };
        Insert: {
          business_id: string;
          period: string;
          channel: Database['public']['Enums']['notification_channel'];
          count?: number;
        };
        Update: Partial<Database['public']['Tables']['notification_usage']['Insert']>;
        Relationships: [];
      };
    };

    Views: {
      /** Única superficie por la que `anon` conoce la ocupación. Sin datos de cliente. */
      public_busy_slots: {
        Row: {
          business_id: string | null;
          staff_member_id: string | null;
          starts_at: string | null;
          ends_at: string | null;
        };
        Relationships: [];
      };
    };

    Functions: {
      is_business_member: { Args: { target_business_id: string }; Returns: boolean };
      is_business_admin: { Args: { target_business_id: string }; Returns: boolean };
      is_published_business: { Args: { target_business_id: string }; Returns: boolean };
      current_staff_member_id: { Args: { target_business_id: string }; Returns: string | null };
      can_view_all_bookings: { Args: { target_business_id: string }; Returns: boolean };

      // Onboarding (migración 08): crea negocio + owner member + owner staff + free sub.
      create_business: {
        Args: {
          p_name: string;
          p_category: string;
          p_timezone: string;
          p_currency: string;
          p_booking_locale: string;
          p_owner_name: string;
        };
        Returns: string;
      };
      is_slug_available: {
        Args: { p_slug: string; p_exclude_business?: string | null };
        Returns: boolean;
      };

      // Guest checkout y gestión sin login (migración 07). Todas SECURITY DEFINER.
      create_public_booking: {
        Args: {
          p_business_id: string;
          p_service_id: string;
          p_staff_member_id: string;
          p_starts_at: string;
          p_customer_name: string;
          p_customer_email: string | null;
          p_customer_phone: string | null;
          p_customer_locale: string;
          p_note: string | null;
          p_source: Database['public']['Enums']['booking_source'];
        };
        Returns: {
          booking_id: string;
          management_token: string;
          status: Database['public']['Enums']['booking_status'];
        }[];
      };
      cancel_public_booking: {
        Args: { p_token: string; p_reason: string };
        Returns: Database['public']['Enums']['booking_status'];
      };
      reschedule_public_booking: {
        Args: { p_token: string; p_new_starts_at: string; p_new_staff_member_id: string };
        Returns: Database['public']['Enums']['booking_status'];
      };
      get_public_booking: {
        Args: { p_token: string };
        Returns: {
          status: Database['public']['Enums']['booking_status'];
          starts_at: string;
          ends_at: string;
          business_id: string;
          service_id: string;
          service_name: string;
          service_duration_min: number;
          staff_member_id: string;
          staff_name: string;
          business_name: string;
          business_slug: string;
          timezone: string;
          currency: string;
          price_amount: number;
          cancellation_window_hours: number | null;
          customer_name: string;
        }[];
      };

      // Operaciones del dashboard (migración 09). Todas SECURITY DEFINER.
      can_write_booking_for: {
        Args: { p_business_id: string; p_staff_member_id: string };
        Returns: boolean;
      };
      booking_apply_business_transition: {
        Args: {
          p_booking_id: string;
          p_target: Database['public']['Enums']['booking_status'];
          p_reason?: string | null;
        };
        Returns: Database['public']['Enums']['booking_status'];
      };
      create_manual_booking: {
        Args: {
          p_business_id: string;
          p_service_id: string;
          p_staff_member_id: string;
          p_starts_at: string;
          p_customer_id?: string | null;
          p_customer_name?: string | null;
          p_customer_email?: string | null;
          p_customer_phone?: string | null;
          p_note?: string | null;
        };
        Returns: {
          booking_id: string;
          status: Database['public']['Enums']['booking_status'];
        }[];
      };
      reschedule_business_booking: {
        Args: {
          p_booking_id: string;
          p_new_starts_at: string;
          p_new_staff_member_id: string;
        };
        Returns: Database['public']['Enums']['booking_status'];
      };
      create_schedule_override: {
        Args: {
          p_business_id: string;
          p_staff_member_id: string | null;
          p_kind: Database['public']['Enums']['override_kind'];
          p_starts_at: string;
          p_ends_at: string;
          p_reason?: string | null;
        };
        Returns: string;
      };

      // Gestión de equipo (migración 10).
      staff_limit_for_tier: {
        Args: { p_tier: Database['public']['Enums']['subscription_tier'] };
        Returns: number;
      };
      create_staff_member: {
        Args: {
          p_business_id: string;
          p_name: string;
          p_role?: string | null;
          p_can_view_all?: boolean;
          p_service_ids?: string[];
        };
        Returns: string;
      };
      set_staff_permissions: {
        Args: { p_staff_member_id: string; p_can_view_all: boolean };
        Returns: undefined;
      };

      booking_id_for_token: {
        Args: { p_token: string };
        Returns: string | null;
      };

      // Notificaciones (migración 11).
      increment_notification_usage: {
        Args: {
          p_business_id: string;
          p_period: string;
          p_channel: Database['public']['Enums']['notification_channel'];
        };
        Returns: undefined;
      };
    };

    Enums: {
      booking_status:
        | 'pending_payment'
        | 'confirmed'
        | 'rescheduled'
        | 'completed'
        | 'cancelled_by_client'
        | 'cancelled_by_business'
        | 'no_show';
      booking_source: 'link' | 'qr' | 'instagram' | 'manual' | 'other';
      payment_provider: 'stripe' | 'mercadopago';
      payment_status:
        | 'pending'
        | 'authorized'
        | 'paid'
        | 'failed'
        | 'cancelled'
        | 'refunded'
        | 'partially_refunded';
      payment_kind: 'deposit' | 'full' | 'no_show_fee';
      business_role: 'owner' | 'admin' | 'staff';
      subscription_tier: 'free' | 'starter' | 'pro' | 'business';
      subscription_status:
        | 'trialing'
        | 'active'
        | 'past_due'
        | 'canceled'
        | 'incomplete'
        | 'incomplete_expired'
        | 'unpaid';
      deposit_type: 'none' | 'percent' | 'fixed';
      override_kind: 'unavailable' | 'available';
      notification_type:
        | 'confirmation'
        | 'reminder'
        | 'rescheduled'
        | 'cancelled'
        | 'post_service'
        | 'business_new_booking'
        | 'business_cancellation'
        | 'business_daily_summary';
      notification_channel: 'email' | 'whatsapp' | 'sms';
      notification_status: 'pending' | 'sent' | 'failed' | 'skipped';
    };

    CompositeTypes: Record<never, never>;
  };
};

// ---------------------------------------------------------------------------
// Atajos
// ---------------------------------------------------------------------------

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];

// Los estados que ocupan tiempo del profesional. Deben coincidir EXACTAMENTE
// con el WHERE del constraint `bookings_no_overlap` y con el de la vista
// `public_busy_slots`. Si divergen, la booking page ofrecerá slots que el
// INSERT rechazará.
export const ACTIVE_BOOKING_STATUSES = [
  'pending_payment',
  'confirmed',
  'rescheduled',
] as const satisfies readonly Enums<'booking_status'>[];
