import { NextResponse } from "next/server"
import { requireSpecialist } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { prisma } from "@/lib/prisma"

const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]


export async function POST(req: Request) {
  const user = await requireSpecialist()
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 })
  }

  const file = formData.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 })
  }

  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json(
      { error: "Format non supporté. Utilisez JPEG, PNG, WebP, GIF ou AVIF." },
      { status: 422 }
    )
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 5 Mo)" }, { status: 422 })
  }

  const MIME_TO_EXT: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif",
  }
  const ext = MIME_TO_EXT[file.type] ?? "jpg"
  const path = `services/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const buffer = new Uint8Array(await file.arrayBuffer())

  const { error: uploadError } = await supabaseAdmin.storage
    .from("service-images")
    .upload(path, buffer, { contentType: file.type, upsert: false })

  if (uploadError) {
    console.error("[upload] Supabase error:", uploadError.message)
    return NextResponse.json({ error: "Erreur lors de l'upload : " + uploadError.message }, { status: 500 })
  }

  const { data: { publicUrl } } = supabaseAdmin.storage.from("service-images").getPublicUrl(path)

  return NextResponse.json({ url: publicUrl })
}
