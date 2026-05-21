import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")

  if (!token) {
    return new NextResponse("Lien invalide.", { status: 400, headers: { "Content-Type": "text/plain" } })
  }

  try {
    await prisma.newsletterSubscriber.delete({
      where: { unsubscribeToken: token },
    })
  } catch {
    // Already unsubscribed or token not found — treat as success
  }

  return new NextResponse(
    `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Désinscription</title>
    <style>body{font-family:Georgia,serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#F5EDE5;color:#2C1F14;}
    .box{text-align:center;max-width:400px;padding:40px;}</style></head>
    <body><div class="box"><p style="font-size:32px;margin:0 0 16px">✦</p>
    <h1 style="font-weight:normal;font-size:24px;margin:0 0 12px">Désinscription confirmée</h1>
    <p style="color:#6B5C4E;line-height:1.7">Vous ne recevrez plus nos emails. Nous espérons vous revoir bientôt.</p>
    <a href="/" style="display:inline-block;margin-top:24px;color:#C4956A;font-size:14px;letter-spacing:.1em;">← Retour au site</a>
    </div></body></html>`,
    { status: 200, headers: { "Content-Type": "text/html" } }
  )
}
