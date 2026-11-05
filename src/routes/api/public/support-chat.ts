import { createFileRoute } from "@tanstack/react-router";

type ChatMessage = {
  role: "assistant" | "user";
  text: string;
};

type SupportChatBody = {
  debug?: boolean;
  messages?: ChatMessage[];
  firstName?: string;
};

const SUPPORT_EMAIL = "support@northcrestdigital.life";
const MAX_MESSAGES = 12;
const MAX_MESSAGE_LENGTH = 1200;

export const Route = createFileRoute("/api/public/support-chat")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get("debug") !== "1") {
          return Response.json({ ok: true });
        }

        return Response.json({
          geminiConfigured: Boolean(getGeminiApiKey()),
          model: getGeminiModel(),
          acceptedSecretNames: [
            "GEMINI_API_KEY",
            "GOOGLE_API_KEY",
            "GOOGLE_GENERATIVE_AI_API_KEY",
            "GENAI_API_KEY",
          ],
        });
      },
      POST: async ({ request }) => {
        let body: SupportChatBody;
        try {
          body = (await request.json()) as SupportChatBody;
        } catch {
          return Response.json({ error: "invalid_json" }, { status: 400 });
        }

        if (body.debug) {
          const apiKey = getGeminiApiKey();
          const provider = apiKey ? await testGeminiProvider(apiKey) : null;
          return Response.json({
            geminiConfigured: Boolean(apiKey),
            model: getGeminiModel(),
            provider,
            acceptedSecretNames: [
              "GEMINI_API_KEY",
              "GOOGLE_API_KEY",
              "GOOGLE_GENERATIVE_AI_API_KEY",
              "GENAI_API_KEY",
            ],
          });
        }

        const messages = (body.messages ?? [])
          .slice(-MAX_MESSAGES)
          .map((message) => ({
            role: message.role,
            text: String(message.text ?? "").trim().slice(0, MAX_MESSAGE_LENGTH),
          }))
          .filter((message) => message.text);

        if (!messages.length || messages[messages.length - 1]?.role !== "user") {
          return Response.json({ error: "invalid_messages" }, { status: 400 });
        }

        const firstName = String(body.firstName ?? "customer")
          .replace(/[^\p{L}\p{N} '\-]/gu, "")
          .trim()
          .slice(0, 50) || "customer";
        const lastQuestion = messages[messages.length - 1]?.text ?? "";
        const apiKey = getGeminiApiKey();
        if (!apiKey) {
          console.error("[Gemini support] missing API key. Expected GEMINI_API_KEY.");
          return Response.json({ reply: buildFallbackReply(lastQuestion, firstName), source: "fallback_missing_key" });
        }

        const model = getGeminiModel();
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20_000);

        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": apiKey,
              },
              body: JSON.stringify({
                systemInstruction: {
                  parts: [
                    {
                      text: buildSystemInstruction(firstName),
                    },
                  ],
                },
                contents: messages.map((message) => ({
                  role: message.role === "assistant" ? "model" : "user",
                  parts: [{ text: message.text }],
                })),
                generationConfig: {
                  maxOutputTokens: 260,
                  temperature: 0.25,
                },
              }),
              signal: controller.signal,
            },
          );

          const data = (await response.json().catch(() => ({}))) as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
            error?: { message?: string };
          };

          if (!response.ok) {
            console.error("[Gemini support] request failed", response.status, data.error?.message ?? "");
            return Response.json({ reply: buildFallbackReply(lastQuestion, firstName), source: "fallback_provider_error" });
          }

          const reply = data.candidates?.[0]?.content?.parts
            ?.map((part) => part.text ?? "")
            .join("")
            .trim();

          if (!reply) {
            return Response.json({ reply: buildFallbackReply(lastQuestion, firstName), source: "fallback_empty_reply" });
          }

          return Response.json({ reply, source: "gemini" });
        } catch (error) {
          const reason = error instanceof Error ? error.name : "unknown";
          console.error("[Gemini support] unavailable", reason);
          return Response.json({ reply: buildFallbackReply(lastQuestion, firstName), source: "fallback_unavailable" });
        } finally {
          clearTimeout(timeout);
        }
      },
    },
  },
});

function getGeminiApiKey() {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GENAI_API_KEY ||
    ""
  ).trim();
}

function getGeminiModel() {
  return (process.env.GEMINI_MODEL || "gemini-3.5-flash-lite").trim();
}

async function testGeminiProvider(apiKey: string) {
  const model = getGeminiModel();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: "Reply with OK." }] }],
          generationConfig: { maxOutputTokens: 8, temperature: 0 },
        }),
        signal: controller.signal,
      },
    );
    clearTimeout(timeout);
    const data = (await response.json().catch(() => ({}))) as { error?: { message?: string; status?: string } };
    return {
      ok: response.ok,
      status: response.status,
      errorStatus: data.error?.status ?? null,
      errorMessage: data.error?.message ? data.error.message.slice(0, 180) : null,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      errorStatus: error instanceof Error ? error.name : "unknown",
      errorMessage: error instanceof Error ? error.message.slice(0, 180) : "Provider request failed",
    };
  }
}

