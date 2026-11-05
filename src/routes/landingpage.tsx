import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, DollarSign, Home, ShieldCheck, TrendingUp, Users, Wrench } from "lucide-react";
import type { ReactNode } from "react";

const CHECKOUT_URL = "https://checkout.vendepay.com/0bf37b02-2a97-4889-9bd7-8e7849e39710";

const problems = [
  "You want extra income but do not know what skill to start with",
  "You are tired of side hustles that require ads, inventory, or complicated tools",
  "You see local tech problems everywhere but do not know how to turn them into paid jobs",
  "You want something practical that can start this week",
];

const benefits = [
  {
    icon: <Wrench size={24} />,
    title: "High-Demand Services",
    text: "Learn the beginner-friendly computer services people already pay for: cleanups, speed fixes, SSD upgrades, setup help, and basic troubleshooting.",
  },
  {
    icon: <DollarSign size={24} />,
    title: "Simple Pricing Guide",
    text: "Use practical pricing ranges so you can quote confidently, avoid undercharging, and know what to offer first.",
  },
  {
    icon: <Users size={24} />,
    title: "First Client Playbook",
    text: "Find local buyers through simple neighborhood channels without building a complicated brand first.",
  },
  {
    icon: <Home size={24} />,
    title: "House Call Workflow",
    text: "Understand how to handle local visits, basic service steps, and follow-up so customers feel taken care of.",
  },
  {
    icon: <TrendingUp size={24} />,
    title: "Repeat Income System",
    text: "Turn one-time fixes into referrals, repeat service, and a stronger monthly income path.",
  },
  {
    icon: <ShieldCheck size={24} />,
    title: "Beginner Confidence",
    text: "Use scripts, checklists, and clear next steps so you can start even if you are not a certified technician.",
  },
];

const fitItems = [
  "You want extra income without a big upfront investment",
  "You are comfortable learning a practical tech skill",
  "You want a simple path to your first paying client",
  "You prefer local service work over another online gimmick",
  "You want clear steps, scripts, and pricing guidance",
];

