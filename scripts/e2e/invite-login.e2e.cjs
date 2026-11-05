const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const base = 'http://localhost:3111';
(async () => {
  const b = await chromium.launch();
  const adminCtx = await b.newContext({ viewport: { width: 390, height: 900 }, locale: 'fr-FR' });
  const ap = await adminCtx.newPage();

  // 1. l'admin ouvre un lien de connexion (déjà généré côté faux serveur)
  await ap.goto(base + '/auth/confirm?token_hash=ADMINTOKENHASH1234567890&type=magiclink');
  await ap.getByRole('button', { name: 'Accéder à mon espace' }).click();
  await ap.waitForURL('**/admin');
  assert.ok(await ap.getByRole('heading', { name: 'Bonjour Ahmed' }).isVisible(), 'admin connecté');

  // 2. invitation SANS email : compte créé + lien
  const invite = async (email, prenom, nom, role, dealLabel, sendEmail) => {
    await ap.getByLabel('Adresse email').fill(email); await ap.getByLabel('Prénom').fill(prenom); await ap.getByLabel('Nom', { exact: true }).fill(nom);
    await ap.getByLabel('Partie').selectOption(role);
    await ap.getByLabel('Dossier').selectOption({ label: dealLabel });
    const box = ap.getByLabel(/Envoyer l'email d'invitation/); if (sendEmail) await box.check(); else await box.uncheck();
    await ap.getByRole('button', { name: "Créer l'invitation" }).click();
  };
  await invite('mandat@exemple.test', 'Marie', 'Mandat', 'partie_mandat', 'Nouveau dossier', false);
  await ap.getByText(/Compte créé pour mandat@exemple.test, sans email envoyé/).waitFor();
  const link1 = await ap.locator('#login-link').inputValue();
  assert.match(link1, /\/auth\/confirm\?token_hash=[a-f0-9]+&type=magiclink$/);
  assert.ok(await ap.getByText('Il ne fonctionne qu\'une fois').isVisible());

  // 3. la partie ouvre le lien (fenêtre privée) : un aperçu de lien ne consomme pas le jeton
  const mCtx = await b.newContext({ viewport: { width: 390, height: 900 }, locale: 'fr-FR' });
  const mp = await mCtx.newPage();
  const preview = await mCtx.request.get(link1);       // comme un aperçu de messagerie
  assert.equal(preview.status(), 200);
  await mp.goto(link1);
  await mp.getByRole('button', { name: 'Accéder à mon espace' }).click();
  await mp.waitForURL('**/dossier');
  assert.ok(await mp.getByRole('heading', { name: 'Bonjour Marie' }).isVisible(), 'partie mandat connectée');
  const ref = await mp.locator('.kr-ref-line').innerText();
  assert.match(ref, /KR-\d{4}-\d{4}/);
  assert.ok(await mp.getByRole('link', { name: 'Répondre au questionnaire' }).isVisible(), 'action principale : questionnaire');
  assert.equal(await mp.locator('.kr-step').count(), 9, '9 étapes');
  assert.ok(await mp.locator('.kr-step--current').innerText().then(t => /Accord/.test(t)), 'étape 1 en cours');
  // lien déjà utilisé
  const mp2 = await (await b.newContext()).newPage(); await mp2.goto(link1);
  await mp2.getByRole('button', { name: 'Accéder à mon espace' }).click();
  await mp2.getByText("Ce lien n'est plus valable").waitFor();

  // 4. l'admin invite l'investisseur dans le MÊME dossier
  await ap.reload();
  const opt = await ap.locator('#deal option').allInnerTexts();
  assert.equal(opt.length, 2, 'Nouveau dossier + 1 dossier : ' + opt);
  await invite('invest@exemple.test', 'Yann', 'Invest', 'partie_investisseurs', opt[1], false);
  await ap.getByText(/Compte créé pour invest@exemple.test/).waitFor();
  const link2 = await ap.locator('#login-link').inputValue();
  // doublon d'adresse
  await invite('invest@exemple.test', 'Yann', 'Invest', 'partie_investisseurs', 'Nouveau dossier', false);
  await ap.getByText('Cette adresse a déjà un compte.').waitFor();
  // deuxième partie mandat sur le même dossier : refusé
  await invite('autre@exemple.test', 'Paul', 'Autre', 'partie_mandat', opt[1], false);
  await ap.getByText(/Ce dossier a déjà une partie de ce type/).waitFor();
  // avec email (le faux serveur refuse l'envoi) : rien n'est créé
  await invite('refuse@exemple.test', 'Zoé', 'Refus', 'partie_investisseurs', 'Nouveau dossier', true);
  await ap.getByText(/L'invitation n'a pas pu être envoyée/).waitFor();

  const iCtx = await b.newContext({ viewport: { width: 390, height: 900 }, locale: 'fr-FR' });
  const ip = await iCtx.newPage(); await ip.goto(link2);
  await ip.getByRole('button', { name: 'Accéder à mon espace' }).click(); await ip.waitForURL('**/dossier');
  assert.ok(await ip.getByRole('heading', { name: 'Bonjour Yann' }).isVisible());
  assert.equal((await ip.locator('.kr-ref-line').innerText()), ref, 'même référence de dossier pour les deux parties');

  // 5. page du dossier côté admin : un lien par partie
  await ap.goto(base + '/admin'); await ap.getByRole('link', { name: 'Ouvrir le dossier' }).first().click();
  await ap.getByRole('button', { name: 'Générer un lien de connexion (test)' }).first().waitFor();
  assert.equal(await ap.getByRole('button', { name: 'Générer un lien de connexion (test)' }).count(), 2);
  ap.once('dialog', (d) => d.accept());
  await ap.getByRole('button', { name: 'Générer un lien de connexion (test)' }).first().click();
  await ap.getByText(/Lien de connexion créé pour/).waitFor();
  const link3 = await ap.locator('#login-link').inputValue(); assert.match(link3, /token_hash=/);

  // 6. questionnaire de la partie mandat (espace connecté)
  await mp.goto(base + '/dossier/questionnaire');
  assert.ok(await mp.getByRole('heading', { name: 'Questionnaire de cadrage' }).isVisible());
  await mp.screenshot({ path: '/tmp/e2e-q.png' });

  // 7. un compte non administrateur n'accède pas à /admin ; sans session → connexion
  await mp.goto(base + '/admin'); await mp.waitForURL('**/dossier');
  const anon = await (await b.newContext()).newPage(); await anon.goto(base + '/admin'); await anon.waitForURL('**/connexion');
  // 8. aucun lien généré pour un compte administrateur
  const ev = await (await fetch('http://127.0.0.1:54399/__events')).json();
  assert.ok(ev.filter(e => e === 'POST /auth/v1/admin/generate_link').length >= 3);
  console.log('E2E1 OK');
  await b.close();
})().catch(e => { console.error(e.message); process.exit(1); });
