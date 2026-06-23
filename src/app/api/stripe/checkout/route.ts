import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { stripe, PLANS } from "@/lib/stripe"
import { sql } from "@/lib/neon/client"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: { message: "Nao autenticado" } }, { status: 401 })
    }

    const { plan } = await req.json()
    if (!plan || !PLANS[plan as keyof typeof PLANS]) {
      return NextResponse.json({ error: { message: "Plano invalido" } }, { status: 400 })
    }

    const selectedPlan = PLANS[plan as keyof typeof PLANS]
    const email = session.user.email!
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://health-system-ia.vercel.app"

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: email,
      line_items: [{ price: selectedPlan.priceId, quantity: 1 }],
      success_url: appUrl + "/dashboard?upgraded=true&plan=" + plan,
      cancel_url: appUrl + "/pricing",
      metadata: { userId: (session.user as any).id, plan },
      subscription_data: {
        metadata: { userId: (session.user as any).id, plan },
      },
    })

    return NextResponse.json({ data: { url: checkoutSession.url } })
  } catch (err) {
    console.error("[Stripe Checkout]", err)
    return NextResponse.json({ error: { message: "Erro interno" } }, { status: 500 })
  }
}
