import BookingWizard from "@/components/booking/BookingWizard"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export default async function BookingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let userData = null
  if (user) {
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { fullName: true, phone: true },
    })
    if (profile) {
      userData = { fullName: profile.fullName, email: user.email ?? "", phone: profile.phone ?? "" }
    }
  }

  return <BookingWizard userData={userData} />
}
