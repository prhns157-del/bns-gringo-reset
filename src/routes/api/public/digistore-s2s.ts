import { createFileRoute } from "@tanstack/react-router";

import {
  resolvePixels,
  secureEqual,
  sendTikTokConversion,
  sha256,
} from "../../../lib/tiktok-events";
import { decodeUtms, sendUtmifyOrder, UTM_KEYS, type UtmifyTracking } from "../../../lib/utmify";
import { sendXtrackyConversion } from "../../../lib/xtracky";

// Digistore24 AFFILIATE "S2S postback" → TikTok Events API + Utmify + xTracky (server side).
//
// Digistore24 calls this URL (GET) after a sale and replaces {placeholders} with the order data.
// Create the connection in Digistore24 (Sales & partners > Connections > S2S postback) with:
//
//   https://<domain>/api/public/digistore-s2s?token=<DIGISTORE_S2S_TOKEN>
//     &order_id={order_id}&value=37.12&currency=USD&ttclid={sid1}&ttp={sid2}&utm={sid3}&xt={sid4}
//
// xt = xTracky LeadId (sid4). Without it xTracky treats the sale as organic and never reports it
// to TikTok. The same id (order_id, plus payment_id when given) is used as TikTok event_id, Utmify
// orderId and xTracky orderId, so a duplicate postback is dropped by each of them.
//
// Parameters (all but token and order_id are optional):
//   token      shared secret, must equal env DIGISTORE_S2S_TOKEN
//   order_id   Digistore order id (also used for de-duplication)
//   payment_id optional, makes upsell/rebill payments of the same order distinct
//   value      conversion value. Put a fixed number, or a Digistore placeholder.
//              (Affiliate placeholders such as {amount_affiliate} are only your commission.)
//   commission optional, what you actually receive (Utmify only). Defaults to `value`.
//   currency   ISO code, default USD
//   ttclid     TikTok click id (the checkout link carries it in sid1, see param-forwarder.js)
//   ttp        TikTok pixel cookie (sid2)
//   utm        funnel UTMs as base64url(JSON) (sid3). Alternatively pass utm_source, utm_campaign,
//              utm_medium, utm_content, utm_term, src, sck directly.
//   email, name, phone, country, ip   buyer data, if Digistore exposes it to affiliates
//   payment_method  credit_card (default) | paypal | pix | boleto
//   type       optional event type; refund/chargeback values are ignored
//   product_id, product_name  optional, used as event content
//
// Environment: DIGISTORE_S2S_TOKEN, TIKTOK_PIXELS (see src/lib/tiktok-events.ts),
// UTMIFY_API_TOKEN (Utmify > Integrations > Webhooks > API Credentials),
// optional TIKTOK_TEST_EVENT_CODE (TikTok Test Events) and UTMIFY_TEST=true (validated, not saved).
// TikTok and Utmify are skipped when not configured. xTracky has no credential (see xt above).

export const Route = createFileRoute("/api/public/digistore-s2s")({
  server: {
    handlers: {
      GET: async ({ request }) => handlePostback(request),
      POST: async ({ request }) => handlePostback(request),
    },
  },
});

