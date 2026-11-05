import { createFileRoute } from "@tanstack/react-router";
import {
  AtSign,
  Camera,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileCheck2,
  Home,
  IdCard,
  Landmark,
  Loader2,
  LockKeyholeIcon,
  MapPin,
  MessageCircle,
  Pause,
  Play,
  ShieldCheck,
  ReceiptText,
  Search,
  ScanFace,
  Send,
  Star,
  UserRound,
  Volume2,
  VolumeX,
  Wallet,
} from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import {
  buildWithdrawalReference,
  readWithdrawalState,
  writeWithdrawalState,
  WithdrawalTracker,
} from "@/lib/withdrawal-pipeline";
import type { WithdrawalState } from "@/lib/withdrawal-pipeline";
import { useEffect, useMemo, useRef, useState } from "react";

export const Route = createFileRoute("/tasks-app")({
  head: () => ({
    meta: [
      { title: "Task Partners" },
      { name: "description", content: "Premium mobile task auditing app." },
    ],
  }),
  component: TaskPartnersApp,
});

type Screen = "tasks" | "wallet" | "refund" | "support" | "profile";
type Review = { date: string; title: string; reward: number; status: string };
type User = { name: string; email: string; password?: string };
type VideoTask = {
  day: number;
  id: string;
  sequence: number;
  creator: string;
  title: string;
  videoUrl: string;
  reward: number;
};

const INITIAL_BALANCE = 2800;
const DAILY_LIMIT = 6;
const TOTAL_TASKS_TO_GOAL = DAILY_LIMIT;
const ACCOUNTS_KEY = "ttp_accounts";
const SESSION_KEY = "ttp_session";
const APP_STATE_KEY = "ttp_app_state";
const REFUND_STATE_KEY = "ttp_refund_state";
const TRIGGERED_EMAILS_LOG_KEY = "triggered_emails_log";
const CONFIRMED_EMAILS_LOG_KEY = "triggered_emails_log_v2";
const EMAILS_IN_FLIGHT_KEY = "triggered_emails_in_flight";
const VIDEOS_EVALUATED_COUNT_KEY = "videos_evaluated_count";

const videoPool = [
  { creator: "Viral Creator Content", title: "Challenge Audit", videoUrl: "/videos/task1.mp4" },
  { creator: "US Trending Video", title: "Illusion Review", videoUrl: "/videos/task2.mp4" },
  { creator: "Viral Creator Content", title: "Satisfying ASMR Audit", videoUrl: "/videos/task3.mp4" },
  { creator: "US Trending Video", title: "Viral Audio Audit", videoUrl: "/videos/task4.mp4" },
  { creator: "Viral Creator Content", title: "Engagement Review", videoUrl: "/videos/task5.mp4" },
  { creator: "US Trending Video", title: "Watch Time Quality Check", videoUrl: "/videos/task6.mp4" },
];

const tasks: VideoTask[] = Array.from({ length: TOTAL_TASKS_TO_GOAL }, (_, index) => {
  const sequence = (index % DAILY_LIMIT) + 1;
  const source = videoPool[index % videoPool.length];
  return {
    day: 1,
    id: `human-check-task-${sequence}`,
    sequence,
    creator: source.creator,
    title: source.title,
    videoUrl: source.videoUrl,
    reward: 0,
  };
});

const processingSteps = ["Checking response consistency...", "Validating watch activity...", "Comparing review quality...", "Saving verification result..."];
const paymentOptions = ["Cash App", "PayPal", "Venmo", "Zelle", "Bank Transfer (ACH)"];

