import Stripe from "stripe";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const { plan, userId, email } = req.body;
    const prices = {
      starter: "price_1TC5FD3K0hcsqeHWoFeZpOs8",
      pro: "price_1TC5F93K0hcsqeHWcCwxYsVU",
      elite:"price_1TDrju3K0hcsqeHWf1dqQIY6",
    };
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      customer_email: email,
      line_items: [{ price: prices[plan], quantity: 1 }],
      mode: (plan === "pro" || plan === "elite") ? "subscription" : "payment",
      success_url: `https://gaffer-ai-eight.vercel.app?upgraded=${plan}`,
      cancel_url: "https://gaffer-ai-eight.vercel.app",
    });
    res.status(200).json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
