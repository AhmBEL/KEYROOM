-- Keyroom : schéma, fonctions et règles d'accès (RLS).
-- À exécuter dans le SQL Editor de Supabase, ou via la CLI Supabase.
-- Les écritures sensibles (création de dossier, invitations, journal) passent par
-- la clé service_role, uniquement depuis des routes serveur.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  prenom text not null,
  nom text not null,
  role text not null check (role in ('admin', 'partie_mandat', 'partie_investisseurs')),
  created_at timestamptz not null default now()
);

create table public.deals (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique check (reference ~ '^KR-[0-9]{4}-[0-9]{4}$'),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.deal_members (
  deal_id uuid not null references public.deals (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('partie_mandat', 'partie_investisseurs')),
  primary key (deal_id, user_id),
  unique (deal_id, role)
);

create table public.deal_steps (
  deal_id uuid not null references public.deals (id) on delete cascade,
  position int not null check (position between 1 and 9),
  label text not null,
  status text not null default 'upcoming' check (status in ('done', 'current', 'upcoming')),
  updated_at timestamptz not null default now(),
  primary key (deal_id, position)
);

create table public.deal_settings (
  deal_id uuid primary key references public.deals (id) on delete cascade,
  droit_applicable text not null default 'maurice_arbitrage'
    check (droit_applicable in ('maurice_arbitrage', 'anglais')),
  duree_protection_mois int not null default 18 check (duree_protection_mois between 12 and 24),
  duree_confidentialite_ans int not null default 3 check (duree_confidentialite_ans between 2 and 5),
  repartition jsonb not null default '{"mandat": 40, "investisseurs": 40, "ahmed": 20}'
    check (
      (repartition ->> 'mandat')::numeric
      + (repartition ->> 'investisseurs')::numeric
      + (repartition ->> 'ahmed')::numeric = 100
    ),
  updated_at timestamptz not null default now()
);

create table public.questionnaire_responses (
  deal_id uuid not null references public.deals (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  answers jsonb not null default '{}'::jsonb check (octet_length(answers::text) <= 50000),
  submitted_at timestamptz,
  primary key (deal_id, user_id)
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals (id) on delete cascade,
  uploaded_by uuid not null references public.profiles (id),
  category text not null
    check (category in ('accord_genere', 'accord_signe', 'teaser', 'criteres', 'autre')),
  storage_path text not null,
  filename text not null check (char_length(filename) between 1 and 255),
  mime_type text not null check (mime_type in (
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png'
  )),
  size_bytes bigint not null check (size_bytes between 1 and 20971520),
  shared_with_other_party boolean not null default false,
  created_at timestamptz not null default now(),
  -- Un dépôt ne peut pointer que vers un fichier de son propre dossier et de sa catégorie.
  constraint documents_path_matches check (
    storage_path like deal_id::text || '/' || category || '/%'
  )
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  deal_id uuid references public.deals (id) on delete set null,
  user_id uuid references public.profiles (id) on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index on public.deal_members (user_id);
create index on public.documents (deal_id);
create index on public.audit_log (deal_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Fonctions d'aide (security definer : lisent les tables sans récursion RLS)
-- ---------------------------------------------------------------------------

create function public.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'
  );
$$;

create function public.is_deal_member(p_deal uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.deal_members
    where deal_id = p_deal and user_id = (select auth.uid())
  );
$$;

create function public.deal_party_role(p_deal uuid) returns text
language sql stable security definer set search_path = ''
as $$
  select role from public.deal_members
  where deal_id = p_deal and user_id = (select auth.uid());
$$;

-- Le rôle d'un membre doit être celui de son profil.
create function public.check_member_role() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.profiles where id = new.user_id and role = new.role
  ) then
    raise exception 'Le rôle du membre ne correspond pas à son profil';
  end if;
  return new;
end;
$$;

create trigger deal_members_role_matches_profile
  before insert or update on public.deal_members
  for each row execute function public.check_member_role();

-- Journal automatique des changements d'étape.
create function public.log_step_change() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    new.updated_at := now();
    insert into public.audit_log (deal_id, user_id, action, details)
    values (
      new.deal_id,
      (select auth.uid()),
      'etape_modifiee',
      jsonb_build_object('position', new.position, 'de', old.status, 'vers', new.status)
    );
  end if;
  return new;
end;
$$;

create trigger deal_steps_audit
  before update on public.deal_steps
  for each row execute function public.log_step_change();

-- Création d'un dossier : référence aléatoire unique générée côté base,
-- 9 étapes (la première en cours) et paramètres de l'accord par défaut.
-- Appelable uniquement avec la clé service_role.
create function public.create_deal(p_created_by uuid) returns public.deals
language plpgsql security definer set search_path = ''
as $$
declare
  d public.deals;
  ref text;
  tries int := 0;
  labels text[] := array[
    'Accord de commission et de non-contournement',
    'Teaser anonyme et critères anonymes',
    'Sélection de 2 à 3 hôtels',
    'NDA signé par les deux côtés',
    'Nom de l''hôtel et chiffres clés',
    'Preuve de fonds et LOI',
    'MOU avec exclusivité',
    'Documents sensibles, par paliers',
    'Contrat de vente'
  ];
  i int;
begin
  if not exists (select 1 from public.profiles where id = p_created_by and role = 'admin') then
    raise exception 'Seul un administrateur peut créer un dossier';
  end if;

  loop
    ref := 'KR-' || to_char(now(), 'YYYY') || '-' || lpad((floor(random() * 10000))::int::text, 4, '0');
    begin
      insert into public.deals (reference, created_by) values (ref, p_created_by) returning * into d;
      exit;
    exception when unique_violation then
      tries := tries + 1;
      if tries > 20 then raise; end if;
    end;
  end loop;

  for i in 1..9 loop
    insert into public.deal_steps (deal_id, position, label, status)
    values (d.id, i, labels[i], case when i = 1 then 'current' else 'upcoming' end);
  end loop;

  insert into public.deal_settings (deal_id) values (d.id);
  insert into public.audit_log (deal_id, user_id, action, details)
  values (d.id, p_created_by, 'dossier_cree', jsonb_build_object('reference', d.reference));

  return d;
end;
$$;

-- ---------------------------------------------------------------------------
-- Droits : on retire tout, puis on accorde le minimum
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_deal_member(uuid) to authenticated;
grant execute on function public.deal_party_role(uuid) to authenticated;
grant execute on function public.create_deal(uuid) to service_role;

grant select on public.profiles, public.deals, public.deal_members, public.deal_steps,
  public.deal_settings, public.audit_log to authenticated;
grant update (status) on public.deal_steps to authenticated;
grant update (droit_applicable, duree_protection_mois, duree_confidentialite_ans, repartition)
  on public.deal_settings to authenticated;
grant select, insert on public.questionnaire_responses to authenticated;
grant update (answers, submitted_at) on public.questionnaire_responses to authenticated;
grant select, insert on public.documents to authenticated;
grant update (shared_with_other_party) on public.documents to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security : activée partout
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.deals enable row level security;
alter table public.deal_members enable row level security;
alter table public.deal_steps enable row level security;
alter table public.deal_settings enable row level security;
alter table public.questionnaire_responses enable row level security;
alter table public.documents enable row level security;
alter table public.audit_log enable row level security;

-- profiles : chacun voit le sien ; l'admin voit tout. Aucune écriture côté client.
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());

-- deals : visibles par leurs membres et par l'admin.
create policy deals_select on public.deals for select to authenticated
  using (public.is_deal_member(id) or public.is_admin());

-- deal_members : chacun voit sa propre ligne ; l'admin voit tout.
create policy deal_members_select on public.deal_members for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

-- deal_steps : lisibles par les membres ; seul l'admin change le statut.
create policy deal_steps_select on public.deal_steps for select to authenticated
  using (public.is_deal_member(deal_id) or public.is_admin());
create policy deal_steps_update on public.deal_steps for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- deal_settings : admin uniquement (paramètres de l'accord fixés par Ahmed).
create policy deal_settings_select on public.deal_settings for select to authenticated
  using (public.is_admin());
create policy deal_settings_update on public.deal_settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- questionnaire_responses : chacun ses réponses ; l'admin lit tout.
-- Une réponse validée (submitted_at renseigné) ne se modifie plus.
create policy responses_select on public.questionnaire_responses for select to authenticated
  using ((user_id = (select auth.uid()) and public.is_deal_member(deal_id)) or public.is_admin());
create policy responses_insert on public.questionnaire_responses for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_deal_member(deal_id));
create policy responses_update on public.questionnaire_responses for update to authenticated
  using (user_id = (select auth.uid()) and submitted_at is null)
  with check (user_id = (select auth.uid()) and public.is_deal_member(deal_id));

-- documents : voir ses propres dépôts, les accords, et ce que l'admin a partagé.
create policy documents_select on public.documents for select to authenticated
  using (
    public.is_admin()
    or (
      public.is_deal_member(deal_id)
      and (
        uploaded_by = (select auth.uid())
        or category in ('accord_genere', 'accord_signe')
        or shared_with_other_party
      )
    )
  );
-- Une partie dépose uniquement dans son dossier, sa catégorie, non partagé.
create policy documents_insert_party on public.documents for insert to authenticated
  with check (
    uploaded_by = (select auth.uid())
    and public.is_deal_member(deal_id)
    and shared_with_other_party = false
    and (
      category = 'autre'
      or (category = 'teaser' and public.deal_party_role(deal_id) = 'partie_mandat')
      or (category = 'criteres' and public.deal_party_role(deal_id) = 'partie_investisseurs')
    )
  );
create policy documents_insert_admin on public.documents for insert to authenticated
  with check (public.is_admin() and uploaded_by = (select auth.uid()));
-- Seul l'admin peut modifier shared_with_other_party.
create policy documents_update on public.documents for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- audit_log : lecture admin uniquement ; écriture par le serveur (service_role) et les triggers.
create policy audit_log_select on public.audit_log for select to authenticated
  using (public.is_admin());
