-- Formulaires publics (lien partagé, sans connexion).
-- Les réponses sont écrites uniquement par le serveur (clé service_role) ; seul l'admin les lit.
create table public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  form text not null check (form in ('mandat', 'investisseurs')),
  lang text not null check (lang in ('fr', 'en')),
  answers jsonb not null check (octet_length(answers::text) <= 50000),
  ip_hash text,
  created_at timestamptz not null default now()
);

create index on public.form_submissions (created_at desc);
create index on public.form_submissions (ip_hash, created_at desc);

alter table public.form_submissions enable row level security;

revoke all on public.form_submissions from anon, authenticated;
grant select on public.form_submissions to authenticated;

create policy form_submissions_select on public.form_submissions for select to authenticated
  using (public.is_admin());
