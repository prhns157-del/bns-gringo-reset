import { createFileRoute } from "@tanstack/react-router";

type EmailTemplate =
  | "progress_complete"
  | "withdrawal_requested"
  | "withdrawal_verification"
  | "withdrawal_compliance"
  | "withdrawal_batch"
  | "withdrawal_scheduled";

type AccessEmailBody = {
  balance?: number;
  count?: number;
  email?: string;
  name?: string;
  reference?: string;
  scheduledAt?: string;
  template?: EmailTemplate;
};

const FROM = "Task Partners Support <support@northcrestdigital.life>";
const DASHBOARD_URL = "https://northcrestdigital.life/tasks-app?utm_source=tiktok";

export const Route = createFileRoute("/api/public/send-access-email")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
          return Response.json({ error: "resend_not_configured" }, { status: 500 });
        }

        let body: AccessEmailBody;
        try {
          body = (await request.json()) as AccessEmailBody;
        } catch {
          return Response.json({ error: "invalid_json" }, { status: 400 });
        }

        const email = (body.email ?? "").trim().toLowerCase();
        const firstName = (body.name ?? "").trim().split(/\s+/)[0] || "there";
        const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return Response.json({ error: "invalid_email" }, { status: 400 });
        }
        if (scheduledAt && Number.isNaN(scheduledAt.getTime())) {
          return Response.json({ error: "invalid_schedule" }, { status: 400 });
        }

        const template = buildEmailTemplate({
          balance: Number(body.balance ?? 0),
          count: Number(body.count ?? 0),
          firstName,
          reference: body.reference ?? "",
          template: body.template,
        });
        if (!template) {
          return Response.json({ error: "invalid_email_template" }, { status: 400 });
        }

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          body: JSON.stringify({
            from: FROM,
            html: template.html,
            ...(scheduledAt && scheduledAt.getTime() > Date.now() ? { scheduled_at: scheduledAt.toISOString() } : {}),
            subject: template.subject,
            to: [email],
          }),
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            ...(body.reference && body.template ? { "Idempotency-Key": `${body.reference}-${body.template}` } : {}),
          },
        });

        const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
        if (!res.ok) {
          console.error("[Resend] send failed", res.status, data?.message ?? "");
          return Response.json({ error: "email_send_failed" }, { status: 502 });
        }

        return Response.json({ ok: true, id: data.id ?? null });
      },
    },
  },
});

function buildEmailTemplate(props: {
  balance: number;
  count: number;
  firstName: string;
  reference: string;
  template?: EmailTemplate;
}) {
  const firstName = escapeHtml(props.firstName);
  const balance = usd(props.balance || 0);
  const reference = escapeHtml(props.reference || "Pending");

  if (props.template === "progress_complete") {
    return {
      subject: "Human verification completed",
      html: emailShell({
        body: `
          <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hi ${firstName},</p>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">All <strong>6 of 6</strong> human-verification reviews have been completed and recorded.</p>
          <p style="margin:0;font-size:16px;line-height:1.6;color:#475569;">Your wallet is now ready for the document and payout review. Current available balance: <strong>${balance}</strong>.</p>
        `,
        title: "Verification completed",
      }),
    };
  }

  if (props.template === "withdrawal_requested") {
    return {
      subject: "Your documents were received",
      html: emailShell({
        body: `
          <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hi ${firstName},</p>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">We received your withdrawal request and document submission.</p>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#475569;">Status: <strong>Documents received — waiting for analysis</strong>.</p>
          <p style="margin:0;font-size:14px;line-height:1.6;color:#64748b;">Reference: ${reference}</p>
        `,
        title: "Documents received",
      }),
    };
  }

  if (props.template === "withdrawal_verification") {
    return {
      subject: "Your documents are being analyzed",
      html: emailShell({
        body: `
          <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hi ${firstName},</p>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Your identity and account documents are currently being analyzed by our verification team.</p>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#475569;">Status: <strong>Document analysis in progress</strong>. No new submission is needed unless the dashboard requests it.</p>
          <p style="margin:0;font-size:14px;line-height:1.6;color:#64748b;">Reference: ${reference}</p>
        `,
        title: "Documents under review",
      }),
    };
  }

  const laterStages = {
    withdrawal_batch: {
      subject: "Your withdrawal was approved",
      title: "Approved for payout",
      status: "Your review was approved and your withdrawal is queued for the next payout batch.",
    },
    withdrawal_compliance: {
      subject: "Your account review is in progress",
      title: "Account review in progress",
      status: "Your documents passed the initial check. Your account is now in the final compliance review.",
    },
    withdrawal_scheduled: {
      subject: "Your payout was released",
      title: "Payout released",
      status: "Your payout was released to your selected provider. The posting time depends on your bank or wallet.",
    },
  } as const;
  const stage = props.template ? laterStages[props.template as keyof typeof laterStages] : undefined;
  if (!stage) return null;
  return {
    subject: stage.subject,
    html: emailShell({
      body: `
        <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hi ${firstName},</p>
        <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">${stage.status}</p>
        <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#475569;">Amount: <strong>${balance}</strong></p>
        <p style="margin:0;font-size:14px;line-height:1.6;color:#64748b;">Reference: ${reference}</p>
      `,
      title: stage.title,
    }),
  };
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

function usd(value: number) {
  return value.toLocaleString("en-US", { currency: "USD", style: "currency" });
}
