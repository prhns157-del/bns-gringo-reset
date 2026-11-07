// Delivers one confirmed Digistore24 sale to Utmify (revenue) and xTracky (tracking).
// Shared by the Digistore24 IPN route (vendor account) and the S2S postback route.
// Both destinations are best effort: failures are logged and returned, never thrown.

import { decodeUtms, sendUtmifyOrder, UTM_KEYS, type UtmifyTracking } from "./utmify";
import { sendXtrackyConversion } from "./xtracky";

export type Sale = {
  /** Same id for TikTok event_id, Utmify orderId and xTracky orderId (de-duplication). */
  id: string;
  /** Full sale value in major units (37.66). */
  value: number;
  /** What the seller actually receives, major units. Defaults to `value`. */
  commission?: number;
  currency: string;
  /** Plain lower-case buyer email, "" when unknown. */
  email: string;
  name: string;
  phone: string;
  country: string;
  ip: string;
  paymentMethod: string;
  productId: string;
  productName: string;
  /** base64url(JSON) of the funnel UTMs (checkout link sid3). */
  utmBundle: string;
  /** utm_source / utm_campaign / ... when the source gives them directly. */
  utms: Partial<Record<string, string>>;
  /** xTracky V2 LeadId (checkout link sid4). */
  leadId: string;
};

export type DeliveryResult = {
  utmify: boolean | null;
  xtracky: boolean | null;
  leadSource: "sid4" | "utm_source" | "none";
};

export async function deliverToUtmifyAndXtracky(sale: Sale): Promise<DeliveryResult> {
  const bundled = decodeUtms(sale.utmBundle);
  const totalPriceInCents = Math.round(sale.value * 100);
  const result: DeliveryResult = { utmify: null, xtracky: null, leadSource: "none" };

  const utmifyToken = process.env.UTMIFY_API_TOKEN?.trim() ?? "";
  if (utmifyToken) {
    if (!(sale.value > 0)) {
      console.error("[Sale] Utmify skipped: value must be greater than 0", { order_id: sale.id });
    } else {
      const userCommissionInCents =
        sale.commission && sale.commission > 0
          ? Math.min(totalPriceInCents, Math.round(sale.commission * 100))
          : totalPriceInCents;

      const tracking = Object.fromEntries(
        UTM_KEYS.map((key) => [key, sale.utms[key] || bundled[key] || null]),
      ) as UtmifyTracking;

      const method = sale.paymentMethod.toLowerCase();
      const paymentMethod = method.includes("paypal")
        ? "paypal"
        : method.includes("pix")
          ? "pix"
          : method.includes("boleto")
            ? "boleto"
            : "credit_card";
      const country = sale.country.toUpperCase();

      result.utmify = await sendUtmifyOrder(utmifyToken, {
        orderId: sale.id,
        paymentMethod,
        customer: {
          name: sale.name || "Customer",
          // Utmify requires an email; `.invalid` is reserved and never resolves to a real address.
          email: sale.email || `ds24-${sale.id}@no-email.invalid`,
          phone: sale.phone || null,
          ...(/^[A-Z]{2}$/.test(country) ? { country } : {}),
          ...(sale.ip ? { ip: sale.ip } : {}),
        },
        product: { id: sale.productId || "unknown", name: sale.productName || "Digistore24 order" },
        totalPriceInCents,
        userCommissionInCents,
        currency: sale.currency,
        tracking,
        isTest: process.env.UTMIFY_TEST === "true",
      });
    }
  }

  // xTracky only attributes a sale to a click through the LeadId of its V2 script (e.g.
  // "TT-1794024187676-81njj1veoyxy1"). The V2 script also writes that LeadId into the page URL's
  // utm_source, which Digistore returns in the IPN, so it is a reliable second source.
  const looksLikeLeadId = (value: string) => /^[A-Za-z]{2}-\d{10,}-[A-Za-z0-9]+$/.test(value);
  const candidates: [DeliveryResult["leadSource"], string][] = [
    ["sid4", sale.leadId],
    ["utm_source", sale.utms.utm_source ?? ""],
    ["utm_source", bundled.utm_source ?? ""],
  ];
  const found = candidates.find(([, value]) => looksLikeLeadId(value));
  const leadId = found?.[1] ?? "";
  result.leadSource = found?.[0] ?? "none";
  if (!leadId) {
    console.error("[Sale] xTracky skipped: no LeadId (sid4 / utm_source)", {
      order_id: sale.id,
      utm_source: (sale.utms.utm_source ?? bundled.utm_source ?? "").slice(0, 24),
    });
  } else if (!(sale.value > 0)) {
    console.error("[Sale] xTracky skipped: value must be greater than 0", { order_id: sale.id });
  } else {
    result.xtracky = await sendXtrackyConversion({
      orderId: sale.id,
      amountInCents: totalPriceInCents,
      currency: sale.currency,
      leadId,
      name: sale.name || undefined,
      email: sale.email || undefined,
      phone: sale.phone || undefined,
    });
  }

  return result;
}
