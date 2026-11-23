-- Supabase Migration: Create work_logs and attendance tables
-- Run this in the Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Work Logs Table
create table if not exists work_logs (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  details text,
  duration_minutes integer not null default 0,
  work_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Attendance Table
create table if not exists attendance (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  attendance_date date not null,
  first_punch_in text,
  last_punch_out text,
  working_minutes integer not null default 0,
  status text not null default 'not_started',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists idx_work_logs_user_id on work_logs(user_id);
create index if not exists idx_work_logs_work_date on work_logs(work_date);
create index if not exists idx_work_logs_user_date on work_logs(user_id, work_date);

create index if not exists idx_attendance_user_id on attendance(user_id);
create index if not exists idx_attendance_date on attendance(attendance_date);
create index if not exists idx_attendance_user_date on attendance(user_id, attendance_date);

-- Enable Row Level Security
alter table work_logs enable row level security;
alter table attendance enable row level security;

-- Work Logs RLS Policies
create policy "Users can view their own work logs"
  on work_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert their own work logs"
  on work_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own work logs"
  on work_logs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own work logs"
  on work_logs for delete
  using (auth.uid() = user_id);

-- Attendance RLS Policies
create policy "Users can view their own attendance"
  on attendance for select
  using (auth.uid() = user_id);

create policy "Users can insert their own attendance"
  on attendance for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own attendance"
  on attendance for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own attendance"
  on attendance for delete
  using (auth.uid() = user_id);

-- =====================================================
-- Lunch Token Reservation Migration
-- =====================================================

-- 1. Lunch Token Users Table
create table if not exists lunch_token_users (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  short_name text not null,
  normalized_short_name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ck_short_name_length check (char_length(btrim(short_name)) >= 2),
  constraint ck_normalized_short_name check (normalized_short_name = lower(btrim(short_name)))
);

-- 2. Lunch Token Reservations Table
create table if not exists lunch_token_reservations (
  id bigserial primary key,
  lunch_token_user_id bigint references lunch_token_users(id) on delete cascade not null,
  reservation_date date not null,
  token_count integer not null default 1 check (token_count > 0),
  created_at timestamptz not null default now(),
  constraint uq_user_reservation_date unique(lunch_token_user_id, reservation_date),
  constraint ck_working_day check (extract(dow from reservation_date) between 0 and 4)
);

-- Indexes for lunch_token_reservations
create index if not exists idx_lunch_token_reservations_date on lunch_token_reservations(reservation_date desc);
create index if not exists idx_lunch_token_reservations_user_id on lunch_token_reservations(lunch_token_user_id);

-- Enable Row Level Security
alter table lunch_token_users enable row level security;
alter table lunch_token_reservations enable row level security;

-- Policies for lunch_token_users
create policy "Authenticated users can view short names"
  on lunch_token_users for select
  to authenticated
  using (true);

create policy "Users can insert their own short name"
  on lunch_token_users for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Policies for lunch_token_reservations
create policy "Authenticated users can view all reservations"
  on lunch_token_reservations for select
  to authenticated
  using (true);

create policy "Users can insert their own reservations"
  on lunch_token_reservations for insert
  to authenticated
  with check (
    exists (
      select 1 from lunch_token_users
      where lunch_token_users.id = lunch_token_reservations.lunch_token_user_id
        and lunch_token_users.user_id = auth.uid()
    )
  );

-- No update or delete policies created: reservations are strictly permanent and irreversible once submitted.

