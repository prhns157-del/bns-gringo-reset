import { createFileRoute } from "@tanstack/react-router";

const FROM = "Task Partners Support <support@northcrestdigital.life>";
const DASHBOARD_URL = "https://northcrestdigital.life/tasks-app?utm_source=digistore";

export const Route = createFileRoute("/api/public/digistore-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const token = url.searchParams.get("token");
        const expectedToken = process.env.DIGISTORE_WEBHOOK_TOKEN;

        if (!expectedToken) {
          console.error("[Digistore Webhook] DIGISTORE_WEBHOOK_TOKEN not configured");
          return Response.json({ error: "token_not_configured" }, { status: 500 });
        }

        if (!token || token !== expectedToken) {
          console.error("[Digistore Webhook] Invalid token");
          return Response.json({ error: "unauthorized" }, { status: 401 });
        }

        let payload: Record<string, unknown>;
        const contentType = request.headers.get("content-type") ?? "";

        try {
          if (contentType.includes("application/json")) {
            payload = (await request.json()) as Record<string, unknown>;
          } else if (contentType.includes("application/x-www-form-urlencoded")) {
            const form = await request.formData();
            payload = {};
            form.forEach((value, key) => {
              payload[key] = value;
            });
          } else {
            const text = await request.text();
            payload = Object.fromEntries(new URLSearchParams(text)) as Record<string, unknown>;
          }
        } catch (err) {
          console.error("[Digistore Webhook] Failed to parse body", err);
          return Response.json({ error: "invalid_body" }, { status: 400 });
        }

        const event = getPayloadValue(payload, ["event", "event_type", "type", "order_event"]).toLowerCase();
        const paymentStatus = getPayloadValue(payload, [
          "payment_status",
          "status",
          "order_status",
          "transaction_status",
          "billing_status",
        ]).toLowerCase();
        const transactionId = getPayloadValue(payload, ["transaction_id", "transaction", "order_id", "purchase_id"]);

        console.log("[Digistore Webhook] Received event", {
          event,
          payment_status: paymentStatus,
          email: maskEmail(getBuyerEmail(payload)),
          transaction_id: transactionId,
        });

        const negativeSignal = `${event} ${paymentStatus}`;
        const isNegativeEvent = /refund|chargeback|cancel|cancell|revoke|denied|declin|fail/.test(negativeSignal);
        const isPaymentEvent = /payment|purchase|order|sale|paid/.test(event);
        const isApprovedStatus =
          !paymentStatus || ["paid", "completed", "approved", "ok", "success", "payment"].includes(paymentStatus);

        if (isPaymentEvent && isApprovedStatus && !isNegativeEvent) {
          const email = getBuyerEmail(payload);
          const firstName =
            getPayloadValue(payload, ["firstname", "first_name", "buyer_first_name", "customer_first_name"]) || "there";

          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            console.error("[Digistore Webhook] Invalid buyer email", maskEmail(email));
            return Response.json({ ok: true, warning: "invalid_buyer_email" });
          }

          const sent = await sendAccessEmail(email, firstName);
          if (!sent) {
            return Response.json({ error: "email_send_failed" }, { status: 502 });
          }
          console.log("[Digistore Webhook] Email flow completed", {
            email: maskEmail(email),
            transaction_id: transactionId,
          });
        } else {
          console.log("[Digistore Webhook] Skipping email", {
            event,
            payment_status: paymentStatus,
            reason: isNegativeEvent ? "negative_event" : "not_approved_payment_event",
          });
        }

        return Response.json({ ok: true });
      },
    },
  },
});

async function sendAccessEmail(email: string, firstName: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[Digistore Webhook] RESEND_API_KEY not configured");
    return false;
  }

  const html = emailShell({
    title: "Your Access is Here:",
    body: `
      <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hi ${escapeHtml(firstName)},</p>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Your payment has been successfully confirmed.</p>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">As promised, your access is now available.</p>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Please use the link below to continue:</p>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.6;"><a href="https://northcrestdigital.life" style="color:#FE2C55;text-decoration:underline;font-weight:700;">https://northcrestdigital.life</a></p>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">After signing in, you'll be able to access your account and continue with the next steps.</p>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">If this is your first time accessing the platform, simply create your password using the same email address used during checkout.</p>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">If you need any assistance, just reply to this email and our team will be happy to help.</p>
      <p style="margin:0 0 4px;font-size:16px;line-height:1.6;">Thank you,</p>
      <p style="margin:0;font-size:16px;line-height:1.6;font-weight:700;">Task Partners<br><span style="font-weight:400;color:#64748b;">Support Team</span></p>
    `,
  });

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: [email],
      subject: "Your Access is Here:",
      html,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };

  if (!res.ok) {
    console.error("[Digistore Webhook] Resend failed", res.status, data?.message ?? "");
    return false;
  }

  console.log("[Digistore Webhook] Access email sent", { id: data.id, email: maskEmail(email) });
  return true;
}

function emailShell({ body, title }: { body: string; title: string }) {
  return `
    <div style="margin:0;background:#f8fafc;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,Helvetica,sans-serif;color:#0f172a;">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
        <div style="padding:28px 24px;background:#010101;color:#ffffff;">
          <p style="margin:0 0 8px;font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#25F4EE;">Task Partners</p>
          <h1 style="margin:0;font-size:28px;line-height:1.15;">${escapeHtml(title)}</h1>
        </div>
        <div style="padding:26px 24px;">
          ${body}
          <a href="${DASHBOARD_URL}" style="display:block;text-align:center;background:#FE2C55;color:#ffffff;text-decoration:none;font-weight:800;border-radius:8px;padding:15px 18px;margin:24px 0;">
            Open My Dashboard
          </a>
          <p style="margin:0;font-size:12px;line-height:1.6;color:#64748b;">This is an automated account notification from Task Partners Support.</p>
        </div>
      </div>
    </div>
  `;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[char] ?? char;
  });
}

function getPayloadValue(payload: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

function getBuyerEmail(payload: Record<string, unknown>) {
  // Prefer the original email the buyer typed into our form (passed via `custom`).
  const custom = getPayloadValue(payload, ["custom", "custom_field", "custom_data"]).trim().toLowerCase();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(custom)) return custom;

  return getPayloadValue(payload, [
    "email",
    "buyer_email",
    "customer_email",
    "purchaser_email",
    "address_email",
    "email_address",
    "buyer[email]",
    "customer[email]",
  ])
    .trim()
    .toLowerCase();
}

function maskEmail(email: string) {
  const [user, domain] = email.split("@");
  if (!user || !domain) return email ? "invalid-email" : "";
  return `${user.slice(0, 2)}***@${domain}`;
}
