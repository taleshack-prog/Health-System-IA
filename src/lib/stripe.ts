import Stripe from "stripe"

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-05-27.dahlia",
})

export const PLANS = {
  starter: {
    name: "Starter",
    priceId: process.env.STRIPE_PRICE_STARTER!,
    price: 4900,
    currency: "brl",
  },
  pro: {
    name: "Pro",
    priceId: process.env.STRIPE_PRICE_PRO!,
    price: 12900,
    currency: "brl",
  },
}
