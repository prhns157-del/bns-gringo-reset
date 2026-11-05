import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/thanks")({
  head: () => ({
    meta: [
      { title: "Task Partners | Payment Confirmed" },
      {
        name: "description",
        content: "Your Task Partners payment has been confirmed. Access your dashboard and included resources.",
      },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: ThanksPage,
});

const css = `
.tp-thanks {
  --bg: #f8fafc;
  --ink: #0f172a;
  --muted: #475569;
  --line: #e2e8f0;
  --blue: #2563eb;
  --blue-dark: #1d4ed8;
  --green: #10b981;
  min-height: 100dvh;
  padding: 24px 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink);
  background:
    radial-gradient(circle at 50% -12%, rgba(37, 99, 235, 0.10), transparent 32rem),
    linear-gradient(180deg, #ffffff 0%, var(--bg) 48%, #eef4fb 100%);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
}
.tp-thanks * { box-sizing: border-box; }
.tp-thanks a:focus-visible { outline: 3px solid rgba(37, 99, 235, 0.35); outline-offset: 4px; }
.tp-shell { width: 100%; max-width: 760px; }
.tp-brand {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 22px;
  font-weight: 950;
  font-size: 1.1rem;
  letter-spacing: -0.03em;
}
.tp-brand-mark {
  width: 34px;
  height: 34px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: var(--ink);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.14);
}
.tp-card {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 28px 90px rgba(15, 23, 42, 0.10), 0 2px 10px rgba(15, 23, 42, 0.04);
  padding: 30px;
  text-align: center;
  backdrop-filter: blur(10px);
}
.tp-check {
  width: 70px;
  height: 70px;
  margin: 0 auto 22px;
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: linear-gradient(135deg, var(--green), #059669);
  box-shadow: 0 18px 42px rgba(16, 185, 129, 0.28);
}
.tp-title {
  margin: 0;
  font-size: clamp(2.1rem, 8vw, 3.75rem);
  line-height: 0.98;
  letter-spacing: -0.06em;
  font-weight: 950;
}
.tp-subtitle {
  margin: 12px 0 0;
  color: var(--blue);
  font-size: 1.08rem;
  font-weight: 900;
  letter-spacing: -0.02em;
}
.tp-copy {
  margin: 22px auto 0;
  max-width: 610px;
  display: grid;
  gap: 12px;
  color: var(--muted);
  font-size: 1rem;
  line-height: 1.75;
  font-weight: 620;
}
.tp-copy p { margin: 0; }
.tp-button-row { margin-top: 30px; display: flex; justify-content: center; }
.tp-primary {
  min-height: 54px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border-radius: 999px;
  padding: 0 30px;
  background: var(--blue);
  color: #fff;
  text-decoration: none;
  font-size: 0.96rem;
  font-weight: 950;
  box-shadow: 0 16px 34px rgba(37, 99, 235, 0.22);
  transition: transform 180ms ease, background 180ms ease, box-shadow 180ms ease;
}
.tp-primary:hover { transform: translateY(-2px); background: var(--blue-dark); box-shadow: 0 20px 42px rgba(37, 99, 235, 0.27); }
.tp-support {
  margin-top: 28px;
  border: 1px solid var(--line);
  border-radius: 20px;
  background: #fbfdff;
  padding: 20px;
  text-align: left;
}
.tp-support h2 {
  margin: 0 0 8px;
  font-size: 1rem;
  font-weight: 950;
  letter-spacing: -0.03em;
}
.tp-support p {
  margin: 0;
  color: var(--muted);
  line-height: 1.7;
  font-weight: 620;
}
.tp-email {
  display: inline-flex;
  margin-top: 12px;
  color: var(--blue);
  font-weight: 950;
  text-decoration: none;
}
.tp-email:hover { text-decoration: underline; }
.tp-note {
  margin-top: 18px;
  border-radius: 16px;
  border: 1px solid #dbeafe;
  background: #eff6ff;
  padding: 14px 16px;
  color: #1e3a8a;
  font-size: 0.9rem;
  font-weight: 850;
}
.tp-footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 14px 22px;
  margin-top: 24px;
  color: #64748b;
  font-size: 0.86rem;
  font-weight: 750;
}
.tp-footer a { text-decoration: none; transition: color 160ms ease; }
.tp-footer a:hover { color: var(--blue); }
@media (min-width: 720px) {
  .tp-thanks { padding: 40px 24px; }
  .tp-card { padding: 46px; }
  .tp-brand { justify-content: flex-start; margin-bottom: 28px; }
}
`;

const CheckIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function ThanksPage() {
  return (
    <>
      <style>{css}</style>
      <main className="tp-thanks">
        <div className="tp-shell">
          <header className="tp-brand" aria-label="Task Partners">
            <span className="tp-brand-mark" aria-hidden="true">
              <CheckIcon size={19} />
            </span>
            <span>Task Partners</span>
          </header>

          <section className="tp-card" aria-labelledby="thanks-title">
            <div className="tp-check" aria-hidden="true">
              <CheckIcon size={34} />
            </div>
            <h1 id="thanks-title" className="tp-title">Payment Confirmed</h1>
            <p className="tp-subtitle">Welcome to Task Partners</p>

            <div className="tp-copy">
              <p>Your payment has been successfully confirmed and your Task Partners account is now ready.</p>
              <p>You can now sign in to your dashboard and access all available resources included with your account.</p>
            </div>

            <div className="tp-button-row">
              <a className="tp-primary" href="https://northcrestdigital.life/tasks-app" aria-label="Go to Task Partners dashboard">
                Go to Dashboard
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </div>

            <section className="tp-support" aria-labelledby="support-title">
              <h2 id="support-title">Need help?</h2>
              <p>For account access, billing, refund requests, or technical support, contact our team.</p>
              <a className="tp-email" href="mailto:support@northcrestdigital.life">support@northcrestdigital.life</a>
            </section>

            <p className="tp-note">The charge will be processed by Digistore24.com.</p>
          </section>

          <footer className="tp-footer" aria-label="Footer links">
            <a href="https://northcrestdigital.life/privacy">Privacy Policy</a>
            <a href="https://northcrestdigital.life/terms">Terms of Service</a>
            <a href="https://northcrestdigital.life/refund">Refund Policy</a>
            <a href="https://northcrestdigital.life/contact">Contact</a>
          </footer>
        </div>
      </main>
    </>
  );
}
