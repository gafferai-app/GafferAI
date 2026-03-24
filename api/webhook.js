// api/webhook.js  —  Stripe webhook handler
// Place this file at: /api/webhook.js in your Vercel project
//
// Required environment variables in Vercel:
//   STRIPE_SECRET_KEY         — Stripe Dashboard → Developers → API Keys → Secret key
//   STRIPE_WEBHOOK_SECRET     — Stripe Dashboard → Developers → Webhooks → Signing secret (whsec_...)
//   SUPABASE_URL              — Supabase → Settings → API → Project URL
//   SUPABASE_SERVICE_ROLE_KEY — Supabase → Settings → API → service_role key (NOT anon key)

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// SERVICE ROLE key bypasses RLS — never expose this client-side
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── Replace these with your actual Stripe Price IDs ───────────────────────
// Find them: Stripe Dashboard → Product catalogue → click each product → copy Price ID
const PRICE_TO_PLAN = {
  // "price_XXXXXXXXXXXXXXXX": { plan: "trial",  generations_limit: 10 }, // Starter £1
  // "price_XXXXXXXXXXXXXXXX": { plan: "pro",    generations_limit: 35 }, // Pro £4.99/mo
  // "price_XXXXXXXXXXXXXXXX": { plan: "elite",  generations_limit: 70 }, // Elite £8.99/mo
};
// ─────────────────────────────────────────────────────────────────────────

export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", chunk => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function updateProfile(userId, updates) {
  const { error } = await supabase.from("profiles").update(updates).eq("id", userId);
  if (error) console.error(`Failed to update profile ${userId}:`, error.message);
  else console.log(`Updated profile ${userId}:`, JSON.stringify(updates));
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const sig     = req.headers["stripe-signature"];
  const rawBody = await getRawBody(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature failed:", err.message);
    return res.status(400).json({ error: err.message });
  }

  const now = new Date();

  try {
    switch (event.type) {

      // One-time payment (Starter Week)
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode === "subscription") break;
        const userId = session.metadata?.userId;
        const plan   = session.metadata?.plan;
        if (!userId) break;

        if (plan === "starter") {
          await updateProfile(userId, {
            plan: "trial", generations_limit: 10, generations_used: 0,
            trial_started_at: now.toISOString(),
          });
        } else if (plan === "pro") {
          await updateProfile(userId, {
            plan: "pro", generations_limit: 35, generations_used: 0,
            subscription_start_day: now.getDate(), trial_started_at: null,
          });
        } else if (plan === "elite") {
          await updateProfile(userId, {
            plan: "elite", generations_limit: 70, generations_used: 0,
            subscription_start_day: now.getDate(), trial_started_at: null,
          });
        }
        break;
      }

      // Monthly subscription renewal (Pro/Elite)
      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        if (!invoice.subscription) break;
        const sub     = await stripe.subscriptions.retrieve(invoice.subscription);
        const priceId = sub.items.data[0]?.price?.id;
        const userId  = sub.metadata?.userId;
        if (!userId) break;

        let updates = PRICE_TO_PLAN[priceId];
        if (!updates) {
          const p = sub.metadata?.plan;
          if (p === "pro")   updates = { plan: "pro",   generations_limit: 35 };
          if (p === "elite") updates = { plan: "elite",  generations_limit: 70 };
        }
        if (updates) {
          await updateProfile(userId, {
            ...updates, generations_used: 0,
            subscription_start_day: now.getDate(), trial_started_at: null,
          });
        }
        break;
      }

      // Subscription cancelled
      case "customer.subscription.deleted": {
        const sub    = event.data.object;
        const userId = sub.metadata?.userId;
        if (!userId) break;
        await updateProfile(userId, {
          plan: "free", generations_limit: 5, generations_used: 0,
          subscription_start_day: null, trial_started_at: null,
        });
        break;
      }

      // Payment failed
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        if (!invoice.subscription) break;
        const sub    = await stripe.subscriptions.retrieve(invoice.subscription);
        const userId = sub.metadata?.userId;
        if (!userId) break;
        await updateProfile(userId, {
          plan: "free", generations_limit: 5, generations_used: 0,
          subscription_start_day: null,
        });
        break;
      }

      default:
        console.log(`Unhandled event: ${event.type}`);
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return res.status(500).json({ error: "Internal error" });
  }

  res.status(200).json({ received: true });
}
