# Modèles d'email Supabase

À coller dans Supabase : **Authentication > Emails > Templates**.

| Modèle Supabase | Fichier | Objet suggéré |
|---|---|---|
| Magic link | `magic-link.html` | Votre code de connexion Keyroom |
| Confirm sign up | `confirm-signup.html` | Votre code de connexion Keyroom |
| Invite user | `invite.html` | Votre invitation Keyroom |

Pourquoi deux modèles avec le code : un utilisateur invité n'a pas encore confirmé son email,
Supabase utilise alors « Confirm sign up » pour son premier code, puis « Magic link » ensuite.
Les deux affichent `{{ .Token }}` (le code), pas un lien.

Vérifiez aussi **Authentication > Sign In / Providers > Email > Email OTP Expiration**
(durée de validité du code) et branchez un SMTP personnalisé (Resend ou Brevo) :
l'envoi par défaut de Supabase est limité à quelques emails par heure.
