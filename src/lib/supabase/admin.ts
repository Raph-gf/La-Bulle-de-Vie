import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

// Service-role client — bypasses RLS. Only use server-side after auth verification.
export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