function TaskPartnersApp() {
  const [allowed, setAllowed] = useState(false);
  const [checkedGate, setCheckedGate] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [screen, setScreen] = useState<Screen>("tasks");
  const [taskIndex, setTaskIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [rating, setRating] = useState(0);
  const [useful, setUseful] = useState("");
  const [recommend, setRecommend] = useState("");
  const [original, setOriginal] = useState("");
  const [clear, setClear] = useState("");
  const [audience, setAudience] = useState("");
  const [comment, setComment] = useState("");
  const [introAccepted, setIntroAccepted] = useState(false);
  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [pendingBalance] = useState(0);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewedIds, setReviewedIds] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [successReward, setSuccessReward] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState(paymentOptions[0]);
  const [paymentData, setPaymentData] = useState("");
  const [paymentBank, setPaymentBank] = useState("");
  const [paymentRouting, setPaymentRouting] = useState("");
  const [paymentAccount, setPaymentAccount] = useState("");
  const [refundMethod, setRefundMethod] = useState(paymentOptions[0]);
  const [refundData, setRefundData] = useState("");
  const [refundBank, setRefundBank] = useState("");
  const [refundRouting, setRefundRouting] = useState("");
  const [refundAccount, setRefundAccount] = useState("");
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundApproved, setRefundApproved] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  const task = tasks[Math.min(taskIndex, tasks.length - 1)];
  const taskReviewKey = `${task.id}-${taskIndex}`;
  const verificationComplete = reviewedIds.length >= DAILY_LIMIT;
  const completedToday = Math.min(reviewedIds.length, DAILY_LIMIT);
  const reviewUnlocked = progress >= 100 && !reviewedIds.includes(taskReviewKey);
  const hasValidComment = countWords(comment) >= 3;
  const canSubmit = reviewUnlocked
    && rating > 0
    && Boolean(useful)
    && Boolean(recommend)
    && Boolean(original)
    && Boolean(clear)
    && Boolean(audience)
    && hasValidComment;
  const balanceText = useMemo(() => usd(balance), [balance]);

  useEffect(() => {
    setAllowed(true);
    setCheckedGate(true);
  }, []);

  useEffect(() => {
    if (!allowed) return;
    const sessionUser = readSession();
    if (sessionUser) {
      setUser(sessionUser);
      setScreen("tasks");
      const savedState = readAppState(sessionUser.email);
      if (savedState) {
        setBalance(savedState.balance);
        setIntroAccepted(savedState.introAccepted ?? savedState.reviewedIds.length > 0);
        setReviews(savedState.reviews);
        setReviewedIds(savedState.reviewedIds);
        setTaskIndex(savedState.taskIndex);
      }
      const savedRefund = readRefundState(sessionUser.email);
      if (savedRefund) {
        setRefundMethod(savedRefund.method);
        setRefundData(savedRefund.data);
        setRefundBank(savedRefund.bank);
        setRefundRouting(savedRefund.routing);
        setRefundAccount(savedRefund.account);
        setRefundApproved(savedRefund.approved);
      }
    }
  }, [allowed]);

  useEffect(() => {
    if (!user) return;
    window.localStorage.setItem(
      appStateKey(user.email),
      JSON.stringify({
        balance,
        introAccepted,
        reviewedIds,
        reviews,
        taskIndex,
      }),
    );
  }, [balance, introAccepted, reviewedIds, reviews, taskIndex, user]);

  useEffect(() => {
    const update = () => setIsDesktop(window.innerWidth > 768);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    setProgress(0);
  }, [taskIndex]);

  function accessAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError("");
    const email = signupEmail.trim().toLowerCase();
    const name = signupName.trim();
    if (!name || !email) {
      setAuthError("Enter your full name and email to continue.");
      return;
    }
    setLoading(true);
    window.setTimeout(() => {
      const accounts = readAccounts();
      const existing = accounts.find((item) => item.email.toLowerCase() === email);
      const account = existing ? { ...existing, name: existing.name || name, email: existing.email } : { name, email };
      if (!existing) {
        window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify([...accounts, account]));
        window.localStorage.setItem(
          appStateKey(account.email),
          JSON.stringify({ balance: INITIAL_BALANCE, reviewedIds: [], reviews: [], taskIndex: 0 }),
        );
      }
      setUser(account);
      const savedState = readAppState(account.email);
      if (savedState) {
        setBalance(savedState.balance);
        setIntroAccepted(savedState.introAccepted ?? savedState.reviewedIds.length > 0);
        setReviews(savedState.reviews);
        setReviewedIds(savedState.reviewedIds);
        setTaskIndex(savedState.taskIndex);
      }
      const savedRefund = readRefundState(account.email);
      if (savedRefund) {
        setRefundMethod(savedRefund.method);
        setRefundData(savedRefund.data);
        setRefundBank(savedRefund.bank);
        setRefundRouting(savedRefund.routing);
        setRefundAccount(savedRefund.account);
        setRefundApproved(savedRefund.approved);
      }
      setLoading(false);
      setScreen("tasks");
      if (remember) window.localStorage.setItem(SESSION_KEY, JSON.stringify(account));
    }, 700);
  }

  function submitReview() {
    if (!canSubmit) return;
    const completedTask = task;
    const completedKey = taskReviewKey;
    const completedCount = Math.min(reviewedIds.length + 1, DAILY_LIMIT);
    setSuccessReward(null);
    setReviewedIds((value) => [...value, completedKey]);
    if (user) handleBehavioralEmailTriggers(user, balance, completedCount);
    setReviews((value) => [
      { date: new Date().toLocaleDateString("en-US"), title: completedTask.title, reward: 0, status: "Human check completed" },
      ...value,
    ]);
    setRating(0);
    setUseful("");
    setRecommend("");
    setOriginal("");
    setClear("");
    setAudience("");
    setComment("");
    setProgress(0);
    if (completedTask.sequence < DAILY_LIMIT) {
      setTaskIndex((value) => Math.min(value + 1, TOTAL_TASKS_TO_GOAL - 1));
    }

    setProcessing(true);
    setProcessingStep(0);
    let step = 0;
    const timer = window.setInterval(() => {
      step += 1;
      setProcessingStep(Math.min(step, processingSteps.length - 1));
      if (step >= processingSteps.length) {
        window.clearInterval(timer);
        setProcessing(false);
        setSuccessReward(0);
        window.requestAnimationFrame(() => {
          document.getElementById("tasks-app-scroll")?.scrollTo({ top: 0, behavior: "smooth" });
        });
        window.setTimeout(() => setSuccessReward(null), 2600);
      }
    }, 1250);
  }

  function requestRefund(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRefundLoading(false);
    setRefundApproved(true);
    if (user) {
      window.localStorage.setItem(
        refundStateKey(user.email),
        JSON.stringify({
          account: refundAccount,
          approved: true,
          bank: refundBank,
          data: refundData,
          method: refundMethod,
          routing: refundRouting,
        }),
      );
    }
  }

  if (!checkedGate) return null;
  if (!allowed) return <Server404 />;
  if (isDesktop) return <UnsupportedDevice />;

  if (!user) {
    return (
      <main className="min-h-dvh bg-[#F8FAFC] text-[#0F172A]">
        <section className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-5 py-5">
          <div className="flex items-center justify-center">
            <Brand />
          </div>
          <div className="flex flex-1 flex-col justify-center">
            <div className="mx-auto mb-8 grid h-24 w-24 place-items-center rounded-[28px] bg-white text-[#0F172A] shadow-[0_20px_45px_rgba(15,23,42,.12)]">
              <CheckCircle2 className="text-[#FE2C55]" size={42} />
            </div>
            <h1 className="text-center text-[30px] font-black leading-tight">Access Task Partners</h1>
            <p className="mx-auto mt-3 max-w-[330px] text-center text-sm leading-6 text-[#475569]">
              Enter your name and email to continue. If this is your first visit, your account will be created automatically.
            </p>
            {authError && (
              <div className="mt-5 rounded-[8px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-600">
                {authError}
              </div>
            )}
            <form onSubmit={accessAccount} className="mt-8 space-y-3">
              <AuthInput icon={<UserRound size={18} />} onChange={setSignupName} placeholder="Full Name" type="text" value={signupName} />
              <AuthInput
                icon={<AtSign size={18} />}
                onChange={setSignupEmail}
                placeholder="Email"
                type="email"
                value={signupEmail}
              />
              <label className="flex items-center justify-between rounded-[8px] border border-slate-200 bg-white px-4 py-3 text-sm font-bold shadow-sm">
                Keep me signed in
                <input checked={remember} onChange={(event) => setRemember(event.target.checked)} type="checkbox" className="h-5 w-5 accent-[#FE2C55]" />
              </label>
              <button className="flex h-13 w-full items-center justify-center gap-2 rounded-[8px] bg-[#FE2C55] font-black text-white shadow-lg shadow-rose-200 transition active:scale-[0.98]" type="submit">
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                Continue to Dashboard
              </button>
            </form>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="h-dvh overflow-hidden bg-[#F8FAFC] text-[#0F172A]">
      <section className="relative mx-auto flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-[#F8FAFC]">
        <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#475569]">Balance</p>
              <p className="flex items-center gap-1 truncate text-[17px] font-black text-[#0F172A]"><Wallet size={18} className="text-[#2563EB]" />{balanceText}</p>
            </div>
            <div className="shrink-0 rounded-[8px] bg-[#F1F5F9] px-3 py-2 text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#475569]">Human Check</p>
              <p className="text-lg font-black text-[#FE2C55]">{completedToday}/{DAILY_LIMIT}</p>
              <p className="text-[10px] font-black text-[#475569]">{verificationComplete ? "Completed" : "Required"}</p>
            </div>
          </div>
          <p className="mt-3 text-[11px] font-bold leading-4 text-[#475569]">
            Complete the human verification below to confirm that your account is operated by a real person.
          </p>

        </header>

        <div id="tasks-app-scroll" className="min-h-0 flex-1 overflow-y-auto scroll-smooth px-4 pb-28 pt-4">
          {screen === "tasks" && (
            <TasksScreen
              canSubmit={canSubmit}
              audience={audience}
              clear={clear}
              comment={comment}
              introAccepted={introAccepted}
              hasValidComment={hasValidComment}
              isMuted={isMuted}
              original={original}
              progress={progress}
              rating={rating}
              recommend={recommend}
              reviewUnlocked={reviewUnlocked}
              setAudience={setAudience}
              setClear={setClear}
              setComment={setComment}
              setIntroAccepted={setIntroAccepted}
              setIsMuted={setIsMuted}
              setOriginal={setOriginal}
              setProgress={setProgress}
              setRating={setRating}
              setRecommend={setRecommend}
              setUseful={setUseful}
              submitReview={submitReview}
              task={task}
              taskIndex={taskIndex}
              useful={useful}
              verificationComplete={verificationComplete}
            />
          )}
          {screen === "wallet" && (
            <WalletScreen
              balance={balance}
              verificationComplete={verificationComplete}
              user={user}
              pendingBalance={pendingBalance}
              paymentData={paymentData}
              paymentAccount={paymentAccount}
              paymentBank={paymentBank}
              paymentMethod={paymentMethod}
              paymentRouting={paymentRouting}
              setPaymentData={setPaymentData}
              setPaymentAccount={setPaymentAccount}
              setPaymentBank={setPaymentBank}
              setPaymentMethod={setPaymentMethod}
              setPaymentRouting={setPaymentRouting}
            />
          )}
          {screen === "refund" && (
            <RefundScreen
              approved={refundApproved}
              account={refundAccount}
              bank={refundBank}
              data={refundData}
              loading={refundLoading}
              method={refundMethod}
              onSubmit={requestRefund}
              routing={refundRouting}
              setAccount={setRefundAccount}
              setBank={setRefundBank}
              setData={setRefundData}
              setMethod={setRefundMethod}
              setRouting={setRefundRouting}
            />
          )}
          {screen === "support" && <SupportScreen user={user} />}
          {screen === "profile" && <ProfileScreen reviews={reviews} user={user} balance={balance} />}
        </div>

        {successReward !== null && (
          <div className="pointer-events-none absolute left-4 right-4 top-4 z-[60] rounded-[8px] bg-emerald-500 px-4 py-3 text-center text-sm font-black text-white shadow-2xl">
            Response saved. {Math.min(reviewedIds.length, DAILY_LIMIT)}/{DAILY_LIMIT} checks completed.
          </div>
        )}
        <BottomNav screen={screen} setScreen={setScreen} />
      </section>

      {processing && <ProcessingOverlay step={processingStep} />}
    </main>
  );
}

