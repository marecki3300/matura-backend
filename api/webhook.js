import Stripe from 'stripe';
import { Resend } from 'resend';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const rawBody = Buffer.concat(chunks);

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.customer_details.email;

    try {
      // Pobierz PDF
      const response = await fetch(process.env.EBOOK_URL);
      const pdfBuffer = await response.arrayBuffer();
      const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');

      // Wyślij email z PDF jako załącznik
      await resend.emails.send({
        from: 'noreply@matura-angielski-2026.pl',
        to: email,
        subject: '📘 Twój ebook – Matura Angielski 2026',
        html: `
          <h2>Dziękujemy za zakup!</h2>
          <p>W załączniku znajdziesz swój e-book.</p>
          <p>Powodzenia na maturze! 🍀</p>
        `,
        attachments: [
          {
            filename: 'Matura-Angielski-2026.pdf',
            content: pdfBase64,
          },
        ],
      });
    } catch (err) {
      console.error('Błąd:', err.message);
      return res.status(500).send('Błąd przetwarzania');
    }
  }

  res.status(200).json({ received: true });
}
