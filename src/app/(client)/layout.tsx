import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return <>{children}</>

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  return <>{children}</>
}
