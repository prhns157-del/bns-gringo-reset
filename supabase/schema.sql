create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  video_url text not null,
  category text,
  reward_amount numeric(8, 2) not null check (reward_amount between 5 and 20),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  required_answers jsonb not null default '{}'::jsonb,
  comment_text text not null check (char_length(comment_text) >= 15),
  reward_amount numeric(8, 2) not null,
  created_at timestamptz not null default now(),
  unique (user_id, video_id)
);

create table if not exists public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  amount numeric(10, 2) not null check (amount > 0),
  payment_method text not null check (payment_method in ('PayPal Email', 'Venmo', 'Cash App', 'Zelle', 'Bank Account')),
  payment_details text not null,
  status text not null default 'Pending' check (status in ('Pending', 'Approved', 'Rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.admin_settings (
  id boolean primary key default true,
  daily_video_limit int not null default 8 check (daily_video_limit between 5 and 10),
  minimum_withdrawal numeric(10, 2) not null default 1000 check (minimum_withdrawal >= 1000),
  updated_at timestamptz not null default now(),
  constraint single_admin_settings_row check (id)
);

insert into public.admin_settings (id) values (true)
on conflict (id) do nothing;

create index if not exists reviews_user_created_idx on public.reviews (user_id, created_at desc);
create index if not exists reviews_video_idx on public.reviews (video_id);
create index if not exists withdrawals_user_created_idx on public.withdrawals (user_id, created_at desc);
create index if not exists videos_status_idx on public.videos (status);

alter table public.users enable row level security;
alter table public.videos enable row level security;
alter table public.reviews enable row level security;
alter table public.withdrawals enable row level security;
alter table public.admin_settings enable row level security;

create policy "users read own profile" on public.users
  for select using (auth.uid() = id);

create policy "active videos are readable" on public.videos
  for select using (status = 'active');

create policy "reviews read own" on public.reviews
  for select using (auth.uid() = user_id);

create policy "reviews insert own" on public.reviews
  for insert with check (auth.uid() = user_id);

create policy "withdrawals read own" on public.withdrawals
  for select using (auth.uid() = user_id);

create policy "withdrawals insert own" on public.withdrawals
  for insert with check (auth.uid() = user_id);

create policy "settings readable" on public.admin_settings
  for select using (true);