export const Route = createFileRoute("/landingpage")({
  head: () => ({
    meta: [
      { title: "Extra Income Fixing Computers" },
      {
        name: "description",
        content: "Learn how to turn beginner-friendly computer repair services into extra monthly income.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <main className="min-h-dvh overflow-x-hidden bg-[#070A08] text-white antialiased">
      <Hero />
      <ProblemSection />
      <BenefitsSection />
      <FitSection />
      <GuaranteeSection />
      <FinalOffer />
      <footer className="border-t border-white/10 bg-[#080808] px-5 py-8 text-center text-xs font-semibold text-[#8D98A7]">
        Copyright 2025. All rights reserved.
      </footer>
    </main>
  );
}

function Hero() {
  return (
    <section className="relative isolate overflow-hidden border-b border-white/10 px-5">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_-10%,rgba(0,228,124,0.24),transparent_36%),linear-gradient(180deg,#0B1A12_0%,#070A08_62%,#070A08_100%)]" />
      <div className="mx-auto flex min-h-[92dvh] w-full max-w-5xl flex-col items-center justify-center py-16 text-center">
        <p className="inline-flex items-center gap-2 rounded-full border border-[#00E47C]/35 bg-[#00E47C]/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#00E47C]">
          <CheckCircle2 size={15} />
          Proven Method
        </p>

        <h1 className="mt-8 max-w-5xl text-[clamp(3.2rem,10vw,7.2rem)] font-black uppercase leading-[0.9] text-white">
          Make Money
          <span className="block text-[#00E47C]">Fixing Computers</span>
        </h1>

        <p className="mx-auto mt-7 max-w-2xl text-balance text-lg font-medium leading-8 text-[#D7DEE8] sm:text-xl">
          A practical guide for turning simple computer repair services into $500-$1,500/month in extra income without expensive courses or advanced experience.
        </p>

        <div className="mt-10 grid w-full max-w-3xl gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="rounded-[8px] border border-white/12 bg-white/[0.07] p-5 text-left shadow-[0_24px_70px_rgba(0,0,0,.32)]">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#9CA3AF]">Instant Access</p>
            <div className="mt-3 flex items-end gap-3">
              <p className="text-5xl font-black text-[#00E47C]">$37</p>
              <p className="pb-2 text-sm font-bold text-[#AAB4C3]">one-time payment</p>
            </div>
          </div>
          <CtaButton label="Get Instant Access" />
        </div>

        <p className="mt-5 text-sm font-semibold text-[#9CA3AF]">Secure payment | Instant access | 7-day guarantee</p>
      </div>
    </section>
  );
}

function ProblemSection() {
  return (
    <SectionShell>
      <div className="mx-auto max-w-4xl">
        <Eyebrow>The Problem</Eyebrow>
        <SectionTitle>Does This Sound Like You?</SectionTitle>
        <p className="mt-6 max-w-3xl text-lg font-medium leading-8 text-[#D7DEE8]">
          Most people overcomplicate extra income. You do not need a huge audience, inventory, or a technical degree to start with basic computer services.
        </p>
        <div className="mt-9 grid gap-3">
          {problems.map((item) => (
            <div className="flex items-start gap-4 rounded-[8px] border border-white/10 bg-white/[0.055] p-5 text-base font-semibold text-[#EDF2F7]" key={item}>
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#FE2C55]/15 text-sm font-black text-[#FF5C76]">X</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}

function BenefitsSection() {
  return (
    <SectionShell tone="muted">
      <div className="mx-auto max-w-6xl">
        <Eyebrow>What You Get</Eyebrow>
        <SectionTitle>Everything You Need To Start</SectionTitle>
        <p className="mt-5 max-w-3xl text-lg font-medium leading-8 text-[#D7DEE8]">
          A focused, practical roadmap built for someone who wants to start small, learn fast, and land paid work locally.
        </p>
        <div className="mt-11 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((item) => (
            <article className="rounded-[8px] border border-white/10 bg-[#0B0F0D] p-6 shadow-[0_18px_42px_rgba(0,0,0,.24)]" key={item.title}>
              <div className="mb-5 grid h-12 w-12 place-items-center rounded-[8px] border border-[#00E47C]/25 bg-[#00E47C]/10 text-[#00E47C]">
                {item.icon}
              </div>
              <h3 className="text-lg font-black text-white">{item.title}</h3>
              <p className="mt-3 text-sm font-medium leading-7 text-[#AAB4C3]">{item.text}</p>
            </article>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}

function FitSection() {
  return (
    <SectionShell>
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <div>
          <Eyebrow>Who This Is For</Eyebrow>
          <SectionTitle>This Guide Is For You If...</SectionTitle>
          <div className="mt-8 grid gap-4">
            {fitItems.map((item) => (
              <p className="flex items-start gap-3 text-base font-bold leading-7 text-[#EDF2F7]" key={item}>
                <CheckCircle2 className="mt-0.5 shrink-0 text-[#00E47C]" size={21} />
                {item}
              </p>
            ))}
          </div>
        </div>
        <div className="rounded-[8px] border border-[#00E47C]/30 bg-[#00E47C]/10 p-7 text-center shadow-[0_22px_60px_rgba(0,228,124,.08)]">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#00E47C]">Realistic Monthly Target</p>
          <p className="mt-5 text-[clamp(3.4rem,11vw,6rem)] font-black uppercase leading-none text-[#00E47C]">$1,500</p>
          <p className="mx-auto mt-5 max-w-xl text-base font-semibold leading-7 text-[#D7DEE8]">
            Possible with consistent effort, local demand, and repeat customers in your area.
          </p>
        </div>
      </div>
    </SectionShell>
  );
}

function GuaranteeSection() {
  return (
    <SectionShell tone="muted">
      <div className="mx-auto max-w-4xl text-center">
        <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-full border border-[#00E47C]/40 bg-[#00E47C]/10 text-[#00E47C]">
          <ShieldCheck size={40} />
        </div>
        <Eyebrow centered>Guarantee</Eyebrow>
        <SectionTitle centered>7-Day Money-Back Guarantee</SectionTitle>
        <p className="mx-auto mt-6 max-w-2xl text-lg font-medium leading-8 text-[#D7DEE8]">
          If the guide is not useful for you, request a refund within 7 days. Simple, clear, and no complicated process.
        </p>
      </div>
    </SectionShell>
  );
}

function FinalOffer() {
  return (
    <section className="bg-[#101512] px-5 py-18 text-center sm:py-24">
      <div className="mx-auto max-w-3xl rounded-[8px] border border-white/10 bg-white/[0.055] p-6 shadow-[0_30px_80px_rgba(0,0,0,.26)] sm:p-10">
        <Eyebrow centered>Special Offer</Eyebrow>
        <SectionTitle centered>Start Today</SectionTitle>
        <p className="mx-auto mt-5 max-w-2xl text-lg font-medium leading-8 text-[#D7DEE8]">
          Get instant access to the full guide and start building your first local service offer today.
        </p>
        <p className="mt-8 text-5xl font-black text-[#00E47C]">
          $37 <span className="text-base font-semibold text-[#9AA3AF]">one-time</span>
        </p>
        <CtaButton className="mx-auto mt-8" label="Claim My Access Now" />
        <p className="mt-5 text-sm font-semibold text-[#9AA3AF]">Secure Payment | Instant Access | 7-Day Guarantee</p>
      </div>
    </section>
  );
}

function CtaButton({ label, className = "" }: { label: string; className?: string }) {
  return (
    <a
      className={`flex min-h-14 w-full items-center justify-center rounded-[8px] bg-[#00E47C] px-6 text-sm font-black uppercase tracking-[0.04em] text-black shadow-[0_18px_55px_rgba(0,228,124,.24)] transition hover:bg-[#28F291] active:scale-[0.99] sm:min-w-[300px] ${className}`}
      href={CHECKOUT_URL}
      rel="noreferrer"
      target="_blank"
    >
      {label} -&gt;
    </a>
  );
}

function SectionShell({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "muted" }) {
  return (
    <section className={`border-b border-white/10 px-5 py-16 sm:py-24 ${tone === "muted" ? "bg-[#0D0F0E]" : "bg-[#070A08]"}`}>
      {children}
    </section>
  );
}

function Eyebrow({ children, centered = false }: { children: ReactNode; centered?: boolean }) {
  return <p className={`text-sm font-black uppercase tracking-[0.18em] text-[#00E47C] ${centered ? "text-center" : ""}`}>{children}</p>;
}

function SectionTitle({ children, centered = false }: { children: ReactNode; centered?: boolean }) {
  return (
    <h2 className={`mt-4 text-[clamp(2.25rem,7vw,4.4rem)] font-black uppercase leading-[0.95] text-white ${centered ? "mx-auto text-center" : ""}`}>
      {children}
    </h2>
  );
}
