import { createFileRoute } from "@tanstack/react-router";

import { deliverToUtmifyAndXtracky, type Sale } from "../../../lib/sale-delivery";
import { resolvePixels, secureEqual, sha256 } from "../../../lib/tiktok-events";
import { UTM_KEYS } from "../../../lib/utmify";

const TIKTOK_EVENTS_API = "https://business-api.tiktok.com/open_api/v1.3/event/track/";

type IpnPayload = Record<string, string>;

export const Route = createFileRoute("/api/public/digistore24-ipn")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const passphrase = process.env.DIGISTORE24_IPN_PASSPHRASE;
        if (!passphrase) {
          console.error("[Digistore24 IPN] DIGISTORE24_IPN_PASSPHRASE is not configured");
          return textResponse("ERROR: IPN passphrase is not configured", 500);
        }

        let payload: IpnPayload;
        try {
          payload = await parseIpnPayload(request);
        } catch (error) {
          console.error("[Digistore24 IPN] Invalid request body", error);
          return textResponse("ERROR: invalid request body", 400);
        }

        const receivedSignature = payload.sha_sign ?? payload.SHASIGN ?? "";
        const expectedSignature = await createDigistoreSignature(passphrase, payload);
        if (!secureEqual(receivedSignature.toUpperCase(), expectedSignature)) {
          console.error("[Digistore24 IPN] Invalid SHA-512 signature", {
            content_type: request.headers.get("content-type") ?? "",
            keys: Object.keys(payload).sort(compareAscii),
          });
          return textResponse("ERROR: invalid sha signature", 401);
        }

        const event = payload.event ?? "";
        if (event === "connection_test") {
          return textResponse("OK");
        }
        if (event !== "on_payment") {
          console.log("[Digistore24 IPN] Ignoring non-payment event", event);
          return textResponse("OK");
        }

        // While TIKTOK_TEST_EVENT_CODE is set, Digistore test payments are forwarded as TikTok
        // test events (visible only in Events Manager > Test Events). Remove it for production.
        const testEventCode = process.env.TIKTOK_TEST_EVENT_CODE?.trim() ?? "";
        if ((payload.api_mode ?? "").toLowerCase() !== "live" && !testEventCode) {
          console.log("[Digistore24 IPN] Test payment accepted without production event");
          return textResponse("OK");
        }

        // Field names only (no values): confirms whether sid1/sid2/ip arrive from Digistore.
        console.log("[Digistore24 IPN] on_payment fields", Object.keys(payload).sort(compareAscii));

        const pixels = resolvePixels();
        if (pixels.length === 0) {
          console.warn("[Digistore24 IPN] No TikTok pixel with an access token: skipping TikTok");
        }

        const results = await Promise.all(
          pixels.map((pixel) =>
            sendCompletePayment(pixel.accessToken, pixel.pixelId, payload, testEventCode),
          ),
        );
        // A TikTok failure must not stop Utmify/xTracky from receiving the sale: it only decides
        // the HTTP status at the end (non-2xx makes Digistore retry; ids de-duplicate everywhere).
        const tiktokFailed = results.some((sent) => !sent);

        const delivery = await deliverToUtmifyAndXtracky(buildSale(payload));

        if (tiktokFailed) {
          console.error("[Digistore24 IPN] TikTok delivery failed", {
            order_id: payload.order_id ?? "",
            utmify: delivery.utmify,
            xtracky: delivery.xtracky,
          });
          return textResponse("ERROR: TikTok event delivery failed", 502);
        }

        console.log("[Digistore24 IPN] Purchase delivered", {
          event_id: buildEventId(payload),
          order_id: payload.order_id ?? "",
          payment_id: payload.payment_id ?? "",
          pixels: pixels.map((pixel) => pixel.pixelId),
          utmify: delivery.utmify,
          xtracky: delivery.xtracky,
          xtracky_lead_source: delivery.leadSource,
        });
        return textResponse("OK");
      },
    },
  },
});

async function parseIpnPayload(request: Request): Promise<IpnPayload> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const json = (await request.json()) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(json).map(([key, value]) => [key, value == null ? "" : String(value)]),
    );
  }

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const form = await request.formData();
    const payload: IpnPayload = {};
    form.forEach((value, key) => {
      if (typeof value === "string") payload[key] = value;
    });
    return payload;
  }

  const body = await request.text();
  return Object.fromEntries(new URLSearchParams(body));
}

