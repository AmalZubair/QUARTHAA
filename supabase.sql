create extension if not exists "uuid-ossp";

create table if not exists public.categories (
    id uuid primary key default uuid_generate_v4(),
    name text not null unique,
    description text,
    icon text,
    created_at timestamptz default now()
);

create table if not exists public.locations (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    description text,
    latitude double precision,
    longitude double precision,
    created_at timestamptz default now()
);

create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    full_name text,
    phone text,
    avatar_url text,
    reputation_score integer default 0,
    items_found integer default 0,
    items_returned integer default 0,
    successful_claims integer default 0,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create table if not exists public.items (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    category_id uuid references public.categories(id) on delete set null,
    location_id uuid references public.locations(id) on delete set null,
    type text not null check (type in ('LOST', 'FOUND')),
    title text not null,
    description text,
    event_date date,
    event_time time,
    reward_amount numeric(10,2) default 0 check (reward_amount >= 0),
    status text not null default 'ACTIVE'
        check (status in ('ACTIVE', 'MATCHED', 'RETURNED', 'CLOSED')),
    is_anonymous boolean default false,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    closed_at timestamptz
);

create table if not exists public.item_images (
    id uuid primary key default uuid_generate_v4(),
    item_id uuid not null references public.items(id) on delete cascade,
    image_url text not null,
    is_primary boolean default false,
    created_at timestamptz default now()
);

