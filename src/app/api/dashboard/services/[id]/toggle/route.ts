import { NextResponse } from "next/server"
import { requireSpecialist } from "@/lib/auth"
import { prisma } from "@/lib/prisma"


export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireSpecialist()
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { id } = await params

  const service = await prisma.service.findUnique({ where: { id }, select: { isPublished: true } })
  if (!service) return NextResponse.json({ error: "Prestation introuvable" }, { status: 404 })

  const updated = await prisma.service.update({
    where: { id },
    data: { isPublished: !service.isPublished },
  })

  return NextResponse.json({ isPublished: updated.isPublished })
}
