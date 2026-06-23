import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { sql } from "@/lib/neon/client"

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get("stripe-signature")!
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    console.error("[Stripe Webhook] Assinatura invalida:", err)
    return NextResponse.json({ error: "Assinatura invalida" }, { status: 400 })
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any
    const { userId, plan } = session.metadata || {}

    if (userId && plan) {
      const tierCode = plan === "pro" ? "pro" : "starter"
      const tierRows = await sql("SELECT id FROM hack_tech_farm.tiers WHERE code = $1 LIMIT 1", [tierCode])
      const tierId = tierRows[0]?.id

      if (tierId) {
        const orgRows = await sql(
          "SELECT o.id FROM hack_tech_farm.organizations o JOIN hack_tech_farm.organization_members om ON om.organization_id = o.id WHERE om.user_id = $1 LIMIT 1",
          [userId]
        )
        if (orgRows.length) {
          await sql(
            "UPDATE hack_tech_farm.organizations SET tier_id = $1 WHERE id = $2",
            [tierId, orgRows[0].id]
          )
          console.log("[Stripe] Plano atualizado:", plan, "para usuario:", userId)
        }
      }
    }
  }

  return NextResponse.json({ received: true })
}