async function handlePostback(request: Request) {
  const expectedToken = process.env.DIGISTORE_S2S_TOKEN?.trim();
  if (!expectedToken) {
    console.error("[Digistore S2S] DIGISTORE_S2S_TOKEN is not configured");
    return textResponse("ERROR: token is not configured", 500);
  }

  const params = await readParams(request);
  if (!secureEqual(params.get("token") ?? "", expectedToken)) {
    console.error("[Digistore S2S] Invalid token");
    return textResponse("ERROR: unauthorized", 401);
  }

  const orderId = clean(params.get("order_id"));
  if (!orderId) {
    console.error("[Digistore S2S] Missing order_id", { fields: Array.from(params.keys()).sort() });
    return textResponse("ERROR: order_id is required", 400);
  }

  const type = clean(params.get("type")).toLowerCase();
  if (/refund|chargeback|cancel|revoke|fail|declin/.test(type)) {
    console.log("[Digistore S2S] Ignoring non-sale postback", { order_id: orderId, type });
    return textResponse("OK");
  }

  // Field names only (no values): shows which placeholders Digistore actually filled in.
  console.log("[Digistore S2S] fields", Array.from(params.keys()).sort());

  // TikTok (direct, server side) and Utmify are each skipped when not configured; xTracky needs
  // no credential, so it always runs when a LeadId arrives.
  const pixels = resolvePixels();
  const utmifyToken = process.env.UTMIFY_API_TOKEN?.trim() ?? "";

  // One id for TikTok event_id, Utmify orderId and xTracky orderId. If xTracky also uses its
  // orderId as the TikTok event_id, TikTok drops the second CompletePayment (48 h window).
  const paymentId = clean(params.get("payment_id"));
  const eventId = `${orderId}${paymentId ? `_${paymentId}` : ""}`
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 120);

  const user: Record<string, string> = {};
  const email = clean(params.get("email")).toLowerCase();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) user.email = await sha256(email);
  user.external_id = await sha256(orderId.toLowerCase());
  const ttclid = clean(params.get("ttclid"));
  const ttp = clean(params.get("ttp"));
  if (ttclid && !isUnfilledPlaceholder(ttclid)) user.ttclid = ttclid;
  if (ttp && !isUnfilledPlaceholder(ttp)) user.ttp = ttp;

  const value = Number(clean(params.get("value")).replace(",", "."));
  const currency = (clean(params.get("currency")) || "USD").toUpperCase().slice(0, 3);
  const testEventCode = process.env.TIKTOK_TEST_EVENT_CODE?.trim() || undefined;
  const bundled = decodeUtms(clean(params.get("utm")));

  const results = await Promise.all(
    pixels.map((pixel) =>
      sendTikTokConversion(pixel, {
        eventName: "CompletePayment",
        eventId,
        eventTime: Math.floor(Date.now() / 1000),
        value: Number.isFinite(value) && value > 0 ? value : 0,
        currency,
        orderId,
        contentId: clean(params.get("product_id")) || "unknown",
        contentName: clean(params.get("product_name")),
        user,
        pageUrl: "https://northkreepstorm.com/confirmar-saque",
        testEventCode,
      }),
    ),
  );

  // A TikTok failure must not stop Utmify/xTracky from receiving the sale, so it only decides the
  // HTTP status at the very end (non-2xx makes Digistore retry; the deterministic ids let TikTok,
  // Utmify and xTracky drop the duplicates).
  const tiktokFailed = results.some((sent) => !sent);

  // Utmify is best effort: a failure is logged but does not change the response.
  let utmifySent: boolean | null = null;
  if (utmifyToken) {
    if (!(value > 0)) {
      console.error("[Digistore S2S] Utmify skipped: value must be greater than 0", {
        order_id: orderId,
      });
    } else {
      const totalPriceInCents = Math.round(value * 100);
      const commission = Number(clean(params.get("commission")).replace(",", "."));
      const userCommissionInCents =
        Number.isFinite(commission) && commission > 0
          ? Math.min(totalPriceInCents, Math.round(commission * 100))
          : totalPriceInCents;

      const tracking = Object.fromEntries(
        UTM_KEYS.map((key) => {
          const direct = clean(params.get(key));
          return [key, (direct && !isUnfilledPlaceholder(direct) ? direct : bundled[key]) || null];
        }),
      ) as UtmifyTracking;

      const method = clean(params.get("payment_method")).toLowerCase();
      const paymentMethod = (["credit_card", "paypal", "pix", "boleto"] as const).find(
        (candidate) => candidate === method,
      );
      const phone = clean(params.get("phone"));
      const country = clean(params.get("country")).toUpperCase();
      const ip = clean(params.get("ip"));

      utmifySent = await sendUtmifyOrder(utmifyToken, {
        orderId: eventId,
        paymentMethod: paymentMethod ?? "credit_card",
        customer: {
          name: clean(params.get("name")) || "Customer",
          // Utmify requires an email; `.invalid` is reserved and never resolves to a real address.
          email: user.email ? email : `ds24-${orderId}@no-email.invalid`,
          phone: phone && !isUnfilledPlaceholder(phone) ? phone : null,
          ...(/^[A-Z]{2}$/.test(country) ? { country } : {}),
          ...(ip && !isUnfilledPlaceholder(ip) ? { ip } : {}),
        },
        product: {
          id: clean(params.get("product_id")) || "unknown",
          name: clean(params.get("product_name")) || "Digistore24 order",
        },
        totalPriceInCents,
        userCommissionInCents,
        currency,
        tracking,
        isTest: process.env.UTMIFY_TEST === "true",
      });
    }
  }

  // xTracky (main tracker) also best effort. It needs the LeadId of its V2 script, carried through
  // the checkout link as sid4 (`xt`). Fallback: the raw utm_source from the UTM bundle (sid3).
  let xtrackySent: boolean | null = null;
  const xtParam = clean(params.get("xt"));
  const leadId = (xtParam && !isUnfilledPlaceholder(xtParam) ? xtParam : bundled.utm_source) ?? "";
  if (!leadId) {
    console.error("[Digistore S2S] xTracky skipped: no LeadId (xt/sid4 missing)", {
      order_id: orderId,
    });
  } else if (!(value > 0)) {
    console.error("[Digistore S2S] xTracky skipped: value must be greater than 0", {
      order_id: orderId,
    });
  } else {
    const phone = clean(params.get("phone"));
    xtrackySent = await sendXtrackyConversion({
      orderId: eventId,
      amountInCents: Math.round(value * 100),
      currency,
      leadId,
      name: clean(params.get("name")) || undefined,
      email: user.email ? email : undefined,
      phone: phone && !isUnfilledPlaceholder(phone) ? phone : undefined,
    });
  }

  if (tiktokFailed) {
    console.error("[Digistore S2S] TikTok delivery failed", {
      order_id: orderId,
      utmify: utmifySent,
      xtracky: xtrackySent,
    });
    return textResponse("ERROR: TikTok event delivery failed", 502);
  }

  console.log("[Digistore S2S] Purchase delivered", {
    event_id: eventId,
    order_id: orderId,
    utmify: utmifySent,
    xtracky: xtrackySent,
    xtracky_lead_source: !leadId ? "none" : xtParam && !isUnfilledPlaceholder(xtParam) ? "sid4" : "utm_source",
    pixels: pixels.map((pixel) => pixel.pixelId),
    has_ttclid: Boolean(user.ttclid),
    has_ttp: Boolean(user.ttp),
    has_email: Boolean(user.email),
  });
  return textResponse("OK");
}

async function readParams(request: Request) {
  const params = new URLSearchParams(new URL(request.url).search);
  if (request.method === "POST") {
    const contentType = request.headers.get("content-type") ?? "";
    try {
      if (contentType.includes("application/json")) {
        const json = (await request.json()) as Record<string, unknown>;
        for (const [key, value] of Object.entries(json)) {
          if (value != null && !params.has(key)) params.set(key, String(value));
        }
      } else if (contentType.includes("application/x-www-form-urlencoded")) {
        new URLSearchParams(await request.text()).forEach((value, key) => {
          if (!params.has(key)) params.set(key, value);
        });
      }
    } catch {
      // Body is optional; the query string is the primary channel.
    }
  }
  return params;
}

function clean(value: string | null) {
  return (value ?? "").trim();
}

// If a placeholder is not supported/filled, Digistore may leave it literally as "{sid1}".
function isUnfilledPlaceholder(value: string) {
  return /^\{.*\}$/.test(value);
}

function textResponse(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
