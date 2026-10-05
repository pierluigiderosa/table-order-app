create type public.app_role as enum ('admin','user');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- first registered user becomes admin
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  price numeric(8,2) not null default 0,
  kind text not null default 'beverage' check (kind in ('food','beverage')),
  available boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "public read products" on public.products for select to anon, authenticated using (true);
create policy "admin write products" on public.products for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  table_number int not null,
  customer_name text not null default '',
  note text not null default '',
  total numeric(10,2) not null default 0,
  status text not null default 'new' check (status in ('new','preparing','served')),
  created_at timestamptz not null default now()
);
grant select, update, delete on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "admin read orders" on public.orders for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admin update orders" on public.orders for update to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admin delete orders" on public.orders for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid,
  name text not null,
  kind text not null,
  unit_price numeric(8,2) not null,
  quantity int not null check (quantity > 0)
);
grant select on public.order_items to authenticated;
grant all on public.order_items to service_role;
alter table public.order_items enable row level security;
create policy "admin read items" on public.order_items for select to authenticated using (public.has_role(auth.uid(),'admin'));

alter publication supabase_realtime add table public.orders;

insert into public.products (name, description, price, kind, sort_order) values
('Birra media', 'Bionda alla spina 0,4L', 5.00, 'beverage', 1),
('Spritz', 'Aperol, prosecco, soda', 6.00, 'beverage', 2),
('Coca-Cola', 'Lattina 33cl', 3.00, 'beverage', 3),
('Acqua', 'Naturale o frizzante 50cl', 1.50, 'beverage', 4),
('Panino porchetta', 'Pane casereccio e porchetta', 7.00, 'food', 1),
('Tagliere misto', 'Salumi e formaggi', 12.00, 'food', 2),
('Patatine fritte', 'Porzione con salse', 4.00, 'food', 3);