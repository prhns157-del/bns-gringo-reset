import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";

export const Route = createFileRoute("/refund")({
  head: () => ({
    meta: [
      { title: "Refund Policy | Task Partners" },
      { name: "description", content: "Task Partners Refund Policy." },
    ],
  }),
  component: RefundPage,
});

function LegalLayout({ label, title, children }: { label: string; title: string; children: ReactNode }) {
  return (
    <main className="min-h-dvh bg-[#F8FAFC] px-5 py-8 text-[#0F172A]">
      <article className="mx-auto max-w-3xl rounded-[24px] border border-slate-200 bg-white p-7 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-10">
        <a href="/" className="mb-8 inline-flex items-center gap-2 text-sm font-black text-[#0F172A]">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0F172A] text-white">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          Task Partners
        </a>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2563EB]">{label}</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">{title}</h1>
        <div className="mt-7 space-y-6 text-base leading-8 text-slate-600">{children}</div>
      </article>
    </main>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-xl font-black tracking-tight text-[#0F172A]">{title}</h2>
      <div>{children}</div>
    </section>
  );
}

function RefundPage() {
  return (
    <LegalLayout label="Policy" title="Refund Policy">
      <p>Task Partners includes a 14-day money back guarantee. If the product is not the right fit for you, contact our support team within 14 days of purchase and we will assist with your refund request according to this policy.</p>
      <Section title="Eligibility">
        <p>Refund requests should include the email used for purchase and any relevant order details. Requests submitted after the 14-day period may not be eligible.</p>
      </Section>
      <Section title="Processing">
        <p>Approved refunds are processed through the original payment processor. Processing times may vary depending on the payment method and financial institution.</p>
      </Section>
      <Section title="How To Request A Refund">
        <p>Email <a className="font-bold text-[#2563EB]" href="mailto:support@northcrestdigital.life">support@northcrestdigital.life</a> with the subject line "Refund Request" and include your purchase email.</p>
      </Section>
    </LegalLayout>
  );
}
