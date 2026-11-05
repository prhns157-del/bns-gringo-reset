import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service | Task Partners" },
      { name: "description", content: "Task Partners Terms of Service." },
    ],
  }),
  component: TermsPage,
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

function TermsPage() {
  return (
    <LegalLayout label="Legal" title="Terms of Service">
      <p>By using Task Partners, you agree to these terms. Task Partners provides a digital productivity workspace, templates, resources, and organization tools for personal or business workflow management.</p>
      <Section title="Product Access">
        <p>Access is provided digitally after purchase. You are responsible for keeping your login details secure and using the product in a lawful and respectful manner.</p>
      </Section>
      <Section title="Acceptable Use">
        <p>You may not copy, resell, redistribute, or misuse Task Partners resources without permission. The workspace is intended for organization, productivity, and access to included digital materials.</p>
      </Section>
      <Section title="Service Changes">
        <p>We may update content, features, and resources to improve the product. We aim to keep the workspace stable, useful, and accessible.</p>
      </Section>
      <Section title="Support">
        <p>For service questions, contact <a className="font-bold text-[#2563EB]" href="mailto:support@northcrestdigital.life">support@northcrestdigital.life</a>.</p>
      </Section>
    </LegalLayout>
  );
}