create table if not exists public.claims (
    id uuid primary key default uuid_generate_v4(),
    item_id uuid not null references public.items(id) on delete cascade,
    claimant_id uuid not null references public.profiles(id) on delete cascade,
    message text,
    status text not null default 'PENDING'
        check (status in ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED')),
    verification_status text default 'NOT_VERIFIED'
        check (verification_status in ('NOT_VERIFIED', 'PENDING', 'VERIFIED', 'FAILED')),
    created_at timestamptz default now(),
    verified_at timestamptz,
    resolved_at timestamptz
);

create table if not exists public.rewards (
    id uuid primary key default uuid_generate_v4(),
    item_id uuid references public.items(id) on delete cascade,
    claim_id uuid references public.claims(id) on delete cascade,
    offered_by uuid references public.profiles(id) on delete set null,
    receiver_id uuid references public.profiles(id) on delete set null,
    amount numeric(10,2) not null default 10,
    currency text default 'INR',
    status text not null default 'OFFERED'
        check (status in ('OFFERED', 'PENDING', 'RELEASED', 'CANCELLED', 'REFUNDED')),
    created_at timestamptz default now(),
    released_at timestamptz
);

create table if not exists public.reputation_events (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    event_type text not null,
    points integer not null,
    reason text,
    reference_id uuid,
    created_at timestamptz default now()
);

create table if not exists public.ai_matches (
    id uuid primary key default uuid_generate_v4(),
    lost_item_id uuid not null references public.items(id) on delete cascade,
    found_item_id uuid not null references public.items(id) on delete cascade,
    overall_score numeric(5,4) check (overall_score between 0 and 1),
    text_score numeric(5,4) check (text_score between 0 and 1),
    location_score numeric(5,4) check (location_score between 0 and 1),
    time_score numeric(5,4) check (time_score between 0 and 1),
    image_score numeric(5,4) check (image_score between 0 and 1),
    category_score numeric(5,4) check (category_score between 0 and 1),
    explanation text,
    model_version text,
    status text default 'POTENTIAL' check (status in ('POTENTIAL', 'CONFIRMED', 'REJECTED')),
    created_at timestamptz default now(),
    unique (lost_item_id, found_item_id),
    check (lost_item_id <> found_item_id)
);

create table if not exists public.notifications (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    type text not null,
    title text not null,
    message text,
    reference_id uuid,
    is_read boolean default false,
    created_at timestamptz default now()
);

create index if not exists items_user_id_idx on public.items(user_id);
create index if not exists items_category_idx on public.items(category_id);
create index if not exists items_location_idx on public.items(location_id);
create index if not exists items_type_status_idx on public.items(type, status);
create index if not exists items_created_at_idx on public.items(created_at desc);
create index if not exists claims_item_idx on public.claims(item_id);
create index if not exists claims_claimant_idx on public.claims(claimant_id);
create index if not exists ai_matches_lost_idx on public.ai_matches(lost_item_id);
create index if not exists ai_matches_found_idx on public.ai_matches(found_item_id);
create index if not exists notifications_user_idx on public.notifications(user_id, is_read);

insert into public.categories (name, description, icon)
values
    ('Electronics', 'Phones, laptops, earbuds and electronic devices', '📱'),
    ('Documents', 'ID cards, licenses and other documents', '🪪'),
    ('Wallets', 'Wallets and purses', '👛'),
    ('Keys', 'House, vehicle and other keys', '🔑'),
    ('Bags', 'Backpacks, handbags and luggage', '🎒'),
    ('Clothing', 'Jackets, caps, shoes and clothing', '👕'),
    ('Books', 'Books, notebooks and study materials', '📚'),
    ('Accessories', 'Watches, glasses, jewellery and accessories', '⌚'),
    ('Other', 'Other lost or found items', '📦')
on conflict (name) do nothing;

insert into public.locations (name, description)
select seed.name, seed.description
from (values
    ('Main Gate', 'Main entrance'),
    ('Library', 'College library'),
    ('Canteen', 'College canteen'),
    ('Block A', 'Academic Block A'),
    ('Block B', 'Academic Block B'),
    ('Auditorium', 'Main auditorium'),
    ('Ground', 'College ground'),
    ('Parking', 'Parking area')
) as seed(name, description)
where not exists (
    select 1 from public.locations existing where existing.name = seed.name
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, full_name)
    values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.categories enable row level security;
alter table public.locations enable row level security;
alter table public.profiles enable row level security;
alter table public.items enable row level security;
alter table public.item_images enable row level security;
alter table public.claims enable row level security;
alter table public.rewards enable row level security;
alter table public.reputation_events enable row level security;
alter table public.ai_matches enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "Categories are readable" on public.categories;
create policy "Categories are readable" on public.categories
for select to anon, authenticated using (true);

drop policy if exists "Locations are readable" on public.locations;
create policy "Locations are readable" on public.locations
for select to anon, authenticated using (true);

drop policy if exists "Profiles are readable by owner" on public.profiles;
create policy "Profiles are readable by owner" on public.profiles
for select to authenticated using (id = (select auth.uid()));

drop policy if exists "Profiles are editable by owner" on public.profiles;
create policy "Profiles are editable by owner" on public.profiles
for update to authenticated using (id = (select auth.uid()))
with check (id = (select auth.uid()));

drop policy if exists "Items are publicly readable" on public.items;
create policy "Items are publicly readable" on public.items
for select to anon, authenticated using (true);

drop policy if exists "Users can post their own items" on public.items;
create policy "Users can post their own items" on public.items
for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists "Users can update their own items" on public.items;
create policy "Users can update their own items" on public.items
for update to authenticated using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "Item images are publicly readable" on public.item_images;
create policy "Item images are publicly readable" on public.item_images
for select to anon, authenticated using (true);

drop policy if exists "Owners can add item images" on public.item_images;
create policy "Owners can add item images" on public.item_images
for insert to authenticated with check (
    exists (
        select 1 from public.items
        where items.id = item_images.item_id
          and items.user_id = (select auth.uid())
    )
);

drop policy if exists "Claim participants can view claims" on public.claims;
create policy "Claim participants can view claims" on public.claims
for select to authenticated using (
    claimant_id = (select auth.uid())
    or exists (
        select 1 from public.items
        where items.id = claims.item_id
          and items.user_id = (select auth.uid())
    )
);

drop policy if exists "Users can submit claims" on public.claims;
create policy "Users can submit claims" on public.claims
for insert to authenticated with check (
    claimant_id = (select auth.uid())
    and exists (
        select 1 from public.items
        where items.id = claims.item_id
          and items.type = 'FOUND'
          and items.user_id <> (select auth.uid())
    )
);

drop policy if exists "Claim owners can review claims" on public.claims;
create policy "Claim owners can review claims" on public.claims
for update to authenticated using (
    exists (
        select 1 from public.items
        where items.id = claims.item_id
          and items.user_id = (select auth.uid())
    )
) with check (
    exists (
        select 1 from public.items
        where items.id = claims.item_id
          and items.user_id = (select auth.uid())
    )
);

drop policy if exists "Users can view their notifications" on public.notifications;
create policy "Users can view their notifications" on public.notifications
for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Users can update their notifications" on public.notifications;
create policy "Users can update their notifications" on public.notifications
for update to authenticated using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "Users can view their reputation events" on public.reputation_events;
create policy "Users can view their reputation events" on public.reputation_events
for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Reward participants can view rewards" on public.rewards;
create policy "Reward participants can view rewards" on public.rewards
for select to authenticated using (
    offered_by = (select auth.uid()) or receiver_id = (select auth.uid())
);

drop policy if exists "Match participants can view matches" on public.ai_matches;
create policy "Match participants can view matches" on public.ai_matches
for select to authenticated using (
    exists (
        select 1 from public.items
        where items.id in (ai_matches.lost_item_id, ai_matches.found_item_id)
          and items.user_id = (select auth.uid())
    )
);
