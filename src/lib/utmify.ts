// Server-side sales submission to Utmify (https://docs.utmify.com.br/send-orders).
// POST https://api.utmify.com.br/api-credentials/orders, auth header `x-api-token`.

const UTMIFY_ORDERS_API = "https://api.utmify.com.br/api-credentials/orders";

export const UTM_KEYS = [
  "src",
  "sck",
  "utm_source",
  "utm_campaign",
  "utm_medium",
  "utm_content",
  "utm_term",
] as const;

export type UtmifyTracking = Record<(typeof UTM_KEYS)[number], string | null>;

export type UtmifyOrderInput = {
  orderId: string;
  paymentMethod: "credit_card" | "boleto" | "pix" | "paypal" | "free_price";
  customer: {
    name: string;
    email: string;
    phone: string | null;
    country?: string;
    ip?: string;
  };
  product: { id: string; name: string };
  totalPriceInCents: number;
  userCommissionInCents: number;
  currency: string;
  tracking: UtmifyTracking;
  isTest: boolean;
};

// Utmify wants "YYYY-MM-DD HH:MM:SS" in UTC.
function utcStamp(date = new Date()) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

// The checkout link carries the funnel's UTMs as base64url(JSON) in one Digistore sub-id
// (see public/param-forwarder.js), because a postback URL can't be trusted with raw `|` / `&`.
export function decodeUtms(encoded: string): Partial<Record<string, string>> {
  if (!encoded) return {};
  try {
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
    const result: Partial<Record<string, string>> = {};
    for (const key of UTM_KEYS) {
      const value = parsed[key];
      if (typeof value === "string" && value.trim()) result[key] = value.trim();
    }
    return result;
  } catch {
    return {};
  }
}

export async function sendUtmifyOrder(apiToken: string, order: UtmifyOrderInput) {
  const now = utcStamp();
  const response = await fetch(UTMIFY_ORDERS_API, {
    method: "POST",
    headers: { "x-api-token": apiToken, "Content-Type": "application/json" },
    body: JSON.stringify({
      orderId: order.orderId,
      platform: "Digistore24",
      paymentMethod: order.paymentMethod,
      status: "paid",
      createdAt: now,
      approvedDate: now,
      refundedAt: null,
      customer: {
        name: order.customer.name,
        email: order.customer.email,
        phone: order.customer.phone,
        document: null,
        ...(order.customer.country ? { country: order.customer.country } : {}),
        ...(order.customer.ip ? { ip: order.customer.ip } : {}),
      },
      products: [
        {
          id: order.product.id,
          name: order.product.name,
          planId: null,
          planName: null,
          quantity: 1,
          priceInCents: order.totalPriceInCents,
        },
      ],
      trackingParameters: order.tracking,
      commission: {
        totalPriceInCents: order.totalPriceInCents,
        gatewayFeeInCents: Math.max(0, order.totalPriceInCents - order.userCommissionInCents),
        userCommissionInCents: order.userCommissionInCents,
        currency: order.currency,
      },
      ...(order.isTest ? { isTest: true } : {}),
    }),
  });

  const text = await response.text().catch(() => "");
  if (!response.ok) {
    console.error("[Utmify] Order rejected", {
      status: response.status,
      order_id: order.orderId,
      response: text.slice(0, 300),
    });
  }
  return response.ok;
}
