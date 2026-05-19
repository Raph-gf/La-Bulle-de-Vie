import BookingWizard from "@/components/booking/BookingWizard"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export default async function BookingPage({ params }: { params: Promise<{ serviceId: string }> }) {
  const { serviceId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let userData = null
  if (user) {
    const metaName = user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "Client"
    const metaPhone = user.user_metadata?.phone ?? null
    const profile = await prisma.profile.upsert({
      where: { id: user.id },
      update: { phone: { set: metaPhone } },
      create: { id: user.id, fullName: metaName, phone: metaPhone, role: "client" },
      select: { fullName: true, phone: true },
    })
    userData = { fullName: profile.fullName, email: user.email ?? "", phone: profile.phone ?? metaPhone ?? "" }
  }

  return <BookingWizard serviceId={serviceId} userData={userData} />
}
