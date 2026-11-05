import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, DollarSign, Film, Loader2, ShieldCheck, Trash2, UsersRound, XCircle } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard" },
      { name: "description", content: "TikTok Task Partners admin dashboard." },
    ],
  }),
  component: AdminDashboard,
});

type AdminVideo = { id: number; title: string; url: string; category: string; reward: number; status: "Active" | "Inactive" };
type Withdrawal = { id: number; user: string; amount: number; method: string; data: string; status: "Pending" | "Approved" | "Rejected" };

const seedVideos: AdminVideo[] = [
  { id: 1, title: "Beauty Launch Audit", url: "https://www.tiktok.com/embed/demo-1", category: "Beauty", reward: 15, status: "Active" },
  { id: 2, title: "Tech Demo Review", url: "https://www.tiktok.com/embed/demo-2", category: "Technology", reward: 18, status: "Active" },
];

const seedWithdrawals: Withdrawal[] = [
  { id: 1001, user: "Mia Carter", amount: 1000, method: "PayPal Email", data: "mia@example.com", status: "Pending" },
  { id: 1002, user: "Noah Brooks", amount: 1240, method: "Cash App", data: "$noahreviews", status: "Pending" },
];

function AdminDashboard() {
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [videos, setVideos] = useState(seedVideos);
  const [withdrawals, setWithdrawals] = useState(seedWithdrawals);
  const [dailyLimit, setDailyLimit] = useState(8);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("");
  const [reward, setReward] = useState(15);

  const totalBalances = useMemo(() => withdrawals.reduce((sum, item) => sum + item.amount, 0), [withdrawals]);

  function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    window.setTimeout(() => {
      setAuthed(true);
      setLoading(false);
    }, 700);
  }

  function addVideo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setVideos((value) => [{ id: Date.now(), title, url, category, reward: Math.min(20, Math.max(5, reward)), status: "Active" }, ...value]);
    setTitle("");
    setUrl("");
    setCategory("");
    setReward(15);
  }

  function setWithdrawalStatus(id: number, status: Withdrawal["status"]) {
    setWithdrawals((value) => value.map((item) => (item.id === id ? { ...item, status } : item)));
  }

  if (!authed) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#070B14] px-4 text-white">
        <form onSubmit={login} className="w-full max-w-[390px] rounded-[8px] border border-white/10 bg-[#101827] p-5 shadow-2xl">
          <div className="mb-5 flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-[8px] bg-blue-500"><ShieldCheck size={25} /></div>
            <div>
              <h1 className="text-xl font-black">Admin Dashboard</h1>
              <p className="text-sm text-slate-400">Role protected admin access</p>
            </div>
          </div>
          <input className="mb-3 h-12 w-full rounded-[8px] bg-white px-3 text-sm font-bold text-black outline-none" placeholder="admin@taskpartners.app" type="email" required />
          <input className="mb-4 h-12 w-full rounded-[8px] bg-white px-3 text-sm font-bold text-black outline-none" placeholder="Password" type="password" required />
          <button className="flex h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-blue-500 font-black" type="submit">
            {loading ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
            Login as Admin
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-[#070B14] px-4 py-5 text-white">
      <section className="mx-auto w-full max-w-6xl">
        <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-black">TikTok Task Partners Admin</h1>
            <p className="text-sm text-slate-400">Videos, limits, withdrawals, users, and review metrics.</p>
          </div>
          <div className="rounded-[8px] bg-blue-500/15 px-4 py-2 text-sm font-black text-blue-200">Daily limit: {dailyLimit} videos/user</div>
        </header>

        <div className="mb-5 grid gap-3 sm:grid-cols-4">
          <Stat icon={<UsersRound />} label="Users" value="1,248" />
          <Stat icon={<Film />} label="Videos" value={String(videos.length)} />
          <Stat icon={<DollarSign />} label="Total Balances" value={money(totalBalances)} />
          <Stat icon={<CheckCircle2 />} label="Reviews" value="8,904" />
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
          <section className="rounded-[8px] border border-white/10 bg-[#101827] p-4">
            <h2 className="mb-4 text-xl font-black">Video Management</h2>
            <form onSubmit={addVideo} className="mb-4 grid gap-2 sm:grid-cols-5">
              <input className="h-11 rounded-[8px] bg-white px-3 text-sm font-bold text-black" placeholder="Title" value={title} onChange={(event) => setTitle(event.target.value)} required />
              <input className="h-11 rounded-[8px] bg-white px-3 text-sm font-bold text-black" placeholder="Video URL" value={url} onChange={(event) => setUrl(event.target.value)} required />
              <input className="h-11 rounded-[8px] bg-white px-3 text-sm font-bold text-black" placeholder="Category" value={category} onChange={(event) => setCategory(event.target.value)} required />
              <input className="h-11 rounded-[8px] bg-white px-3 text-sm font-bold text-black" min={5} max={20} type="number" value={reward} onChange={(event) => setReward(Number(event.target.value))} required />
              <button className="h-11 rounded-[8px] bg-blue-500 font-black" type="submit">Add</button>
            </form>
            <div className="space-y-2">
              {videos.map((video) => (
                <div className="grid gap-2 rounded-[8px] bg-white/5 p-3 text-sm sm:grid-cols-[1fr_120px_80px_40px] sm:items-center" key={video.id}>
                  <div><p className="font-black">{video.title}</p><p className="text-xs text-slate-400">{video.category} | {video.url}</p></div>
                  <span>{money(video.reward)}</span>
                  <span className="font-bold text-emerald-300">{video.status}</span>
                  <button onClick={() => setVideos((value) => value.filter((item) => item.id !== video.id))} type="button"><Trash2 size={18} /></button>
                </div>
              ))}
            </div>
          </section>

          <aside className="space-y-5">
            <section className="rounded-[8px] border border-white/10 bg-[#101827] p-4">
              <h2 className="mb-3 text-xl font-black">System Control</h2>
              <label className="text-sm font-bold text-slate-300">Daily review limit</label>
              <input className="mt-2 h-12 w-full rounded-[8px] bg-white px-3 font-black text-black" min={5} max={10} type="number" value={dailyLimit} onChange={(event) => setDailyLimit(Number(event.target.value))} />
              <p className="mt-2 text-xs text-slate-400">Allowed range: 5 to 10 videos per user per day.</p>
            </section>

            <section className="rounded-[8px] border border-white/10 bg-[#101827] p-4">
              <h2 className="mb-3 text-xl font-black">Withdrawal Moderation</h2>
              <div className="space-y-2">
                {withdrawals.map((item) => (
                  <div className="rounded-[8px] bg-white/5 p-3 text-sm" key={item.id}>
                    <div className="flex items-start justify-between gap-2"><div><p className="font-black">{item.user} - {money(item.amount)}</p><p className="text-xs text-slate-400">{item.method}: {item.data}</p></div><span className="text-xs font-black">{item.status}</span></div>
                    <div className="mt-3 flex gap-2">
                      <button className="flex h-9 flex-1 items-center justify-center gap-1 rounded-[8px] bg-emerald-500 font-black" onClick={() => setWithdrawalStatus(item.id, "Approved")} type="button"><CheckCircle2 size={15} />Approve</button>
                      <button className="flex h-9 flex-1 items-center justify-center gap-1 rounded-[8px] bg-rose-500 font-black" onClick={() => setWithdrawalStatus(item.id, "Rejected")} type="button"><XCircle size={15} />Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="rounded-[8px] border border-white/10 bg-[#101827] p-4"><div className="mb-3 text-blue-300">{icon}</div><p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></div>;
}

function money(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}
