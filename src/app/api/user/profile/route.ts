import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

const profileSchema = z.object({
  fullName: z.string().min(1).max(100).transform((s) => s.trim()),
  phone: z.string().max(30).optional().transform((s) => s?.trim() || null),
  preferredLocation: z.enum(["cabinet", "domicile"]).optional(),
  defaultShippingAddress: z.string().max(300).optional().transform((s) => s?.trim() || null),
})

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { fullName: true, phone: true, preferredLocation: true, defaultShippingAddress: true, avatarUrl: true },
    })

    return NextResponse.json({ profile })
  } catch (err) {
    console.error("[user/profile] GET error:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

    let body: unknown
    try { body = await req.json() } catch {
      return NextResponse.json({ error: "Corps invalide" }, { status: 400 })
    }

    const parsed = profileSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données invalides", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 422 }
      )
    }

    const { fullName, phone, preferredLocation, defaultShippingAddress } = parsed.data

    const profile = await prisma.profile.update({
      where: { id: user.id },
      data: {
        fullName,
        phone: phone ?? null,
        ...(preferredLocation && { preferredLocation }),
        ...(defaultShippingAddress !== undefined && { defaultShippingAddress: defaultShippingAddress ?? undefined }),
      },
      select: { fullName: true, phone: true, preferredLocation: true },
    })

    // Keep Supabase auth metadata in sync so Navbar shows updated name
    await supabase.auth.updateUser({ data: { full_name: fullName } })

    return NextResponse.json({ profile })
  } catch (err) {
    console.error("[user/profile] PATCH error:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
