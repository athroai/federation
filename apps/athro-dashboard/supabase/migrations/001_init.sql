-- Dashboard App: Initial Schema
-- All fields are snake_case

-- 1. Extended user profile
create table profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    full_name text,
    preferred_name text,
    school text,
    year integer,
    avatar_url text,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    constraint fk_user unique(id)
);

-- 2. Subject preferences
create table subject_preferences (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade,
    subject text not null,
    confidence_level integer,
    is_priority boolean default false,
    average_grade text,
    exam_board text,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    unique(user_id, subject)
);

-- 3. Row Level Security (RLS) policies
alter table profiles enable row level security;
alter table subject_preferences enable row level security;

-- Profiles policies
create policy "Users can access their own profile" on profiles
    for all using (auth.uid() = id);

-- Subject preferences policies
create policy "Users can view their own subject preferences" on subject_preferences
    for select using (auth.uid() = user_id);

create policy "Users can insert their own subject preferences" on subject_preferences
    for insert with check (auth.uid() = user_id);

create policy "Users can update their own subject preferences" on subject_preferences
    for update using (auth.uid() = user_id);

create policy "Users can delete their own subject preferences" on subject_preferences
    for delete using (auth.uid() = user_id);

-- Create updated_at trigger function
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language 'plpgsql';

-- Create triggers for updated_at
create trigger update_profiles_updated_at
    before update on profiles
    for each row
    execute function update_updated_at_column();

create trigger update_subject_preferences_updated_at
    before update on subject_preferences
    for each row
    execute function update_updated_at_column(); 