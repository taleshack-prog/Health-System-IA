import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json()
    const eventType = req.headers.get("x-vercel-event-type") || payload.type

    console.log("[Vercel Webhook]", eventType, JSON.stringify(payload).slice(0, 200))

    if (eventType === "deployment.error" || eventType === "deployment.blocked") {
      console.log("[Vercel Webhook] Erro de deploy detectado — triggering IA diagnosis")
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error("[Vercel Webhook]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
