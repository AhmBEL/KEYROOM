-- Bucket privé « dossiers » : 20 Mo, PDF, DOCX, JPG, PNG.
-- Aucune policy sur storage.objects pour les utilisateurs : tout accès aux fichiers
-- passe par le serveur (URL signées de dépôt et de téléchargement, clé service_role),
-- après contrôle des droits via la table documents.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'dossiers', 'dossiers', false, 20971520,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png'
  ]
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
