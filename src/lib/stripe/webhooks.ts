import Stripe from "stripe"

export async function handleWebhookEvent(event: Stripe.Event) {
  switch (event.type) {
    case "payment_intent.succeeded":
      // TODO: confirm booking, send confirmation email
      break
    case "payment_intent.payment_failed":
      // TODO: notify client of failure
      break
    case "refund.created":
      // TODO: update booking status, notify client
      break
    default:
      break
  }
}
