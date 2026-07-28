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
