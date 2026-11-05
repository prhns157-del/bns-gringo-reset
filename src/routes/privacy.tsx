import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy | Task Partners" },
      { name: "description", content: "Task Partners Privacy Policy." },
    ],
  }),
  component: PrivacyPage,
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

function PrivacyPage() {
  return (
    <LegalLayout label="Legal" title="Privacy Policy">
      <p>Task Partners respects your privacy and is committed to protecting the information you share with us. This policy explains how we collect, use, and safeguard basic account and support information.</p>
      <Section title="Information We Collect">
        <p>We may collect your name, email address, purchase details, support messages, and technical information needed to provide access to the workspace and related resources.</p>
      </Section>
      <Section title="How We Use Information">
        <p>We use information to manage account access, deliver digital resources, respond to support requests, improve the product, and communicate important service updates.</p>
      </Section>
      <Section title="Data Protection">
        <p>We use reasonable administrative and technical safeguards to protect your information. No online service can guarantee absolute security, but we work to keep your data handled responsibly.</p>
      </Section>
      <Section title="Contact">
        <p>For privacy questions, contact <a className="font-bold text-[#2563EB]" href="mailto:support@northcrestdigital.life">support@northcrestdigital.life</a>.</p>
      </Section>
    </LegalLayout>
  );
}
