-- AKWANTUO player profiles, secure economy, retail checkout and premium ownership.
-- Currency is stored as integer pesewas. All purchase mutations are atomic and authenticated.

create table if not exists public.player_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Citizen',
  gender text not null default 'male',
  look jsonb not null default '{}'::jsonb,
  game_save jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  age integer
);

create table if not exists public.player_wallets (
  player_id uuid primary key references auth.users(id) on delete cascade,
  balance_pesewas bigint not null default 50000 check (balance_pesewas >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.shop_products (
  product_id text primary key,
  name text not null,
  category text not null,
  price_pesewas bigint not null check (price_pesewas > 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.player_inventory (
  player_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null references public.shop_products(product_id),
  quantity integer not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now(),
  primary key (player_id, product_id)
);

create table if not exists public.game_transactions (
  id bigint generated always as identity primary key,
  player_id uuid not null references auth.users(id) on delete cascade,
  transaction_type text not null check (transaction_type in ('starter_grant','shop_purchase','asset_purchase','job_earning')),
  amount_pesewas bigint not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.game_assets (
  asset_id text primary key,
  name text not null,
  asset_type text not null check (asset_type in ('private_island','boat','yacht','jet_ski')),
  price_pesewas bigint not null check (price_pesewas > 0),
  active boolean not null default true
);

create table if not exists public.player_owned_assets (
  id bigint generated always as identity primary key,
  player_id uuid not null references auth.users(id) on delete cascade,
  asset_id text not null references public.game_assets(asset_id),
  purchased_at timestamptz not null default now(),
  transaction_id bigint references public.game_transactions(id),
  unique (player_id, asset_id)
);

insert into public.shop_products(product_id,name,category,price_pesewas,stock_quantity) values
('cola-classic','KolaPop Classic','soft_drink',1800,36),
('orange-fizz','SunBurst Orange','soft_drink',1800,30),
('lemon-lime','LimeLift','soft_drink',1800,24),
('berry-soda','BerryPop','soft_drink',2000,18),
('ginger-soda','GingerKick','soft_drink',1800,18),
('pure-water','ClearSpring Water','water',500,72),
('sparkling-water','AquaSpark','water',1500,18),
('energy-voltage','VoltRush Energy','energy_drink',3000,20),
('malt-rich','MaltMellow','malt',2500,24),
('iced-tea','TeaWave','soft_drink',2200,16),
('plantain-chips','Crunchy Plantain Bites','snack',1200,28),
('peanut-snack','Nutty Gold','snack',1000,24),
('spicy-crisps','PepperTwist Crisps','snack',1500,24),
('salt-crackers','SnapSalt Crackers','snack',900,30),
('choco-bar','ChocoDash Bar','confectionery',1200,30),
('mint-sweets','CoolMint Drops','confectionery',700,40),
('vanilla-biscuits','Golden Crumb Biscuits','snack',1400,22),
('tissue-pack','SoftFold Tissues','household',1800,16),
('soap-bar','FreshPalm Soap','household',1600,18)
on conflict (product_id) do update
set name=excluded.name, category=excluded.category, price_pesewas=excluded.price_pesewas;

insert into public.game_assets(asset_id,name,asset_type,price_pesewas) values
('akwaaba-cay','Akwaaba Cay Private Island','private_island',25000000000),
('island-speedboat','Coastline 28 Speedboat','boat',1800000000),
('island-yacht','Ocean Crown Yacht','yacht',8500000000),
('island-fishing-boat','BlueFin Cruiser','boat',420000000),
('island-jet-ski','WaveRider Jet Ski','jet_ski',95000000),
('island-jet-ski-pro','WaveRider X Jet Ski','jet_ski',145000000)
on conflict (asset_id) do update
set name=excluded.name, asset_type=excluded.asset_type,
    price_pesewas=excluded.price_pesewas, active=true;

create index if not exists game_transactions_player_id_idx on public.game_transactions(player_id);
create index if not exists player_inventory_product_id_idx on public.player_inventory(product_id);
create index if not exists player_owned_assets_asset_id_idx on public.player_owned_assets(asset_id);
create index if not exists player_owned_assets_transaction_id_idx on public.player_owned_assets(transaction_id);

alter table public.player_profiles enable row level security;
alter table public.player_wallets enable row level security;
alter table public.shop_products enable row level security;
alter table public.player_inventory enable row level security;
alter table public.game_transactions enable row level security;
alter table public.game_assets enable row level security;
alter table public.player_owned_assets enable row level security;

drop policy if exists "Players can create their own profile" on public.player_profiles;
create policy "Players can create their own profile" on public.player_profiles
for insert to authenticated with check ((select auth.uid()) = id);
drop policy if exists "Players can read their own profile" on public.player_profiles;
create policy "Players can read their own profile" on public.player_profiles
for select to authenticated using ((select auth.uid()) = id);
drop policy if exists "Players can update their own profile" on public.player_profiles;
create policy "Players can update their own profile" on public.player_profiles
for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists "Players can view own wallet" on public.player_wallets;
create policy "Players can view own wallet" on public.player_wallets
for select to authenticated using (player_id = (select auth.uid()));
drop policy if exists "Players can view shop catalogue" on public.shop_products;
create policy "Players can view shop catalogue" on public.shop_products
for select to authenticated using (true);
drop policy if exists "Players can view own inventory" on public.player_inventory;
create policy "Players can view own inventory" on public.player_inventory
for select to authenticated using (player_id = (select auth.uid()));
drop policy if exists "Players can view own transactions" on public.game_transactions;
create policy "Players can view own transactions" on public.game_transactions
for select to authenticated using (player_id = (select auth.uid()));
drop policy if exists "Players can view active assets" on public.game_assets;
create policy "Players can view active assets" on public.game_assets
for select to authenticated using (active = true);
drop policy if exists "Players can view own assets" on public.player_owned_assets;
create policy "Players can view own assets" on public.player_owned_assets
for select to authenticated using (player_id = (select auth.uid()));

revoke all on public.player_profiles, public.player_wallets, public.shop_products,
  public.player_inventory, public.game_transactions, public.game_assets,
  public.player_owned_assets from anon, authenticated;
grant select on public.player_profiles, public.player_wallets, public.shop_products,
  public.player_inventory, public.game_transactions, public.game_assets,
  public.player_owned_assets to authenticated;
grant insert, update on public.player_profiles to authenticated;

create or replace function public.akwantuo_create_player_economy()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.player_wallets(player_id, balance_pesewas)
  values (new.id, 50000)
  on conflict (player_id) do nothing;

  if not exists (
    select 1 from public.game_transactions
    where player_id = new.id and transaction_type = 'starter_grant'
  ) then
    insert into public.game_transactions(player_id, transaction_type, amount_pesewas, details)
    values (new.id, 'starter_grant', 50000,
      jsonb_build_object('description','AKWANTUO starter cash','currency','GHS'));
  end if;
  return new;
end;
$$;

drop trigger if exists akwantuo_auth_user_economy on auth.users;
create trigger akwantuo_auth_user_economy
after insert on auth.users
for each row execute function public.akwantuo_create_player_economy();

revoke all on function public.akwantuo_create_player_economy() from public, anon, authenticated;

insert into public.player_wallets(player_id,balance_pesewas)
select id,50000 from auth.users
on conflict (player_id) do nothing;

insert into public.game_transactions(player_id,transaction_type,amount_pesewas,details)
select u.id,'starter_grant',50000,
  jsonb_build_object('description','AKWANTUO starter cash','currency','GHS')
from auth.users u
where not exists (
  select 1 from public.game_transactions t
  where t.player_id=u.id and t.transaction_type='starter_grant'
);

create or replace function public.akwantuo_purchase_retail(p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_player uuid := auth.uid();
  v_item jsonb;
  v_product_id text;
  v_quantity integer;
  v_product public.shop_products%rowtype;
  v_total bigint := 0;
  v_balance bigint;
  v_lines jsonb := '[]'::jsonb;
  v_tx bigint;
begin
  if v_player is null then raise exception 'Sign in required'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 12 then
    raise exception 'Basket must contain between 1 and 12 product lines';
  end if;
  for v_item in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_item) <> 'object' then raise exception 'Invalid basket line'; end if;
    v_product_id := v_item->>'product_id';
    v_quantity := (v_item->>'quantity')::integer;
    if v_product_id is null or v_quantity is null or v_quantity < 1 or v_quantity > 20 then raise exception 'Invalid product quantity'; end if;
    select * into v_product from public.shop_products where product_id=v_product_id for update;
    if not found then raise exception 'Product is not available'; end if;
    if v_product.stock_quantity < v_quantity then raise exception 'Not enough stock for %', v_product.name; end if;
    v_total := v_total + (v_product.price_pesewas * v_quantity);
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'product_id',v_product_id,'name',v_product.name,
      'quantity',v_quantity,'unit_price_pesewas',v_product.price_pesewas));
  end loop;

  select balance_pesewas into v_balance
  from public.player_wallets where player_id=v_player for update;
  if not found then raise exception 'Player wallet is not ready'; end if;
  if v_balance < v_total then raise exception 'Insufficient funds'; end if;

  for v_item in select value from jsonb_array_elements(v_lines) loop
    v_product_id := v_item->>'product_id';
    v_quantity := (v_item->>'quantity')::integer;
    update public.shop_products
      set stock_quantity=stock_quantity-v_quantity, updated_at=now()
      where product_id=v_product_id;
    insert into public.player_inventory(player_id,product_id,quantity)
    values (v_player,v_product_id,v_quantity)
    on conflict (player_id,product_id) do update
      set quantity=public.player_inventory.quantity+excluded.quantity, updated_at=now();
  end loop;

  update public.player_wallets
    set balance_pesewas=balance_pesewas-v_total,updated_at=now()
    where player_id=v_player;
  insert into public.game_transactions(player_id,transaction_type,amount_pesewas,details)
  values (v_player,'shop_purchase',-v_total,
    jsonb_build_object('items',v_lines,'store','akwaaba-express'))
  returning id into v_tx;

  return jsonb_build_object('transaction_id',v_tx,'total_pesewas',v_total,
    'balance_pesewas',v_balance-v_total,'items',v_lines);
end;
$$;

create or replace function public.akwantuo_purchase_asset(p_asset_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_player uuid := auth.uid();
  v_asset public.game_assets%rowtype;
  v_balance bigint;
  v_tx bigint;
  v_owned bigint;
begin
  if v_player is null then raise exception 'Sign in required'; end if;
  select * into v_asset from public.game_assets
    where asset_id=p_asset_id and active=true for update;
  if not found then raise exception 'Asset is not available'; end if;
  if exists(select 1 from public.player_owned_assets
    where player_id=v_player and asset_id=p_asset_id) then
    raise exception 'You already own this asset';
  end if;
  select balance_pesewas into v_balance from public.player_wallets
    where player_id=v_player for update;
  if not found then raise exception 'Player wallet is not ready'; end if;
  if v_balance < v_asset.price_pesewas then raise exception 'Insufficient funds'; end if;

  update public.player_wallets
    set balance_pesewas=balance_pesewas-v_asset.price_pesewas,updated_at=now()
    where player_id=v_player;
  insert into public.game_transactions(player_id,transaction_type,amount_pesewas,details)
  values (v_player,'asset_purchase',-v_asset.price_pesewas,
    jsonb_build_object('asset_id',p_asset_id,'asset_name',v_asset.name))
  returning id into v_tx;
  insert into public.player_owned_assets(player_id,asset_id,transaction_id)
  values(v_player,p_asset_id,v_tx) returning id into v_owned;

  return jsonb_build_object('owned_asset_id',v_owned,'asset_id',p_asset_id,
    'name',v_asset.name,'price_pesewas',v_asset.price_pesewas,
    'balance_pesewas',v_balance-v_asset.price_pesewas);
end;
$$;

create or replace function public.akwantuo_get_economy_state()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_player uuid := auth.uid();
begin
  if v_player is null then raise exception 'Sign in required'; end if;
  return jsonb_build_object(
    'wallet',(select jsonb_build_object('balance_pesewas',balance_pesewas)
      from public.player_wallets where player_id=v_player),
    'inventory',(select coalesce(jsonb_agg(jsonb_build_object(
      'product_id',i.product_id,'name',p.name,'quantity',i.quantity)), '[]'::jsonb)
      from public.player_inventory i join public.shop_products p using(product_id)
      where i.player_id=v_player),
    'owned_assets',(select coalesce(jsonb_agg(jsonb_build_object(
      'asset_id',o.asset_id,'name',a.name,'asset_type',a.asset_type,'purchased_at',o.purchased_at)), '[]'::jsonb)
      from public.player_owned_assets o join public.game_assets a using(asset_id)
      where o.player_id=v_player)
  );
end;
$$;

revoke all on function public.akwantuo_purchase_retail(jsonb),
  public.akwantuo_purchase_asset(text), public.akwantuo_get_economy_state()
  from public, anon;
grant execute on function public.akwantuo_purchase_retail(jsonb),
  public.akwantuo_purchase_asset(text), public.akwantuo_get_economy_state()
  to authenticated;
