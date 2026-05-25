import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import type { User } from "@supabase/supabase-js"

/**
 * Returns the authenticated Supabase user if their DB profile has role = "specialist",
 * otherwise returns null. Used by all dashboard API routes.
 */
export async function requireSpecialist(): Promise<User | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { role: true },
  })
  return profile?.role === "specialist" ? user : null
}
