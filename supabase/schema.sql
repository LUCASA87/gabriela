create table if not exists public.products (
  id text primary key,
  name text not null,
  type text not null,
  sale_price numeric not null default 0,
  unit_cost numeric not null default 0
);

create table if not exists public.recipes (
  id text primary key,
  name text not null,
  batch_size numeric not null default 10,
  sale_price numeric not null default 0
);

create table if not exists public.recipe_ingredients (
  id text primary key,
  recipe_id text not null references public.recipes(id) on delete cascade,
  ingredient_key text not null,
  name text not null,
  unit text not null,
  dough numeric not null default 0,
  farofa numeric not null default 0
);

create table if not exists public.sales (
  id text primary key,
  date date not null,
  product_id text not null,
  quantity numeric not null,
  unit_price numeric not null,
  note text not null default ''
);

create table if not exists public.expenses (
  id text primary key,
  date date not null,
  category text not null,
  description text not null,
  amount numeric not null
);

create table if not exists public.purchases (
  id text primary key,
  date date not null,
  recipe_id text not null,
  ingredient_id text not null,
  quantity numeric not null,
  unit text not null,
  amount numeric not null
);

create table if not exists public.settings (
  id text primary key default 'app',
  active_recipe_id text
);

alter table public.recipe_ingredients
  add column if not exists ingredient_key text not null default '';

alter table public.products enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.sales enable row level security;
alter table public.expenses enable row level security;
alter table public.purchases enable row level security;
alter table public.settings enable row level security;

drop policy if exists anon_all_products on public.products;
drop policy if exists anon_all_recipes on public.recipes;
drop policy if exists anon_all_recipe_ingredients on public.recipe_ingredients;
drop policy if exists anon_all_sales on public.sales;
drop policy if exists anon_all_expenses on public.expenses;
drop policy if exists anon_all_purchases on public.purchases;
drop policy if exists anon_all_settings on public.settings;

create policy anon_all_products on public.products for all to anon, authenticated using (true) with check (true);
create policy anon_all_recipes on public.recipes for all to anon, authenticated using (true) with check (true);
create policy anon_all_recipe_ingredients on public.recipe_ingredients for all to anon, authenticated using (true) with check (true);
create policy anon_all_sales on public.sales for all to anon, authenticated using (true) with check (true);
create policy anon_all_expenses on public.expenses for all to anon, authenticated using (true) with check (true);
create policy anon_all_purchases on public.purchases for all to anon, authenticated using (true) with check (true);
create policy anon_all_settings on public.settings for all to anon, authenticated using (true) with check (true);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.products, public.recipes, public.recipe_ingredients, public.sales, public.expenses, public.purchases, public.settings to anon, authenticated;
