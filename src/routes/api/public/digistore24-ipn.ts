import { createFileRoute } from "@tanstack/react-router";

const TIKTOK_EVENTS_API = "https://business-api.tiktok.com/open_api/v1.3/event/track/";
const DEFAULT_PIXEL_ID = "DB8462BC77U5AOV8DVGG";

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

        if ((payload.api_mode ?? "").toLowerCase() !== "live") {
          console.log("[Digistore24 IPN] Test payment accepted without production event");
          return textResponse("OK");
        }

        const accessToken = process.env.TIKTOK_ACCESS_TOKEN;
        if (!accessToken) {
          console.error("[Digistore24 IPN] TIKTOK_ACCESS_TOKEN is not configured");
          return textResponse("ERROR: TikTok access token is not configured", 500);
        }

        const pixelIds = (process.env.TIKTOK_PIXEL_IDS ?? DEFAULT_PIXEL_ID)
          .split(",")
          .map((pixelId) => pixelId.trim())
          .filter(Boolean);

        if (pixelIds.length === 0) {
          return textResponse("ERROR: no TikTok pixel is configured", 500);
        }

        const results = await Promise.all(
          pixelIds.map((pixelId) => sendCompletePayment(accessToken, pixelId, payload)),
        );
        if (results.some((sent) => !sent)) {
          return textResponse("ERROR: TikTok event delivery failed", 502);
        }

        console.log("[Digistore24 IPN] Purchase delivered", {
          event_id: buildEventId(payload),
          order_id: payload.order_id ?? "",
          payment_id: payload.payment_id ?? "",
          pixels: pixelIds,
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

function secureEqual(left: string, right: string) {
  if (left.length !== right.length || left.length === 0) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index++) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

async function sendCompletePayment(accessToken: string, pixelId: string, payload: IpnPayload) {
  const email = (payload.email ?? payload.buyer_email ?? "").trim().toLowerCase();
  const phone = normalizePhone(payload.address_phone_no ?? "");
  const orderId = payload.order_id ?? "";
  const value = Number(payload.transaction_amount ?? payload.amount_brutto ?? 0) || 0;
  const quantity = Math.max(1, Number(payload.quantity ?? 1) || 1);

  const user: Record<string, string> = {};
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) user.email = await sha256(email);
  if (phone) user.phone = await sha256(phone);
  if (orderId) user.external_id = await sha256(orderId.toLowerCase());

  const response = await fetch(TIKTOK_EVENTS_API, {
    method: "POST",
    headers: {
      "Access-Token": accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      event_source: "web",
      event_source_id: pixelId,
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
            url: payload.receipt_url ?? "https://northcrestdigital.life/thanks",
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

function buildEventId(payload: IpnPayload) {
  const paymentId = payload.payment_id ?? payload.transaction_id ?? payload.order_id ?? "unknown";
  const productId = payload.product_id ?? "unknown";
  return `ds24_${paymentId}_${productId}`.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 120);
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

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function textResponse(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
