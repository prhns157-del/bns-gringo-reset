// Shared server-side helpers for the TikTok Events API (Events 2.0, server → TikTok).
// Used by the Digistore24 S2S postback route and the Digistore24 IPN route.

const TIKTOK_EVENTS_API = "https://business-api.tiktok.com/open_api/v1.3/event/track/";
const DEFAULT_PIXEL_ID = "DB8462BC77U5AOV8DVGG";

export type TikTokPixel = { pixelId: string; accessToken: string };

// Each TikTok pixel has its own Events API token.
// TIKTOK_PIXELS="PIXEL_ID:TOKEN,PIXEL_ID:TOKEN"  (an entry without a token uses TIKTOK_ACCESS_TOKEN).
// Legacy fallback: TIKTOK_PIXEL_IDS (comma list) + TIKTOK_ACCESS_TOKEN shared by all of them.
export function resolvePixels(): TikTokPixel[] {
  const sharedToken = process.env.TIKTOK_ACCESS_TOKEN?.trim() ?? "";
  const pixels = new Map<string, string>();

  for (const entry of (process.env.TIKTOK_PIXELS ?? "").split(",")) {
    const [rawId, ...rawToken] = entry.split(":");
    const pixelId = rawId?.trim() ?? "";
    if (!pixelId) continue;
    const accessToken = rawToken.join(":").trim() || sharedToken;
    if (!accessToken) {
      console.error("[TikTok] Pixel has no access token, skipping", { pixel_id: pixelId });
      continue;
    }
    pixels.set(pixelId, accessToken);
  }

  if (pixels.size === 0 && sharedToken) {
    const legacyIds = (process.env.TIKTOK_PIXEL_IDS ?? DEFAULT_PIXEL_ID)
      .split(",")
      .map((pixelId) => pixelId.trim())
      .filter(Boolean);
    for (const pixelId of legacyIds) pixels.set(pixelId, sharedToken);
  }

  return Array.from(pixels, ([pixelId, accessToken]) => ({ pixelId, accessToken }));
}

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function secureEqual(left: string, right: string) {
  if (left.length !== right.length || left.length === 0) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index++) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

export type TikTokConversion = {
  eventName: string;
  eventId: string;
  eventTime: number; // unix seconds
  value: number;
  currency: string;
  orderId: string;
  contentId: string;
  contentName: string;
  user: Record<string, string>; // already hashed / raw as TikTok expects
  pageUrl: string;
  testEventCode?: string;
};

export async function sendTikTokConversion(pixel: TikTokPixel, conversion: TikTokConversion) {
  const response = await fetch(TIKTOK_EVENTS_API, {
    method: "POST",
    headers: {
      "Access-Token": pixel.accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      event_source: "web",
      event_source_id: pixel.pixelId,
      ...(conversion.testEventCode ? { test_event_code: conversion.testEventCode } : {}),
      data: [
        {
          event: conversion.eventName,
          event_time: conversion.eventTime,
          event_id: conversion.eventId,
          user: conversion.user,
          properties: {
            currency: conversion.currency,
            value: conversion.value,
            order_id: conversion.orderId,
            contents: [
              {
                content_id: conversion.contentId,
                content_type: "product",
                content_name: conversion.contentName,
                quantity: 1,
                price: conversion.value,
              },
            ],
          },
          page: { url: conversion.pageUrl },
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
    console.error("[TikTok] Event rejected", {
      code: result.code ?? response.status,
      message: result.message ?? "",
      pixel_id: pixel.pixelId,
    });
  }
  return sent;
}