async function createDigistoreSignature(passphrase: string, payload: IpnPayload) {
  const signatureInput = Object.keys(payload)
    .filter((key) => key !== "sha_sign" && key !== "SHASIGN" && payload[key] !== "")
    .sort(compareAscii)
    .map((key) => `${key}=${payload[key]}${passphrase}`)
    .join("");

  const digest = await crypto.subtle.digest("SHA-512", new TextEncoder().encode(signatureInput));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

function compareAscii(left: string, right: string) {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

async function sendCompletePayment(
  accessToken: string,
  pixelId: string,
  payload: IpnPayload,
  testEventCode: string,
) {
  const email = (payload.email ?? payload.buyer_email ?? "").trim().toLowerCase();
  const phone = normalizePhone(payload.address_phone_no ?? "");
  const orderId = payload.order_id ?? "";
  const value = Number(payload.transaction_amount ?? payload.amount_brutto ?? 0) || 0;
  const quantity = Math.max(1, Number(payload.quantity ?? 1) || 1);

  const user: Record<string, string> = {};
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) user.email = await sha256(email);
  if (phone) user.phone = await sha256(phone);
  if (orderId) user.external_id = await sha256(orderId.toLowerCase());

  // The checkout link carries the ad click id (sid1) and the pixel cookie (sid2),
  // see public/param-forwarder.js. They tie the sale back to the ad click.
  const ttclid = (payload.sid1 ?? "").trim();
  const ttp = (payload.sid2 ?? "").trim();
  if (ttclid) user.ttclid = ttclid;
  if (ttp) user.ttp = ttp;
  const ip = (payload.ip ?? payload.buyer_ip ?? "").trim();
  if (/^[0-9a-fA-F:.]{3,45}$/.test(ip)) user.ip = ip;

  const response = await fetch(TIKTOK_EVENTS_API, {
    method: "POST",
    headers: {
      "Access-Token": accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      event_source: "web",
      event_source_id: pixelId,
      ...(testEventCode ? { test_event_code: testEventCode } : {}),
      data: [
        {
          event: "CompletePayment",
          event_time: parseEventTime(payload.transaction_processed_at),
          event_id: buildEventId(payload),
          user,
          properties: {
            currency: (payload.transaction_currency ?? payload.currency ?? "USD").toUpperCase(),
            value,
            order_id: orderId,
            contents: [
              {
                content_id: payload.product_id ?? "unknown",
                content_type: "product",
                content_name: payload.product_name ?? "",
                quantity,
                price: value / quantity,
              },
            ],
          },
          page: {
            url: "https://northkreepstorm.com/confirmar-saque",
          },
        },
      ],
    }),
  });

  const result = (await response.json().catch(() => ({}))) as {
    code?: number;
    message?: string;
  };
  const sent = response.ok && (result.code == null || result.code === 0);
  if (!sent) {
    console.error("[Digistore24 IPN] TikTok rejected event", {
      code: result.code ?? response.status,
      message: result.message ?? "",
      pixel_id: pixelId,
    });
  }
  return sent;
}

// One id for TikTok event_id, Utmify orderId and xTracky orderId. If xTracky also uses its orderId
// as the TikTok event_id, TikTok drops the second CompletePayment (48 h window).
function buildEventId(payload: IpnPayload) {
  const orderId = payload.order_id ?? "unknown";
  const paymentId = payload.payment_id ?? payload.transaction_id ?? "";
  return `${orderId}${paymentId ? `_${paymentId}` : ""}`
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 120);
}

// Maps the IPN payload to a Sale for Utmify/xTracky. The checkout link carries the funnel data in
// sid1..sid4 (public/param-forwarder.js): sid3 = UTM bundle, sid4 = xTracky LeadId.
function buildSale(payload: IpnPayload): Sale {
  const pick = (...keys: string[]) => {
    for (const key of keys) {
      const value = (payload[key] ?? "").trim();
      if (value) return value;
    }
    return "";
  };
  const number = (...keys: string[]) => Number(pick(...keys).replace(",", ".")) || 0;
  const name = [pick("address_first_name", "first_name"), pick("address_last_name", "last_name")]
    .filter(Boolean)
    .join(" ");
  const email = pick("email", "buyer_email").toLowerCase();
  const ip = pick("ip", "buyer_ip");

  return {
    id: buildEventId(payload),
    // Full amount paid by the buyer. No `commission`: the sale counts at its full value in Utmify
    // (the vendor/affiliate split would show only cents there).
    value: number("transaction_amount", "amount_brutto"),
    currency: (pick("transaction_currency", "currency") || "USD").toUpperCase().slice(0, 3),
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "",
    name,
    phone: normalizePhone(pick("address_phone_no")),
    country: pick("address_country"),
    ip: /^[0-9a-fA-F:.]{3,45}$/.test(ip) ? ip : "",
    paymentMethod: pick("pay_method", "payment_method"),
    productId: pick("product_id"),
    productName: pick("product_name"),
    utmBundle: pick("sid3"),
    utms: Object.fromEntries(UTM_KEYS.map((key) => [key, pick(key)])),
    leadId: pick("sid4"),
  };
}

function parseEventTime(raw: string | undefined) {
  if (raw) {
    const normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
    const timestamp = Date.parse(normalized);
    if (Number.isFinite(timestamp)) return Math.floor(timestamp / 1000);
  }
  return Math.floor(Date.now() / 1000);
}

function normalizePhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (raw.trim().startsWith("+")) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

function textResponse(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
