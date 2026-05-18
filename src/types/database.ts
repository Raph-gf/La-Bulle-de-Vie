/**
 * La Bulle De Vie — Database types
 *
 * Two type sources live here:
 *
 * 1. `Database` — Supabase-generated shape for the JS SDK client
 *    Used by createBrowserClient<Database> / createServerClient<Database>
 *    to give type-safe access to Supabase queries.
 *    Regenerate with: npx supabase gen types typescript > src/types/database.ts
 *
 * 2. Prisma row types — the canonical source of truth for full-stack TypeScript.
 *    Regenerate with: npx prisma generate
 *    Import from '@/types/database' everywhere in the app.
 */

// ---------------------------------------------------------------------------
// 1. Supabase Database type (for the JS SDK)
// ---------------------------------------------------------------------------

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          fullName: string
          phone: string | null
          role: "client" | "specialist"
          avatarUrl: string | null
          createdAt: string
          updatedAt: string
        }
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "createdAt" | "updatedAt">
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>
      }
      services: {
        Row: {
          id: string
          name: string
          slug: string
          description: string
          durationMinutes: number
          price: number
          category: "massage" | "energetique" | "creation"
          isPublished: boolean
          imageUrl: string | null
          createdAt: string
          updatedAt: string
        }
        Insert: Omit<Database["public"]["Tables"]["services"]["Row"], "id" | "createdAt" | "updatedAt">
        Update: Partial<Database["public"]["Tables"]["services"]["Insert"]>
      }
      availability_slots: {
        Row: {
          id: string
          date: string
          startTime: string
          endTime: string
          isBooked: boolean
          createdAt: string
        }
        Insert: Omit<Database["public"]["Tables"]["availability_slots"]["Row"], "id" | "createdAt">
        Update: Partial<Database["public"]["Tables"]["availability_slots"]["Insert"]>
      }
      appointments: {
        Row: {
          id: string
          clientId: string
          serviceId: string
          slotId: string
          status: "pending" | "confirmed" | "cancelled" | "completed"
          notes: string | null
          isFirstVisit: boolean
          location: string
          stripePaymentIntentId: string | null
          refundStatus: "none" | "requested" | "refunded"
          createdAt: string
          updatedAt: string
        }
        Insert: Omit<Database["public"]["Tables"]["appointments"]["Row"], "id" | "createdAt" | "updatedAt">
        Update: Partial<Database["public"]["Tables"]["appointments"]["Insert"]>
      }
      reviews: {
        Row: {
          id: string
          appointmentId: string
          serviceId: string
          clientId: string
          stars: number
          body: string
          approved: boolean
          specialistReply: string | null
          createdAt: string
          updatedAt: string
        }
        Insert: Omit<Database["public"]["Tables"]["reviews"]["Row"], "id" | "createdAt" | "updatedAt">
        Update: Partial<Database["public"]["Tables"]["reviews"]["Insert"]>
      }
      products: {
        Row: {
          id: string
          name: string
          description: string
          price: number
          stock: number
          medium: string
          dimensions: string
          imageUrl: string | null
          isPublished: boolean
          createdAt: string
          updatedAt: string
        }
        Insert: Omit<Database["public"]["Tables"]["products"]["Row"], "id" | "createdAt" | "updatedAt">
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>
      }
      orders: {
        Row: {
          id: string
          clientId: string
          status: "pending" | "paid" | "shipped" | "cancelled"
          total: number
          stripePaymentIntentId: string | null
          shippingAddress: Json | null
          createdAt: string
          updatedAt: string
        }
        Insert: Omit<Database["public"]["Tables"]["orders"]["Row"], "id" | "createdAt" | "updatedAt">
        Update: Partial<Database["public"]["Tables"]["orders"]["Insert"]>
      }
      order_items: {
        Row: {
          id: string
          orderId: string
          productId: string
          quantity: number
          unitPrice: number
          createdAt: string
        }
        Insert: Omit<Database["public"]["Tables"]["order_items"]["Row"], "id" | "createdAt">
        Update: Partial<Database["public"]["Tables"]["order_items"]["Insert"]>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      UserRole: "client" | "specialist"
      AppointmentStatus: "pending" | "confirmed" | "cancelled" | "completed"
      RefundStatus: "none" | "requested" | "refunded"
      OrderStatus: "pending" | "paid" | "shipped" | "cancelled"
      ServiceCategory: "massage" | "energetique" | "creation"
    }
  }
}

// ---------------------------------------------------------------------------
// 2. Prisma row types — source of truth for full-stack TypeScript
// ---------------------------------------------------------------------------

export type {
  Profile,
  Service,
  AvailabilitySlot,
  Appointment,
  Review,
  Product,
  Order,
  OrderItem,
  // Enums
  UserRole,
  AppointmentStatus,
  RefundStatus,
  OrderStatus,
  ServiceCategory,
} from "@prisma/client";

// ---------------------------------------------------------------------------
// 3. Convenience composite types
// ---------------------------------------------------------------------------

import type {
  Appointment,
  Profile,
  Review,
  Service,
  Order,
  OrderItem,
  Product,
  AvailabilitySlot,
} from "@prisma/client";

/** Appointment row with its related service, client profile, slot, and review */
export type AppointmentWithDetails = Appointment & {
  service: Service;
  client: Profile;
  slot: AvailabilitySlot;
  review: Review | null;
};

/** Review row with its related service and client profile */
export type ReviewWithDetails = Review & {
  service: Service;
  client: Profile;
};

/** Order row with line items and their products */
export type OrderWithItems = Order & {
  items: (OrderItem & { product: Product })[];
  client: Profile;
};

/** Service row with aggregated review stats */
export type ServiceWithStats = Service & {
  reviews: Review[];
  _count: { reviews: number };
};
