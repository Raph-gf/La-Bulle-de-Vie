import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import Sidebar from "@/components/dashboard/Sidebar"
import Topbar from "@/components/dashboard/Topbar"
import DashBodyClass from "@/components/dashboard/DashBodyClass"
import { QueryProvider } from "@/components/providers/QueryProvider"
import { SessionInitializer } from "@/components/dashboard/SessionInitializer"
import "@/app/dashboard.css"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const fullName =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email?.split("@")[0] ??
    "Utilisateur"

  const isSpecialist = user.email === process.env.SPECIALIST_EMAIL

  const [profile, pendingReviews, pendingAppts] = await Promise.all([
    prisma.profile.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        fullName,
        phone: user.user_metadata?.phone ?? null,
        role: isSpecialist ? "specialist" : "client",
      },
      update: {},
      select: { role: true, fullName: true },
    }),
    prisma.review.count({ where: { approved: false } }),
    prisma.appointment.count({ where: { status: "pending" } }),
  ])

  if (profile.role !== "specialist") redirect("/")

  const pendingCount = pendingReviews + pendingAppts

  return (
    <QueryProvider>
      <div className="app">
        <DashBodyClass />
        <SessionInitializer
          userName={profile.fullName}
          role={profile.role as "specialist" | "client"}
          pendingCount={pendingCount}
        />
        <Sidebar userName={profile.fullName} />
        <main className="main">
          <Topbar />
          {children}
        </main>
      </div>
    </QueryProvider>
  )
}