function buildSystemInstruction(firstName: string) {
  return `
You are Chloe, the official Task Partners Support Assistant for a post-purchase verification and support app. The product has a mobile-first dashboard with Tasks, Wallet, Refund, Support, and Profile tabs. The experience should feel modern, calm, clean, and credible, like a reputable US company support channel.

Core identity and tone:
- Speak only in professional US English, even if the user writes in another language.
- Be warm, reassuring, direct, and confidently helpful.
- Use natural contractions like we're, you'll, don't, and short human phrases like "Got it," "Alright," and "I understand."
- Refer to yourself as Chloe, Support, or "I". Do not volunteer technical implementation details.
- If directly asked whether the chat is automated, do not pretend to be a human employee. Say: "I'm Chloe, your dedicated Task Partners support assistant. I'm here to help you with the next step."
- Address the customer as ${firstName} when it feels natural.
- Keep every reply to 1 or 2 short sentences and no more than 35 words.
- Answer the customer’s actual concern immediately. Do not introduce yourself again after the chat has started.
- Reassure first, then give one simple next step.
- Never repeat a general list of things you can help with unless the customer explicitly asks about your capabilities.
- Do not repeat security warnings unless the customer is about to share sensitive information.
- Do not send the customer to email support unless the issue truly requires a human account review.

Product journey Chloe understands:
- The user creates an account with name and email.
- The user completes a one-time Human Verification step by reviewing 6 short videos in the Tasks tab.
- The six-video process is a quick security measure that helps confirm the account is being operated by a real person and protects account access.
- After the six videos are completed, Wallet unlocks the next stage for balance tracking, payout method, and application review status.
- Wallet may show payout method, review stages, compliance review, payout batch, and support follow-up.
- Refunds, charges, and technical issues can be explained generally, but sensitive or account-specific cases go to ${SUPPORT_EMAIL}.

Trust and reassurance style:
- Frame verification and review as protections for the user's account and payout process, not as obstacles.
- If the user is worried, reassure them with language like: "You're on the right track," "Your balance is safe and allocated to your account," and "The review is the final step to make sure everything goes smoothly on our side."
- You may say the payout is processed after the required review is completed, but do not guarantee a specific date or claim approval unless the user says that exact status is visible in Wallet.
- If timelines are discussed, say "usually" or "standard review window" and remind the user to check the Wallet status for the exact timeline.
- Avoid generic scripts. Respond to the user's actual question and mention the screen or step they refer to.

What Chloe can explain clearly:
- How to access the account using the registered name/email flow.
- How the one-time six-video Human Verification works.
- What happens immediately after the videos are completed.
- How Wallet balance tracking and payout method selection work.
- Why review status exists and why the standard review window may apply.
- Refunds, charges, billing questions, and basic troubleshooting.
- When the user should wait versus when they should email ${SUPPORT_EMAIL}.

Strict security and privacy protocol:
- Never ask for passwords.
- Never ask for verification codes.
- Never ask for full card numbers, CVV, bank credentials, routing/account numbers, or other sensitive financial data in chat.
- Never ask for government ID numbers, document images, selfies, or identity information in chat.
- Never say a payment, refund, withdrawal, document, identity check, or account review is approved unless the user states that exact status is visible on their screen.
- Do not invent account records, transaction status, policies, laws, fees, or actions you performed.
- For sensitive actions, guide users to official app screens or ${SUPPORT_EMAIL}.
- If the customer alleges fraud, unauthorized charge, or account compromise, advise them to contact ${SUPPORT_EMAIL} and their payment provider promptly.

Response rules:
- Keep replies under 35 words.
- Use at most 2 short sentences.
- Avoid headings, lists, long explanations, and scripted introductions.
- For worried customers, start with calm reassurance such as "Your balance is safe" or "Everything is on track."
- End with one clear next step only when one is needed.
`.trim();
}

function buildFallbackReply(question: string, firstName: string) {
  const text = question.toLowerCase();

  if (/(your name|who are you|what.*name|name)/.test(text)) {
    return `I'm Chloe from Task Partners Support, ${firstName}. What can I help you with?`;
  }

  if (/(hello|hi|hey|good morning|good afternoon|good evening)/.test(text)) {
    return `Hi ${firstName}! You're in the right place. What can I help you with?`;
  }

  if (/(wallet|withdraw|withdrawal|payout|cash out|balance|money|dinheiro|cad[eê]|saque|saldo|2800|2,800)/.test(text)) {
    return `Your balance is safe, ${firstName}. Check Wallet for the current review stage; once it clears, your payout moves forward.`;
  }

  if (/(refund|charge|billing|payment|cancel|37|37.44)/.test(text)) {
    return `Don't worry, ${firstName}. Your request stays saved; check the Refund tab for its latest status.`;
  }

  if (/(video|review|task|human|robot|bot|verification|audit)/.test(text)) {
    return `You're on the right track, ${firstName}. Finish all six reviews and Wallet will unlock automatically.`;
  }

  if (/(document|identity|selfie|id|driver|passport|license|face|camera)/.test(text)) {
    return `Everything is on track, ${firstName}. Complete the document step in Wallet, then wait for the review status to update.`;
  }

  if (/(login|email|access|account|profile|sign in)/.test(text)) {
    return `No worries, ${firstName}. Sign in with the same name and email used to create your account.`;
  }

  return `I've got you, ${firstName}. Tell me which screen you're on and what you're waiting for.`;
}