function TasksScreen(props: {
  audience: string;
  canSubmit: boolean;
  clear: string;
  comment: string;
  introAccepted: boolean;
  hasValidComment: boolean;
  isMuted: boolean;
  original: string;
  progress: number;
  rating: number;
  recommend: string;
  reviewUnlocked: boolean;
  setAudience: (value: string) => void;
  setClear: (value: string) => void;
  setComment: (value: string) => void;
  setIntroAccepted: (value: boolean) => void;
  setIsMuted: (value: boolean) => void;
  setOriginal: (value: string) => void;
  setProgress: (value: number) => void;
  setRating: (value: number) => void;
  setRecommend: (value: string) => void;
  setUseful: (value: string) => void;
  submitReview: () => void;
  task: VideoTask;
  taskIndex: number;
  useful: string;
  verificationComplete: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const dayEndIndex = props.task.day * DAILY_LIMIT;
  const lockedTasks = tasks.slice(props.taskIndex + 1, dayEndIndex);

  function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }

  if (!props.introAccepted) {
    return (
      <section className="relative overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-[0_16px_36px_rgba(15,23,42,.10)]">
        <div className="absolute left-0 top-0 z-10 h-1 w-1/2 bg-[#25F4EE]" />
        <div className="absolute right-0 top-0 z-10 h-1 w-1/2 bg-[#FE2C55]" />
        <div className="bg-[#0B0B0F] px-5 py-7 text-white">
          <div className="mb-5 grid h-14 w-14 place-items-center rounded-full border border-white/10 bg-white text-[#0F172A] shadow-[-5px_0_0_#25F4EE,5px_0_0_#FE2C55]">
            <ShieldCheck size={28} />
          </div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#25F4EE]">One-time account check</p>
          <h1 className="mt-2 text-[26px] font-black leading-tight">Confirm that you are a real person</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Complete six short creator-content reviews. Your answers help us distinguish genuine human activity from automated traffic.
          </p>
        </div>
        <div className="space-y-4 p-5">
          {[
            ["Watch every video", "The review unlocks only after the video reaches the end."],
            ["Answer thoughtfully", "Rate quality, clarity, originality, relevance, and audience fit."],
            ["No task earnings", "This is an identity and activity check. Your balance will not change."],
            ["Complete it once", "After all six reviews, your account becomes eligible to request withdrawal verification."],
          ].map(([title, text], index) => (
            <div className="flex gap-3" key={title}>
              <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-black text-white ${index % 2 === 0 ? "bg-[#FE2C55]" : "bg-[#0F172A] shadow-[-3px_0_0_#25F4EE]"}`}>{index + 1}</div>
              <div><p className="text-sm font-black">{title}</p><p className="mt-0.5 text-xs font-semibold leading-5 text-[#64748B]">{text}</p></div>
            </div>
          ))}
          <div className="rounded-[8px] border border-blue-100 bg-blue-50 p-3 text-xs font-semibold leading-5 text-blue-900">
            Task Partners will never ask you for a payment. Never share card numbers, passwords, or full government ID numbers in review comments.
          </div>
          <button className="flex min-h-13 w-full items-center justify-center gap-2 rounded-[8px] bg-[#FE2C55] px-4 py-3 text-sm font-black text-white shadow-[4px_4px_0_#25F4EE] transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-none" onClick={() => props.setIntroAccepted(true)} type="button">
            Continue to Verification <ChevronRight size={18} />
          </button>
        </div>
      </section>
    );
  }

  if (props.verificationComplete) {
    return (
      <section className="rounded-[8px] border border-emerald-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-emerald-500 text-white">
          <CheckCircle2 size={31} />
        </div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-600">Human check passed</p>
        <h1 className="mt-2 text-2xl font-black">Human verification completed</h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-[#475569]">
          All six reviews were recorded. Your available balance remains {usd(INITIAL_BALANCE)} and is now eligible for a withdrawal verification request.
        </p>
        <p className="mt-4 rounded-[8px] bg-[#F8FAFC] p-3 text-xs font-bold leading-5 text-[#475569]">
          Open Wallet to register your payout method and begin identity verification.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-[8px] border border-slate-200 bg-white p-3 shadow-sm">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-black text-[#FE2C55]">{props.task.creator}</p>
            <h1 className="text-xl font-black leading-tight text-[#0F172A]">{props.task.title}</h1>
            <p className="mt-1 text-xs font-semibold text-[#475569]">Human check {props.task.sequence}/6 - No task earnings</p>
            <p className="mt-2 text-xs font-bold leading-5 text-[#475569]">
              Watch the complete video and provide an authentic content assessment.
            </p>
          </div>
        </div>
        <div className="relative aspect-[9/20] max-h-[560px] w-full overflow-hidden rounded-[8px] bg-slate-950">
          <video
            ref={videoRef}
            key={props.task.id}
            autoPlay
            className="h-full w-full object-contain"
            muted={props.isMuted}
            onEnded={() => props.setProgress(100)}
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
            onTimeUpdate={(event) => {
              const video = event.currentTarget;
              if (!Number.isFinite(video.duration) || video.duration <= 0) return;
              props.setProgress(Math.min(99, (video.currentTime / video.duration) * 100));
            }}
            playsInline
            preload="auto"
            src={props.task.videoUrl}
          />
          <button
            aria-label={isPlaying ? "Pause video" : "Play video"}
            className="absolute left-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-black/55 text-white backdrop-blur"
            onClick={togglePlayback}
            onMouseDown={(event) => event.preventDefault()}
            type="button"
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} fill="currentColor" />}
          </button>
          <button
            className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-black/55 text-white backdrop-blur"
            onClick={() => props.setIsMuted(!props.isMuted)}
            onMouseDown={(event) => event.preventDefault()}
            type="button"
          >
            {props.isMuted ? <VolumeX size={19} /> : <Volume2 size={19} />}
          </button>
        </div>
      </section>

      <section className="rounded-[8px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between text-xs font-black text-[#475569]">
          <span>Finish watching the video to unlock the creator review. ({Math.round(props.progress)}%)</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-[#FE2C55] transition-all duration-500" style={{ width: `${props.progress}%` }} />
        </div>
      </section>

      <section className="rounded-[8px] border border-slate-200 bg-[#F1F5F9] p-4 shadow-sm transition-all">
        {!props.reviewUnlocked ? (
          <div className="flex min-h-[210px] flex-col items-center justify-center text-center">
            <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-white text-[#FE2C55] shadow-sm">
              <LockKeyholeIcon size={30} />
            </div>
            <h2 className="text-xl font-black text-[#0F172A]">Review Locked</h2>
            <p className="mt-2 max-w-[280px] text-sm leading-6 text-[#475569]">Finish the partner creator audit above to unlock the questions and release pending withdrawal funds.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-black text-[#0F172A]">1. Rate the video quality</p>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} className={`grid h-11 w-11 place-items-center rounded-full transition ${props.rating >= star ? "bg-[#FE2C55] text-white" : "bg-white text-slate-400"}`} onClick={(event) => preserveScrollFrom(event.currentTarget, () => props.setRating(star))} onMouseDown={(event) => event.preventDefault()} type="button">
                    <Star size={18} fill={props.rating >= star ? "currentColor" : "none"} />
                  </button>
                ))}
              </div>
            </div>
            <ChoiceRow label="2. Was the content useful?" value={props.useful} onChange={props.setUseful} />
            <ChoiceRow label="3. Would you recommend it?" value={props.recommend} onChange={props.setRecommend} />
            <ChoiceRow label="4. Did the content feel original?" value={props.original} onChange={props.setOriginal} />
            <ChoiceRow label="5. Was the message clear?" value={props.clear} onChange={props.setClear} />
            <OptionRow
              label="6. Who is the best audience for this video?"
              options={["General audience", "Young adults", "Families", "Special-interest viewers"]}
              value={props.audience}
              onChange={props.setAudience}
            />
            <label className="block">
              <span className="mb-2 block text-sm font-black text-[#0F172A]">7. Explain your assessment</span>
              <textarea
                className="min-h-28 w-full resize-none rounded-[8px] border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-[#0F172A] outline-none placeholder:text-slate-400 focus:border-[#2563EB]"
                onChange={(event) => props.setComment(event.target.value)}
                onFocus={(event) => preserveScrollFrom(event.currentTarget, () => undefined)}
                placeholder="Write at least 3 real words..."
                value={props.comment}
              />
              {!props.hasValidComment && (
                <span className="mt-1.5 block text-xs font-bold text-[#FE2C55]">Warning: Your comment must contain at least 3 words.</span>
              )}
            </label>
            <button className="min-h-13 w-full rounded-[8px] bg-[#FE2C55] px-4 py-3 text-sm font-black text-white shadow-lg shadow-rose-200 transition active:scale-[0.98] disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none" disabled={!props.canSubmit} onClick={props.submitReview} type="button">
              Submit Review
            </button>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-black text-[#0F172A]">Pending Reviews</h2>
          <p className="text-xs font-semibold text-[#475569]">Complete the current creator audit to unlock the next partner review.</p>
        </div>
        {lockedTasks.map((lockedTask, index) => (
          <div className="relative overflow-hidden rounded-[8px] border border-slate-200 bg-white p-3 shadow-sm" key={`${lockedTask.id}-${index}`}>
            <div className="flex items-center gap-3 blur-[3px]">
              <div className="h-16 w-24 shrink-0 rounded-[8px] bg-gradient-to-br from-slate-200 via-slate-300 to-slate-100" />
              <div className="min-w-0">
                <p className="truncate text-xs font-black text-[#FE2C55]">{lockedTask.creator}</p>
                <p className="truncate text-sm font-black text-[#0F172A]">{lockedTask.title}</p>
                <p className="text-xs font-semibold text-[#475569]">Human verification review</p>
              </div>
            </div>
            <div className="absolute inset-0 grid place-items-center bg-white/45 backdrop-blur-sm">
              <div className="flex flex-col items-center text-center">
                <div className="mb-2 grid h-10 w-10 place-items-center rounded-full bg-[#0F172A] text-white">
                  <LockKeyholeIcon size={19} />
                </div>
                <p className="max-w-[230px] text-xs font-black text-[#0F172A]">Complete the previous review to unlock this task.</p>
              </div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

function WalletScreen(props: {
  balance: number;
  verificationComplete: boolean;
  user: User;
  pendingBalance: number;
  paymentAccount: string;
  paymentBank: string;
  paymentData: string;
  paymentMethod: string;
  paymentRouting: string;
  setPaymentAccount: (value: string) => void;
  setPaymentBank: (value: string) => void;
  setPaymentData: (value: string) => void;
  setPaymentMethod: (value: string) => void;
  setPaymentRouting: (value: string) => void;
}) {
  const storageKey = `ttp_withdrawal_verification:${props.user.email.toLowerCase()}`;
  const [step, setStep] = useState(1);
  const [legalName, setLegalName] = useState(props.user.name);
  const [birthDate, setBirthDate] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [idType, setIdType] = useState("Driver's license");
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [withdrawal, setWithdrawal] = useState<WithdrawalState | null>(() => readWithdrawalState(props.user.email));
  const submitted = Boolean(withdrawal);

  const hasPayoutDetails = props.paymentMethod === "Bank Transfer (ACH)"
    ? Boolean(props.paymentBank.trim() && props.paymentRouting.trim() && props.paymentAccount.trim())
    : Boolean(props.paymentData.trim());
  const hasIdentity = Boolean(legalName.trim() && birthDate && address.trim() && city.trim() && region.trim() && postalCode.trim());
  const passportSelected = idType === "U.S. passport book";
  const hasDocuments = Boolean(idFront && (passportSelected || idBack));
  const hasFaceCheck = Boolean(selfie);

  function submitVerification() {
    if (!consent || !hasPayoutDetails || !hasIdentity || !hasDocuments || !hasFaceCheck) return;
    const nowIso = new Date().toISOString();
    const state: WithdrawalState = {
      amount: props.balance,
      emailsSent: [],
      method: props.paymentMethod,
      micro1: "",
      micro2: "",
      reference: buildWithdrawalReference(props.user.email),
      requestedAt: nowIso,
      stage: 0,
      stageStartedAt: nowIso,
      tasks: {},
    };
    window.localStorage.setItem(storageKey, JSON.stringify({ status: "pending", submittedAt: nowIso, payoutMethod: props.paymentMethod }));
    writeWithdrawalState(props.user.email, state);
    setWithdrawal(state);
  }


  if (!props.verificationComplete) {
    return (
      <div>
        <h1 className="mb-4 text-2xl font-black text-[#0F172A]">Wallet</h1>
        <MetricCard label="Available Balance" value={usd(props.balance)} tone="bg-white" />
        <section className="mt-4 rounded-[8px] border border-slate-200 bg-white p-5 text-center shadow-sm">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-[#F1F5F9] text-[#FE2C55]"><LockKeyholeIcon size={26} /></div>
          <h2 className="text-xl font-black">Withdrawal verification locked</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#475569]">
            Complete all six human-verification reviews before registering a withdrawal request.
          </p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full bg-[#FE2C55]" style={{ width: "0%" }} />
          </div>
        </section>
      </div>
    );
  }

  if (submitted && withdrawal) {
    return (
      <WithdrawalTracker
        state={withdrawal}
        user={props.user}
        onChange={(next) => {
          writeWithdrawalState(props.user.email, next);
          setWithdrawal(next);
        }}
      />
    );
  }


  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div><p className="text-xs font-black uppercase tracking-[0.14em] text-[#FE2C55]">Step {step} of 5</p><h1 className="text-2xl font-black text-[#0F172A]">Withdrawal Verification</h1></div>
        <div className="rounded-[8px] bg-emerald-50 px-3 py-2 text-right"><p className="text-[10px] font-black text-emerald-700">ELIGIBLE</p><p className="font-black">{usd(props.balance)}</p></div>
      </div>
      <StepProgress step={step} total={5} />
      <section className="mt-4 rounded-[8px] border border-slate-200 bg-white p-4 shadow-sm">
        {step === 1 && <>
          <StepHeading icon={<Landmark size={22} />} title="Choose payout method" text="Register the account where an approved withdrawal should be sent." />
          <select className="mb-3 h-12 w-full rounded-[8px] border border-slate-200 bg-[#F8FAFC] px-4 text-sm font-bold" value={props.paymentMethod} onChange={(event) => props.setPaymentMethod(event.target.value)}>
            {paymentOptions.map((method) => <option key={method}>{method}</option>)}
          </select>
          <PaymentFields account={props.paymentAccount} bank={props.paymentBank} data={props.paymentData} method={props.paymentMethod} routing={props.paymentRouting} setAccount={props.setPaymentAccount} setBank={props.setPaymentBank} setData={props.setPaymentData} setRouting={props.setPaymentRouting} />
        </>}
        {step === 2 && <>
          <StepHeading icon={<MapPin size={22} />} title="Confirm identity details" text="Enter details exactly as they appear on your government-issued identification." />
          <div className="space-y-3">
            <VerificationInput label="Legal name" value={legalName} onChange={setLegalName} placeholder="Full legal name" />
            <label className="block"><span className="mb-1.5 block text-xs font-black text-[#475569]">Date of birth</span><input className="h-12 w-full rounded-[8px] border border-slate-200 bg-[#F8FAFC] px-4 text-sm font-bold" type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} /></label>
            <VerificationInput label="Residential address" value={address} onChange={setAddress} placeholder="Street address" />
            <div className="grid grid-cols-2 gap-3"><VerificationInput label="City" value={city} onChange={setCity} placeholder="City" /><VerificationInput label="State" value={region} onChange={setRegion} placeholder="State" /></div>
            <VerificationInput label="ZIP code" value={postalCode} onChange={setPostalCode} placeholder="ZIP code" />
          </div>
        </>}
        {step === 3 && <>
          <StepHeading icon={<IdCard size={22} />} title="Select identity documents" text="Use clear, unedited images. Sensitive files are not stored by this local preview." />
          <select className="mb-3 h-12 w-full rounded-[8px] border border-slate-200 bg-[#F8FAFC] px-4 text-sm font-bold" value={idType} onChange={(event) => setIdType(event.target.value)}>
            <option>Driver's license</option>
            <option>State-issued photo ID</option>
            <option>U.S. passport book</option>
            <option>U.S. passport card</option>
            <option>Permanent Resident Card (Green Card)</option>
            <option>Employment Authorization Document</option>
            <option>U.S. military ID</option>
            <option>Tribal photo ID</option>
          </select>
          <p className="mb-3 rounded-[8px] border border-cyan-100 bg-cyan-50 p-3 text-xs font-semibold leading-5 text-cyan-900">
            Driver&apos;s license is preselected because it is the most commonly used photo ID for U.S. identity checks. Use another accepted government-issued photo ID if needed.
          </p>
          <div className="space-y-3">
            <DocumentInput label={passportSelected ? "Passport photo and information page" : `${idType} - front`} file={idFront} onChange={setIdFront} />
            {!passportSelected && <DocumentInput label={`${idType} - back`} file={idBack} onChange={setIdBack} />}
          </div>
        </>}
        {step === 4 && <>
          <StepHeading icon={<ShieldCheck size={22} />} title="Review and authorize" text="Confirm the request before it is submitted for identity and payout review." />
          <div className="space-y-3 rounded-[8px] bg-[#F8FAFC] p-3 text-sm"><StatusLine label="Amount" value={usd(props.balance)} /><StatusLine label="Payout" value={props.paymentMethod} /><StatusLine label="Identity" value={legalName} /><StatusLine label="Photo ID" value={idType} /><StatusLine label="Facial check" value="Next step" /></div>
          <label className="mt-4 flex items-start gap-3 text-xs font-semibold leading-5 text-[#475569]"><input className="mt-0.5 h-5 w-5 shrink-0 accent-[#FE2C55]" type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />I confirm that the information is accurate and authorize identity verification for this withdrawal request.</label>
        </>}
        {step === 5 && <>
          <StepHeading icon={<ScanFace size={22} />} title="Final facial verification" text="Take a current selfie to confirm that a real person is present and completing this request." />
          <FacialCapture file={selfie} onCapture={setSelfie} />
          <button className="mt-4 min-h-12 w-full rounded-[8px] bg-[#FE2C55] px-4 py-3 text-sm font-black text-white shadow-[3px_3px_0_#25F4EE] disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none" disabled={!hasFaceCheck} onClick={submitVerification} type="button">
            Submit Verification Request
          </button>
        </>}
        <div className="mt-5 flex gap-3">
          {step > 1 && <button className="flex h-12 flex-1 items-center justify-center gap-1 rounded-[8px] bg-[#F1F5F9] text-sm font-black" onClick={() => setStep((value) => value - 1)} type="button"><ChevronLeft size={17} /> Back</button>}
          {step < 5 && <button className="flex h-12 flex-1 items-center justify-center gap-1 rounded-[8px] bg-[#FE2C55] text-sm font-black text-white shadow-[3px_3px_0_#25F4EE] disabled:bg-slate-300 disabled:shadow-none" disabled={(step === 1 && !hasPayoutDetails) || (step === 2 && !hasIdentity) || (step === 3 && !hasDocuments) || (step === 4 && !consent)} onClick={() => setStep((value) => value + 1)} type="button">{step === 4 ? "Continue to Face Check" : "Continue"} <ChevronRight size={17} /></button>}
        </div>
      </section>
    </div>
  );
}

function RefundScreen(props: {
  account: string;
  approved: boolean;
  bank: string;
  data: string;
  loading: boolean;
  method: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  routing: string;
  setAccount: (value: string) => void;
  setBank: (value: string) => void;
  setData: (value: string) => void;
  setMethod: (value: string) => void;
  setRouting: (value: string) => void;
}) {
  const hasPayoutDetails = props.method === "Bank Transfer (ACH)"
    ? Boolean(props.bank.trim() && props.routing.trim() && props.account.trim())
    : Boolean(props.data.trim());

  return (
    <div>
      <h1 className="mb-4 text-2xl font-black text-[#0F172A]">Tax Refund Portal</h1>
      <section className="rounded-[8px] border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm leading-6 text-[#475569]">
          Tax Refund Pending: A fee of $37.44 linked to your ID is eligible for reimbursement. Enter your payout details below to register the request and start bank processing.
        </p>
        {props.approved ? (
          <div className="mt-5 rounded-[8px] border border-emerald-200 bg-emerald-50 p-4">
            <div className="mb-3 flex items-center gap-2 text-emerald-700">
              <ShieldCheck size={20} />
              <p className="text-sm font-black">Refund details confirmed</p>
            </div>
            <p className="text-sm font-black leading-6 text-emerald-700">
              Status: Processing... Your refund of $37.44 has been registered and is now moving through bank verification, payment network review, and account validation. Depending on your selected bank or payout provider, the credit will be posted to your account within 15 business days.
            </p>
          </div>
        ) : (
          <form className="mt-5 space-y-4" onSubmit={props.onSubmit}>
            <select className="h-12 w-full rounded-[8px] border border-slate-200 bg-[#F8FAFC] px-4 text-sm font-bold text-[#0F172A]" value={props.method} onChange={(event) => props.setMethod(event.target.value)}>
              {paymentOptions.map((method) => <option key={method}>{method}</option>)}
            </select>
            <PaymentFields
              account={props.account}
              bank={props.bank}
              data={props.data}
              method={props.method}
              routing={props.routing}
              setAccount={props.setAccount}
              setBank={props.setBank}
              setData={props.setData}
              setRouting={props.setRouting}
            />
            <button className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-[#FE2C55] px-4 py-3 text-sm font-black text-white shadow-lg shadow-rose-200 transition active:scale-[0.98] disabled:border disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none" disabled={props.loading || !hasPayoutDetails} type="submit">
              {props.loading && <Loader2 className="animate-spin" size={18} />}
              Confirm & Register Details
            </button>
            {!hasPayoutDetails && <p className="text-center text-xs font-bold text-[#64748B]">Enter your payout details to confirm the refund request.</p>}
          </form>
        )}
      </section>
    </div>
  );
}

function PaymentFields(props: {
  account: string;
  bank: string;
  data: string;
  method: string;
  routing: string;
  setAccount: (value: string) => void;
  setBank: (value: string) => void;
  setData: (value: string) => void;
  setRouting: (value: string) => void;
}) {
  if (props.method === "Bank Transfer (ACH)") {
    return (
      <div className="space-y-3">
        <label className="block">
          <span className="mb-1.5 block text-xs font-black text-[#475569]">Bank</span>
          <div className="flex h-12 items-center gap-2 rounded-[8px] border border-slate-200 bg-[#F8FAFC] px-3">
            <Search size={16} className="shrink-0 text-[#475569]" />
            <input
              className="min-w-0 flex-1 bg-transparent text-sm font-bold text-[#0F172A] outline-none placeholder:text-slate-400"
              onChange={(event) => props.setBank(event.target.value)}
              placeholder="Search your bank"
              value={props.bank}
            />
          </div>
        </label>
        <LabeledPaymentInput label="Routing number" onChange={props.setRouting} placeholder="Enter your routing number" value={props.routing} />
        <LabeledPaymentInput label="Account number" onChange={props.setAccount} placeholder="Enter your account number" value={props.account} />
      </div>
    );
  }

  const placeholder =
    props.method === "PayPal"
      ? "Enter your PayPal email"
      : props.method === "Venmo"
        ? "Enter your Venmo username"
        : props.method === "Cash App"
          ? "Enter your Cash App username"
          : props.method === "Zelle"
            ? "Enter your Zelle email or phone"
            : "Enter your payout details";

  return (
    <input
      className="h-12 w-full rounded-[8px] border border-slate-200 bg-[#F8FAFC] px-4 text-sm font-bold text-[#0F172A] outline-none placeholder:text-slate-400"
      onChange={(event) => props.setData(event.target.value)}
      placeholder={placeholder}
      value={props.data}
    />
  );
}

function LabeledPaymentInput({ label, onChange, placeholder, value }: { label: string; onChange: (value: string) => void; placeholder: string; value: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-black text-[#475569]">{label}</span>
      <input
        className="h-12 w-full rounded-[8px] border border-slate-200 bg-[#F8FAFC] px-4 text-sm font-bold text-[#0F172A] outline-none placeholder:text-slate-400"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}

function SupportScreen({ user }: { user: User }) {
  type ChatStatus = "idle" | "online" | "reading" | "typing";
  type ChatMessage = { from: "assistant" | "system" | "user"; text: string };

  const chatStorageKey = `ttp_support_chat:${user.email.toLowerCase()}`;
  const [message, setMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(chatStorageKey) || "[]") as ChatMessage[];
      return Array.isArray(saved) ? saved.filter((item) => item?.from && item?.text).slice(-40) : [];
    } catch {
      return [];
    }
  });
  const [chatStatus, setChatStatus] = useState<ChatStatus>(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(chatStorageKey) || "[]") as ChatMessage[];
      return Array.isArray(saved) && saved.length ? "online" : "idle";
    } catch {
      return "idle";
    }
  });
  const [queuedMessages, setQueuedMessages] = useState<string[]>([]);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const requestInFlight = useRef(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(chatStorageKey, JSON.stringify(chatMessages.slice(-40)));
    } catch {
      // Keep chat working in memory if storage is unavailable.
    }
  }, [chatMessages, chatStorageKey]);

  useEffect(() => {
    const node = chatScrollRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [chatMessages, chatStatus]);

  useEffect(() => {
    if (chatStatus !== "online" || requestInFlight.current || !queuedMessages.length) return;
    const combinedQuestion = queuedMessages.join("\n");
    setQueuedMessages([]);
    void requestSupportReply(combinedQuestion);
  }, [chatStatus, queuedMessages]);

  function startChat() {
    setChatMessages([
      {
        from: "system",
        text: "Chloe will reply shortly.",
      },
      {
        from: "assistant",
        text: `Hi ${user.name.split(" ")[0] || "there"}! What can I help you with?`,
      },
    ]);
    setChatStatus("online");
  }

  async function requestSupportReply(question: string) {
    requestInFlight.current = true;
    setChatStatus("reading");

    const historySource =
      chatMessages[chatMessages.length - 1]?.from === "user"
        ? chatMessages
        : [...chatMessages, { from: "user" as const, text: question }];
    const history = historySource
      .filter((item) => item.from !== "system")
      .slice(-10)
      .map((item) => ({
        role: item.from === "user" ? ("user" as const) : ("assistant" as const),
        text: item.text,
      }));
    const readingDelay = Math.min(4_500, Math.max(1_400, question.length * 28));
    const startedAt = Date.now();
    let reply = "";

    try {
      const response = await fetch("/api/public/support-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: user.name.split(" ")[0] || "customer",
          messages: history,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { reply?: string };
      if (response.ok && data.reply) reply = data.reply;
    } catch (error) {
      console.error("[Support chat] request failed", error);
    }

    const remainingReadTime = Math.max(0, readingDelay - (Date.now() - startedAt));
    await wait(remainingReadTime);
    setChatStatus("typing");

    const finalReply = reply || getOfflineSupportReply(question);
    await wait(Math.min(5_000, Math.max(1_500, finalReply.length * 18)));

    setChatMessages((current) => [...current, { from: "assistant", text: finalReply }]);
    requestInFlight.current = false;
    setChatStatus("online");
  }

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || chatStatus === "idle") return;

    setChatMessages((current) => [...current, { from: "user", text: trimmed }]);
    setMessage("");
    if (requestInFlight.current) {
      setQueuedMessages((current) => [...current, trimmed]);
      return;
    }
    void requestSupportReply(trimmed);
  }

  return (
    <div className="space-y-4">
      <section className="rounded-[8px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-[#0F172A]">Live Support</h2>
            <p className="mt-1 text-xs font-bold text-[#64748B]">Chloe is online now</p>
          </div>
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${chatStatus === "idle" ? "animate-pulse bg-emerald-500" : "bg-emerald-500"}`} />
        </div>

        {chatStatus === "idle" ? (
          <div className="mt-4 rounded-[8px] border border-slate-200 bg-[#F8FAFC] p-4 text-center">
            <img
              alt="Chloe from Task Partners Support"
              className="mx-auto h-16 w-16 rounded-full border-2 border-white object-cover object-top shadow-md"
              height="64"
              loading="lazy"
              src="/assets/chloe-task-partners.jpeg"
              width="64"
            />
            <p className="mt-3 text-sm font-black text-[#0F172A]">Hi, I&apos;m Chloe</p>
            <p className="mt-1 text-xs font-bold leading-5 text-[#64748B]">
              I&apos;m online now. Start a conversation and send your question in the chat.
            </p>
            <button className="mt-4 h-12 w-full rounded-[8px] bg-[#FE2C55] text-sm font-black text-white transition-colors hover:bg-[#E9274F]" onClick={startChat} type="button">
              Start live support
            </button>
          </div>
        ) : (
          <>
            <div aria-live="polite" className="mt-4 max-h-80 space-y-3 overflow-y-auto rounded-[8px] bg-[#F8FAFC] p-3" ref={chatScrollRef}>
              {chatMessages.map((item, index) =>
                item.from === "system" ? (
                  <p className="mx-auto max-w-[94%] text-center text-[11px] font-bold leading-4 text-[#64748B]" key={`${item.from}-${index}`}>
                    {item.text}
                  </p>
                ) : (
                  <div className={`flex ${item.from === "user" ? "justify-end" : "justify-start"}`} key={`${item.from}-${index}`}>
                    <div className="flex max-w-[90%] items-end gap-2">
                      {item.from === "assistant" && (
                        <img
                          alt=""
                          aria-hidden="true"
                          className="h-7 w-7 shrink-0 rounded-full border border-white object-cover object-top shadow-sm"
                          height="28"
                          src="/assets/chloe-task-partners.jpeg"
                          width="28"
                        />
                      )}
                      <div className={`${item.from === "user" ? "" : "space-y-1"}`}>
                        {item.from === "assistant" && <p className="px-1 text-[10px] font-black uppercase text-[#64748B]">Chloe · Support</p>}
                        <p className={`rounded-[8px] px-3 py-2 text-xs font-bold leading-5 ${item.from === "user" ? "bg-[#FE2C55] text-white" : "border border-slate-200 bg-white text-[#334155]"}`}>
                          {item.text}
                        </p>
                      </div>
                    </div>
                  </div>
                ),
              )}
              {(chatStatus === "reading" || chatStatus === "typing") && (
                <div className="flex items-center gap-2 text-[11px] font-black text-[#64748B]">
                  <Loader2 className="animate-spin text-[#25F4EE]" size={14} />
                  Chloe is {chatStatus === "reading" ? "reading your message" : "typing"}...
                </div>
              )}
            </div>
            <form className="mt-3 flex gap-2" onSubmit={sendMessage}>
              <input
                aria-label="Support message"
                className="h-12 min-w-0 flex-1 rounded-[8px] border border-slate-200 bg-[#F8FAFC] px-3 text-sm font-bold text-[#0F172A] outline-none placeholder:text-slate-400 focus:border-[#25F4EE]"
                maxLength={1200}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Type your message..."
                value={message}
              />
              <button aria-label="Send message" className="grid h-12 w-12 shrink-0 place-items-center rounded-[8px] bg-[#FE2C55] text-white disabled:bg-slate-300" disabled={!message.trim()} type="submit">
                <Send size={18} />
              </button>
            </form>
            <p className="mt-2 text-[10px] font-bold leading-4 text-[#64748B]">
              Never send passwords, verification codes, card or bank details, identity numbers, documents, or selfies in chat.
            </p>
            <a className="mt-3 block text-center text-xs font-black text-[#2563EB] underline underline-offset-2" href="mailto:support@northcrestdigital.life?subject=Human%20support%20request">
              Request human support
            </a>
          </>
        )}
      </section>

    </div>
  );
}

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function getOfflineSupportReply(question: string) {
  const text = question.toLowerCase();

  if (/(login|email|access|account|profile|sign in|entrar|conta)/.test(text)) {
    return "No worries. Sign in with the same name and email used to create your account.";
  }
  if (/(withdraw|payout|cash out|balance|money|dinheiro|cad[eê]|saque|saldo|2800)/.test(text)) {
    return "Your balance is safe. Check Wallet for the current review stage; once it clears, your payout moves forward.";
  }
  if (/(refund|charge|billing|payment|cancel|reembolso|cobran[cç]a)/.test(text)) {
    return "Don't worry. Your request stays saved; check the Refund tab for its latest status.";
  }
  if (/(video|review|task|human check|verification)/.test(text)) {
    return "You're on the right track. Finish all six reviews and Wallet will unlock automatically.";
  }
  if (/(document|identity|selfie|id|driver|passport)/.test(text)) {
    return "Everything is on track. Complete the document step in Wallet, then wait for the review status to update.";
  }
  return "I've got you. Tell me which screen you're on and what you're waiting for.";
}

function ProfileScreen({ user, reviews, balance }: { user: User; reviews: Review[]; balance: number }) {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-black text-[#0F172A]">Profile</h1>
      <div className="rounded-[8px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-[#F1F5F9] text-[#0F172A]"><UserRound size={31} /></div>
          <div className="min-w-0">
            <p className="text-lg font-black">{user.name}</p>
            <p className="truncate text-sm font-bold text-[#475569]">{user.email}</p>
            <p className="mt-1 text-xs font-black text-[#2563EB]">Total balance: {usd(balance)}</p>
          </div>
        </div>
      </div>
      <h2 className="mb-3 mt-5 text-lg font-black text-[#0F172A]">Review History</h2>
      <div className="space-y-2">
        {(reviews.length ? reviews : [{ date: "Today", title: "No reviews yet", reward: 0, status: "Waiting" }]).map((review, index) => (
          <div key={`${review.title}-${index}`} className="rounded-[8px] border border-slate-200 bg-white p-3 text-sm shadow-sm">
            <div className="flex items-center justify-between gap-3 font-black"><span>{review.title}</span><span>{usd(review.reward)}</span></div>
            <div className="mt-1 flex items-center justify-between text-xs font-bold text-[#475569]"><span>{review.date}</span><span>{review.status}</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BottomNav({ screen, setScreen }: { screen: Screen; setScreen: (screen: Screen) => void }) {
  return (
    <nav className="shrink-0 border-t border-slate-200 bg-white px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 text-[11px] font-black shadow-[0_-8px_24px_rgba(15,23,42,.08)]">
      <div className="grid grid-cols-5">
        <NavButton active={screen === "tasks"} icon={<Home size={21} />} label="Tasks" onClick={() => setScreen("tasks")} />
        <NavButton active={screen === "wallet"} icon={<Wallet size={21} />} label="Wallet" onClick={() => setScreen("wallet")} />
        <NavButton active={screen === "refund"} icon={<ReceiptText size={21} />} label="Refund" onClick={() => setScreen("refund")} />
        <NavButton active={screen === "support"} icon={<MessageCircle size={21} />} label="Support" onClick={() => setScreen("support")} />
        <NavButton active={screen === "profile"} icon={<UserRound size={21} />} label="Profile" onClick={() => setScreen("profile")} />
      </div>
    </nav>
  );
}

function ProcessingOverlay({ step }: { step: number }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-white/96 px-7 text-center text-[#0F172A]">
      <div className="w-full max-w-[340px]">
        <div className="mx-auto mb-7 grid h-20 w-20 place-items-center rounded-full bg-[#FE2C55] text-white shadow-xl shadow-rose-200">
          <Loader2 className="animate-spin" size={36} />
        </div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2563EB]">Processing review</p>
        <h2 className="mt-3 text-2xl font-black">{processingSteps[step]}</h2>
      </div>
    </div>
  );
}

function ChoiceRow({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <p className="mb-2 text-sm font-black text-[#0F172A]">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        {["Yes", "No"].map((option) => (
          <button key={option} className={`h-11 rounded-[8px] text-sm font-black transition ${value === option ? "bg-[#FE2C55] text-white shadow-lg shadow-rose-100" : "bg-white text-[#475569]"}`} onClick={(event) => preserveScrollFrom(event.currentTarget, () => onChange(option))} onMouseDown={(event) => event.preventDefault()} type="button">
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function OptionRow({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <p className="mb-2 text-sm font-black text-[#0F172A]">{label}</p>
      <div className="grid gap-2">
        {options.map((option) => (
          <button key={option} className={`min-h-11 rounded-[8px] px-3 text-left text-sm font-black transition ${value === option ? "bg-[#FE2C55] text-white" : "bg-white text-[#475569]"}`} onClick={(event) => preserveScrollFrom(event.currentTarget, () => onChange(option))} onMouseDown={(event) => event.preventDefault()} type="button">
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function StepProgress({ step, total }: { step: number; total: number }) {
  return (
    <div className="mt-4 grid gap-2" style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }} aria-label={`Verification step ${step} of ${total}`}>
      {Array.from({ length: total }, (_, index) => index + 1).map((item) => <span className={`h-1.5 rounded-full ${item <= step ? (item % 2 === 0 ? "bg-[#25F4EE]" : "bg-[#FE2C55]") : "bg-slate-200"}`} key={item} />)}
    </div>
  );
}

function StepHeading({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="mb-5 flex gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] bg-[#F1F5F9] text-[#2563EB]">{icon}</div>
      <div><h2 className="text-lg font-black">{title}</h2><p className="mt-1 text-xs font-semibold leading-5 text-[#64748B]">{text}</p></div>
    </div>
  );
}

function VerificationInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-black text-[#475569]">{label}</span><input className="h-12 w-full rounded-[8px] border border-slate-200 bg-[#F8FAFC] px-4 text-sm font-bold outline-none focus:border-[#2563EB]" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>;
}

function DocumentInput({ label, file, onChange }: { label: string; file: File | null; onChange: (file: File | null) => void }) {
  return (
    <label className="flex min-h-16 cursor-pointer items-center justify-between gap-3 rounded-[8px] border border-dashed border-slate-300 bg-[#F8FAFC] px-3 py-3">
      <span className="min-w-0"><span className="block text-xs font-black">{label}</span><span className="mt-1 block truncate text-[11px] font-semibold text-[#64748B]">{file ? file.name : "JPG, PNG, or PDF up to 10 MB"}</span></span>
      <span className="shrink-0 rounded-[8px] bg-white px-3 py-2 text-xs font-black text-[#2563EB] shadow-sm">{file ? "Replace" : "Select"}</span>
      <input className="sr-only" type="file" accept="image/jpeg,image/png,application/pdf" onChange={(event) => onChange(event.target.files?.[0] ?? null)} />
    </label>
  );
}

function FacialCapture({ file, onCapture }: { file: File | null; onCapture: (file: File | null) => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<"idle" | "camera" | "checking" | "retry" | "calibration" | "captured">(
    file ? "captured" : "idle",
  );
  const [message, setMessage] = useState("");
  const [validCaptures, setValidCaptures] = useState(file ? 2 : 0);

  useEffect(() => () => stopCameraStream(streamRef), []);

  async function openCamera() {
    setMessage("");
    onCapture(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setStatus("retry");
      setMessage("Live camera is unavailable in this browser. Tap 'Use Device Camera' below to continue.");
      return;
    }
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setStatus("retry");
      setMessage("Camera requires a secure connection. Tap 'Use Device Camera' below to continue.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 960 } },
      });
      stopCameraStream(streamRef);
      streamRef.current = stream;
      setStatus("camera");
      window.requestAnimationFrame(() => {
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        void videoRef.current.play();
      });
    } catch (error) {
      const name = (error as { name?: string })?.name ?? "";
      setStatus("retry");
      if (name === "NotAllowedError" || name === "SecurityError") {
        setMessage("Camera permission was denied. Enable camera access in your browser settings, or tap 'Use Device Camera' below.");
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        setMessage("No front camera detected. Tap 'Use Device Camera' below to take the selfie with your device app.");
      } else {
        setMessage("Camera could not start. Tap 'Use Device Camera' below to continue.");
      }
    }
  }

  function capturePhoto() {
    const video = videoRef.current;
    if (!video || video.videoWidth < 320 || video.videoHeight < 320) {
      setStatus("retry");
      setMessage("The camera image is not ready. Hold still and try again.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.min(video.videoWidth, 900);
    canvas.height = Math.round((canvas.width / video.videoWidth) * video.videoHeight);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    setStatus("checking");
    stopCameraStream(streamRef);

    window.setTimeout(() => {
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let brightness = 0;
      let samples = 0;
      for (let index = 0; index < imageData.length; index += 160) {
        brightness += (imageData[index] + imageData[index + 1] + imageData[index + 2]) / 3;
        samples += 1;
      }
      const average = samples ? brightness / samples : 0;
      if (average < 42 || average > 242) {
        setStatus("retry");
        setMessage(average < 42 ? "The image is too dark. Move to a brighter area and try again." : "There is too much light. Reduce glare and try again.");
        return;
      }
      canvas.toBlob((blob) => {
        if (!blob) {
          setStatus("retry");
          setMessage("We could not read the image. Please try again.");
          return;
        }
        if (validCaptures === 0) {
          setValidCaptures(1);
          setStatus("calibration");
          setMessage("Camera calibration complete. Take one final selfie for manual identity review.");
          return;
        }
        onCapture(new File([blob], `facial-check-${Date.now()}.jpg`, { type: "image/jpeg" }));
        setValidCaptures(2);
        setStatus("captured");
        setMessage("Final selfie captured and ready for manual identity review.");
      }, "image/jpeg", 0.88);
    }, 1200);
  }

  return (
    <div className="overflow-hidden rounded-[8px] border border-slate-200 bg-[#0B0B0F] text-white">
      <div className="relative aspect-[3/4] w-full overflow-hidden">
        {status === "camera" ? (
          <>
            <video ref={videoRef} autoPlay muted playsInline className="h-full w-full scale-x-[-1] object-cover" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_36%_43%_at_50%_44%,transparent_0%,transparent_96%,rgba(0,0,0,.68)_100%)]" />
            <div className="pointer-events-none absolute left-1/2 top-[44%] h-[58%] w-[68%] -translate-x-1/2 -translate-y-1/2 rounded-[48%] border-2 border-[#25F4EE] shadow-[0_0_0_2px_#FE2C55,0_0_28px_rgba(37,244,238,.45)]" />
            <p className="absolute inset-x-4 bottom-5 text-center text-xs font-black">Center your face inside the frame</p>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            {status === "checking" ? <Loader2 className="animate-spin text-[#25F4EE]" size={44} /> : status === "captured" ? <CheckCircle2 className="text-emerald-400" size={48} /> : <ScanFace className="text-[#25F4EE]" size={52} />}
            <h3 className="mt-4 text-lg font-black">{status === "checking" ? "Checking image quality..." : status === "captured" ? "Final selfie captured" : status === "calibration" ? "Calibration complete" : status === "retry" ? "Please try again" : "Ready for facial check"}</h3>
            <p className="mt-2 text-xs font-semibold leading-5 text-slate-300">{message || "Use even lighting, look directly at the camera, and keep your full face visible."}</p>
          </div>
        )}
      </div>
      <div className="border-t border-white/10 bg-white p-4 text-[#0F172A]">
        {status === "camera" ? (
          <button className="flex h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-[#FE2C55] text-sm font-black text-white shadow-[3px_3px_0_#25F4EE]" onClick={capturePhoto} type="button"><Camera size={18} /> Take Photo</button>
        ) : status !== "checking" ? (
          <button className="flex h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-[#0F172A] text-sm font-black text-white shadow-[3px_3px_0_#25F4EE]" onClick={openCamera} type="button"><Camera size={18} /> {status === "captured" ? "Retake Final Selfie" : status === "calibration" ? "Take Final Selfie" : "Open Live Camera"}</button>
        ) : null}
        {status !== "camera" && status !== "checking" && (
          <label className="mt-3 flex h-12 cursor-pointer items-center justify-center gap-2 rounded-[8px] bg-[#F1F5F9] text-sm font-black">
            Use Device Camera
            <input className="sr-only" type="file" accept="image/*" capture="user" onChange={(event) => {
              const selected = event.target.files?.[0] ?? null;
              if (!selected) {
                setStatus("retry");
                setMessage("No image was selected.");
                return;
              }
              if (validCaptures === 0) {
                setValidCaptures(1);
                setStatus("calibration");
                setMessage("Camera calibration complete. Take one final selfie for manual identity review.");
                event.target.value = "";
                return;
              }
              onCapture(selected);
              setValidCaptures(2);
              setStatus("captured");
              setMessage("Final selfie captured and ready for manual identity review.");
            }} />
          </label>
        )}
      </div>
    </div>
  );
}

function StatusLine({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-4"><span className="font-semibold text-[#64748B]">{label}</span><span className="text-right font-black text-[#0F172A]">{value}</span></div>;
}

function stopCameraStream(streamRef: { current: MediaStream | null }) {
  streamRef.current?.getTracks().forEach((track) => track.stop());
  streamRef.current = null;
}

function NavButton({ active, icon, label, onClick }: { active: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return <button className={`flex h-14 flex-col items-center justify-center gap-1 rounded-[8px] ${active ? "bg-[#F1F5F9] text-[#FE2C55]" : "text-[#475569]"}`} onClick={onClick} type="button">{icon}<span>{label}</span></button>;
}

function AuthInput({
  icon,
  onChange,
  placeholder,
  type,
  value,
}: {
  icon: ReactNode;
  onChange: (value: string) => void;
  placeholder: string;
  type: string;
  value: string;
}) {
  return (
    <label className="flex h-13 items-center gap-3 rounded-[8px] border border-slate-200 bg-white px-4 text-[#0F172A] shadow-sm">
      {icon}
      <input
        required
        className="min-w-0 flex-1 bg-transparent text-sm font-bold outline-none placeholder:text-slate-400"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
    </label>
  );
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone: string }) {
  return <div className={`rounded-[8px] border border-slate-200 ${tone} p-4 shadow-sm`}><p className="text-xs font-black uppercase tracking-[0.16em] text-[#475569]">{label}</p><p className="mt-2 text-3xl font-black text-[#0F172A]">{value}</p></div>;
}

function preserveScrollFrom(element: HTMLElement, action: () => void) {
  const scroller = findScrollableParent(element);
  const top = scroller?.scrollTop;
  action();
  if (!scroller || top == null) return;
  window.requestAnimationFrame(() => {
    scroller.scrollTop = top;
    window.setTimeout(() => {
      scroller.scrollTop = top;
    }, 0);
  });
}

function findScrollableParent(element: HTMLElement) {
  let current: HTMLElement | null = element.parentElement;
  while (current) {
    if (current.scrollHeight > current.clientHeight + 10) return current;
    current = current.parentElement;
  }
  return null;
}

function Brand() {
  return <div className="flex items-center gap-2 text-lg font-black text-[#0F172A]"><span className="h-5 w-5 rounded-[6px] bg-[#25F4EE] shadow-[7px_0_0_#FE2C55]" /> Task Partners</div>;
}

function UnsupportedDevice() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#F8FAFC] px-6 text-center text-[#0F172A]">
      <div className="max-w-[420px] rounded-[8px] border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-[#FE2C55] text-white">
          <LockKeyholeIcon size={26} />
        </div>
        <h1 className="text-2xl font-black">Unsupported Device</h1>
        <p className="mt-3 text-sm leading-6 text-[#475569]">
          This application is available only on mobile devices (iOS/Android). Please open it from your smartphone.
        </p>
      </div>
    </main>
  );
}

function Server404() {
  return <main className="grid min-h-dvh place-items-center bg-white text-center text-black"><div><h1 className="text-5xl font-black">404</h1><p className="mt-3 text-lg text-zinc-600">Not Found</p></div></main>;
}

function usd(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function addUSBusinessDays(start: Date, businessDays: number) {
  const result = new Date(start);
  result.setHours(12, 0, 0, 0);
  let added = 0;
  while (added < businessDays) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6 && !isObservedUSFederalHoliday(result)) added += 1;
  }
  return result;
}

function formatUSDate(date: Date) {
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function isObservedUSFederalHoliday(date: Date) {
  const year = date.getFullYear();
  const target = dateKey(date);
  const fixed = [
    new Date(year, 0, 1),
    new Date(year, 5, 19),
    new Date(year, 6, 4),
    new Date(year, 10, 11),
    new Date(year, 11, 25),
  ].flatMap((holiday) => [holiday, observedDate(holiday)]);
  const floating = [
    nthWeekdayOfMonth(year, 0, 1, 3),
    nthWeekdayOfMonth(year, 1, 1, 3),
    lastWeekdayOfMonth(year, 4, 1),
    nthWeekdayOfMonth(year, 8, 1, 1),
    nthWeekdayOfMonth(year, 9, 1, 2),
    nthWeekdayOfMonth(year, 10, 4, 4),
  ];
  return [...fixed, ...floating].some((holiday) => dateKey(holiday) === target);
}

function observedDate(holiday: Date) {
  const observed = new Date(holiday);
  if (holiday.getDay() === 6) observed.setDate(observed.getDate() - 1);
  if (holiday.getDay() === 0) observed.setDate(observed.getDate() + 1);
  return observed;
}

function nthWeekdayOfMonth(year: number, month: number, weekday: number, occurrence: number) {
  const date = new Date(year, month, 1);
  date.setDate(1 + ((7 + weekday - date.getDay()) % 7) + ((occurrence - 1) * 7));
  return date;
}

function lastWeekdayOfMonth(year: number, month: number, weekday: number) {
  const date = new Date(year, month + 1, 0);
  date.setDate(date.getDate() - ((7 + date.getDay() - weekday) % 7));
  return date;
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function countWords(value: string) {
  return value.trim().split(/\s+/).filter((word) => word.length > 1).length;
}

function handleBehavioralEmailTriggers(user: User, balance: number, reviewedCount: number) {
  const count = syncEvaluatedVideoCount(user.email, reviewedCount);
  const log = readTriggeredEmailsLog(user.email);
  const inFlight = readEmailsInFlight(user.email);
  const triggers = pendingEmailTriggersForCount(count, log).filter((trigger) => !inFlight.includes(trigger.key));
  if (!triggers.length) return;

  writeEmailsInFlight(user.email, [...inFlight, ...triggers.map((trigger) => trigger.key)]);

  for (const trigger of triggers) {
    void fetch("/api/public/send-access-email", {
      body: JSON.stringify({
        balance,
        count: trigger.count,
        email: user.email,
        name: user.name,
        template: trigger.template,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }).then((response) => {
      if (!response.ok) {
        void response.text().then((text) => {
          console.warn("[Task Partners] behavioral email failed", response.status, text);
        });
        return;
      }
      const freshLog = readTriggeredEmailsLog(user.email);
      if (!freshLog.includes(trigger.key)) {
        writeTriggeredEmailsLog(user.email, [...freshLog, trigger.key]);
      }
    }).catch((error) => {
      console.warn("[Task Partners] behavioral email failed", error);
    }).finally(() => {
      writeEmailsInFlight(user.email, readEmailsInFlight(user.email).filter((key) => key !== trigger.key));
    });
  }
}

function pendingEmailTriggersForCount(count: number, log: string[]): Array<{ count: number; key: string; template: string }> {
  const milestones = [
    { count: 6, key: "status_progress_complete_v1", template: "progress_complete" },
  ];
  return milestones.filter((milestone) => count >= milestone.count && !log.includes(milestone.key));
}

function syncEvaluatedVideoCount(email: string, reviewedCount: number) {
  const key = userScopedKey(VIDEOS_EVALUATED_COUNT_KEY, email);
  const current = Number(window.localStorage.getItem(key) ?? "0");
  const next = Math.min(TOTAL_TASKS_TO_GOAL, Math.max(current, reviewedCount));
  window.localStorage.setItem(key, String(next));
  window.localStorage.setItem(VIDEOS_EVALUATED_COUNT_KEY, String(next));
  return next;
}

function readTriggeredEmailsLog(email: string): string[] {
  const key = userScopedKey(CONFIRMED_EMAILS_LOG_KEY, email);
  try {
    const raw = window.localStorage.getItem(key) ?? window.localStorage.getItem(CONFIRMED_EMAILS_LOG_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function writeTriggeredEmailsLog(email: string, log: string[]) {
  window.localStorage.setItem(userScopedKey(CONFIRMED_EMAILS_LOG_KEY, email), JSON.stringify(log));
  window.localStorage.setItem(CONFIRMED_EMAILS_LOG_KEY, JSON.stringify(log));
  window.localStorage.setItem(userScopedKey(TRIGGERED_EMAILS_LOG_KEY, email), JSON.stringify(log));
  window.localStorage.setItem(TRIGGERED_EMAILS_LOG_KEY, JSON.stringify(log));
}

function readEmailsInFlight(email: string): string[] {
  const key = userScopedKey(EMAILS_IN_FLIGHT_KEY, email);
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function writeEmailsInFlight(email: string, log: string[]) {
  window.localStorage.setItem(userScopedKey(EMAILS_IN_FLIGHT_KEY, email), JSON.stringify(log));
}

function userScopedKey(key: string, email: string) {
  return `${key}:${email.toLowerCase()}`;
}

function readAccounts(): User[] {
  try {
    const raw = window.localStorage.getItem(ACCOUNTS_KEY);
    return raw ? (JSON.parse(raw) as User[]) : [];
  } catch {
    return [];
  }
}

function readSession(): User | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function readAppState(email: string): { balance: number; introAccepted?: boolean; reviewedIds: string[]; reviews: Review[]; taskIndex: number } | null {
  try {
    const raw = window.localStorage.getItem(appStateKey(email));
    return raw ? (JSON.parse(raw) as { balance: number; reviewedIds: string[]; reviews: Review[]; taskIndex: number }) : null;
  } catch {
    return null;
  }
}

function appStateKey(email: string) {
  return `${APP_STATE_KEY}:${email.toLowerCase()}`;
}

type RefundState = {
  account: string;
  approved: boolean;
  bank: string;
  data: string;
  method: string;
  routing: string;
};

function readRefundState(email: string): RefundState | null {
  try {
    const raw = window.localStorage.getItem(refundStateKey(email));
    return raw ? (JSON.parse(raw) as RefundState) : null;
  } catch {
    return null;
  }
}

function refundStateKey(email: string) {
  return `${REFUND_STATE_KEY}:${email.toLowerCase()}`;
}
