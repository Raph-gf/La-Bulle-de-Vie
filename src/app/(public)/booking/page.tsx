import BookingWizard from "@/components/booking/BookingWizard"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export default async function BookingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let userData = null
  if (user) {
    const profile = await prisma.profile.upsert({
      where: { id: user.id },
      update: {},
      create: {
        id: user.id,
        fullName: user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "Client",
        role: "client",
      },
      select: { fullName: true, phone: true },
    })
    userData = { fullName: profile.fullName, email: user.email ?? "", phone: profile.phone ?? "" }
  }

  return <BookingWizard userData={userData} />
}
