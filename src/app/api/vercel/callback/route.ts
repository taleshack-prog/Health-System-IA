import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/neon/client"
import { createHash, randomBytes } from "crypto"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") || "https://vercel.com"

  if (!code) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  try {
    const tokenRes = await fetch("https://api.vercel.com/v2/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.VERCEL_CLIENT_ID!,
        client_secret: process.env.VERCEL_CLIENT_SECRET!,
        code,
        redirect_uri: process.env.NEXT_PUBLIC_APP_URL + "/api/vercel/callback",
      }),
    })

    const token = await tokenRes.json()
    if (!token.access_token) throw new Error("Token invalido")

    const userRes = await fetch("https://api.vercel.com/v2/user", {
      headers: { Authorization: "Bearer " + token.access_token },
    })
    const userData = await userRes.json()

    const projectsRes = await fetch("https://api.vercel.com/v9/projects?limit=50", {
      headers: { Authorization: "Bearer " + token.access_token, "x-vercel-team-id": token.team_id || "" },
    })
    const projectsData = await projectsRes.json()
    const vercelProjects = projectsData.projects || []

    const email = userData.user?.email
    if (!email) throw new Error("Email nao encontrado")

    let userRows = await sql("SELECT id FROM hack_tech_farm.users WHERE email = $1 LIMIT 1", [email])
    let userId: string

    if (!userRows.length) {
      const name = userData.user?.name || email.split("@")[0]
      const passwordHash = createHash("sha256").update(randomBytes(32).toString("hex")).digest("hex")
      const newUser = await sql(
        "INSERT INTO hack_tech_farm.users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id",
        [email, passwordHash, name]
      )
      userId = newUser[0].id as string

      const tierRows = await sql("SELECT id FROM hack_tech_farm.tiers WHERE code = $1 LIMIT 1", ["starter"])
      const tierId = tierRows[0]?.id ?? 1
      const slug = email.split("@")[0].replace(/[^a-z0-9]/gi, "-").toLowerCase() + "-" + Date.now()

      const orgRows = await sql(
        "INSERT INTO hack_tech_farm.organizations (name, slug, tier_id) VALUES ($1, $2, $3) RETURNING id",
        [userData.user?.name || email, slug, tierId]
      )
      await sql(
        "INSERT INTO hack_tech_farm.organization_members (organization_id, user_id, role) VALUES ($1, $2, $3)",
        [orgRows[0].id, userId, "owner"]
      )

      for (const vp of vercelProjects.slice(0, 3)) {
        const apiKey = "hf_" + randomBytes(32).toString("hex")
        const apiKeyHash = createHash("sha256").update(apiKey).digest("hex")
        const countRows = await sql("SELECT COUNT(*) as c FROM hack_tech_farm.projects")
        const chId = Number(countRows[0].c) + 1
        const pSlug = vp.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now()

        await sql(
          "INSERT INTO hack_tech_farm.projects (organization_id, name, slug, clickhouse_project_id, api_key_hash) VALUES ($1, $2, $3, $4, $5)",
          [orgRows[0].id, vp.name, pSlug, chId, apiKeyHash]
        )

        await fetch("https://api.vercel.com/v10/projects/" + vp.id + "/env", {
          method: "POST",
          headers: {
            Authorization: "Bearer " + token.access_token,
            "Content-Type": "application/json",
            ...(token.team_id ? { "x-vercel-team-id": token.team_id } : {}),
          },
          body: JSON.stringify({
            key: "HACKFARM_API_KEY",
            value: apiKey,
            type: "encrypted",
            target: ["production", "preview", "development"],
          }),
        })
      }
    } else {
      userId = userRows[0].id as string
    }

    return NextResponse.redirect(new URL("/dashboard", req.url))
  } catch (err) {
    console.error("[Vercel OAuth]", err)
    return NextResponse.redirect(new URL("/dashboard?error=vercel_auth", req.url))
  }
}
