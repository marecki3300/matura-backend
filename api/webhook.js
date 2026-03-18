import Stripe from 'stripe';
import { Resend } from 'resend';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.customer_details.email;

    await resend.emails.send({
      from: 'noreply@matura-angielski-2026.pl',
      to: email,
      subject: '📘 Twój ebook – Matura Angielski 2026',
      html: `
        <h2>Dziękujemy za zakup!</h2>
        <p>Kliknij poniższy przycisk, aby pobrać ebooka:</p>
        <a href="${process.env.EBOOK_URL}" 
           style="background:#000;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">
          📥 Pobierz ebooka
        </a>
        <p>Link wygasa po 24 godzinach.</p>
      `
    });
  }

  res.status(200).json({ received: true });
}