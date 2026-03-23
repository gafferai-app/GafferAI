// api/webhook.js  —  Stripe webhook handler
// Place this file at: /api/webhook.js in your Vercel project
//
// Required environment variables in Vercel:
//   STRIPE_SECRET_KEY         — from Stripe Dashboard → Developers → API Keys
//   STRIPE_WEBHOOK_SECRET     — from Stripe Dashboard → Developers → Webhooks (whsec_...)
//   SUPABASE_URL              — your Supabase project URL
//   SUPABASE_SERVICE_ROLE_KEY — from Supabase → Settings → API → service_role key (NOT anon key)

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Use the SERVICE ROLE key here — this bypasses RLS so we can update any user's profile
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Plan config — maps Stripe price IDs to profile updates
// Replace these price IDs with your actual ones from Stripe Dashboard → Products
const PLAN_CONFIG = {
  // Starter Week — £1 one-time
  "price_1TC5FD3K0hcsqeHWoFeZpOs8": { plan: "trial", generations_limit: 10 },

  // Pro Plan — £4.99/month
  "price_1TC5F93K0hcsqeHWcCwxYsVU": { plan: "pro", generations_limit: 35 },

  // Elite Plan — £8.99/month
  "price_1TDrju3K0hcsqeHWf1dqQIY6": { plan: "elite", generations_limit: 70 },
};

// Disable body parsing — Stripe needs the raw body to verify the signature
export const config = { api: { bodyParser: false } };

// Helper to read raw body from the request stream
async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", chunk => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const sig = req.headers["stripe-signature"];
  const rawBody = await getRawBody(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  console.log("Stripe webhook received:", event.type);

  try {
    switch (event.type) {

      // ── One-time payment completed (Starter Week) ──────────────────────
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId  = session.metadata?.userId;
        const plan    = session.metadata?.plan;

        if (!userId) {
          console.error("No userId in session metadata");
          break;
        }

        // Get the right config based on plan name passed in metadata
        let updates;
        if (plan === "starter") {
          updates = { plan: "trial", generations_limit: 10 };
        } else if (plan === "pro") {
          updates = { plan: "pro", generations_limit: 35 };
        } else if (plan === "elite") {
          updates = { plan: "elite", generations_limit: 70 };
        }

        // For subscriptions, wait for invoice.payment_succeeded instead
        if (session.mode === "subscription") break;

        if (updates) {
          const { error } = await supabase
            .from("profiles")
            .update(updates)
            .eq("id", userId);

          if (error) {
            console.error("Supabase update failed:", error.message);
          } else {
            console.log(`✅ Updated ${userId} to ${updates.plan} (${updates.generations_limit} gens)`);
          }
        }
        break;
      }

      // ── Subscription payment succeeded (Pro / Elite monthly) ───────────
      case "invoice.payment_succeeded": {
        const invoice        = event.data.object;
        const subscriptionId = invoice.subscription;

        if (!subscriptionId) break;

        // Fetch the subscription to get the price ID and metadata
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId      = subscription.items.data[0]?.price?.id;
        const userId       = subscription.metadata?.userId;

        if (!userId) {
          console.error("No userId in subscription metadata");
          break;
        }

        // Match price ID to plan config
        const planConfig = PLAN_CONFIG[priceId];
        if (planConfig) {
          const { error } = await supabase
            .from("profiles")
            .update(planConfig)
            .eq("id", userId);

          if (error) {
            console.error("Supabase update failed:", error.message);
          } else {
            console.log(`✅ Subscription renewed: ${userId} → ${planConfig.plan}`);
          }
        } else {
          console.warn(`Unknown price ID: ${priceId}. Add it to PLAN_CONFIG in webhook.js`);
        }
        break;
      }

      // ── Subscription cancelled / payment failed ────────────────────────
      case "customer.subscription.deleted":
      case "invoice.payment_failed": {
        const obj            = event.data.object;
        const subscriptionId = obj.subscription || obj.id;

        if (!subscriptionId) break;

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const userId       = subscription.metadata?.userId;

        if (!userId) break;

        // Downgrade back to free plan
        const { error } = await supabase
          .from("profiles")
          .update({ plan: "free", generations_limit: 5 })
          .eq("id", userId);

        if (error) {
          console.error("Supabase downgrade failed:", error.message);
        } else {
          console.log(`⚠️ Downgraded ${userId} to free (subscription ended/failed)`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }

  // Always return 200 so Stripe knows we received it
  res.status(200).json({ received: true });
}
