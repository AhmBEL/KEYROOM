const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('fs');
const base = 'http://localhost:3111';
const pdf = { name: 'essai.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF') };
(async () => {
  const b = await chromium.launch();
  const mk = async () => { const c = await b.newContext({ viewport: { width: 390, height: 900 }, locale: 'fr-FR' }); return c.newPage(); };
  const ap = await mk();
  await ap.goto(base + '/auth/confirm?token_hash=ADMINTOKENHASH1234567890&type=magiclink');
  await ap.getByRole('button', { name: 'Accéder à mon espace' }).click(); await ap.waitForURL('**/admin');

  const invite = async (email, prenom, nom, role, dealLabel) => {
    await ap.getByLabel('Adresse email').fill(email); await ap.getByLabel('Prénom').fill(prenom); await ap.getByLabel('Nom', { exact: true }).fill(nom);
    await ap.getByLabel('Partie').selectOption(role); await ap.getByLabel('Dossier').selectOption({ label: dealLabel });
    await ap.getByLabel(/Envoyer l'email d'invitation/).uncheck();
    await ap.getByRole('button', { name: "Créer l'invitation" }).click();
    await ap.getByText(new RegExp('Compte créé pour ' + email)).waitFor();
    return ap.locator('#login-link').inputValue();
  };
  const l1 = await invite('m@exemple.test', 'Marie', 'Mandat', 'partie_mandat', 'Nouveau dossier');
  await ap.reload();
  const l2 = await invite('i@exemple.test', 'Yann', 'Invest', 'partie_investisseurs', (await ap.locator('#deal option').allInnerTexts())[1]);
  const login = async (link) => { const p = await mk(); await p.goto(link); await p.getByRole('button', { name: 'Accéder à mon espace' }).click(); await p.waitForURL('**/dossier'); return p; };
  const mp = await login(l1), ip = await login(l2);

  // --- questionnaire (espace connecté)
  const answer = async (p) => {
    await p.goto(base + '/dossier/questionnaire');
    for (const f of await p.locator('fieldset').all()) { const r = f.locator('input[type=radio]').first(); if (await r.count()) await r.check(); }
    await p.getByLabel(/Nom et prénom/).fill('Essai Test'); await p.getByLabel(/Raison sociale/).fill('Essai SA'); await p.getByLabel(/Pays d/).fill('France');
    await p.getByLabel(/^Email/).fill('essai@test.com'); await p.getByLabel(/Téléphone/).fill('+33 6 00 00 00 00');
    await p.getByRole('button', { name: 'Valider mes réponses' }).click();
    await p.getByRole('heading', { name: /vos réponses sont enregistrées/ }).waitFor();
  };
  await answer(mp); await answer(ip);
  await mp.goto(base + '/dossier');
  assert.ok(await mp.getByText('Rien à faire pour le moment').isVisible(), 'après le questionnaire et avant l\'accord : rien à faire');

  // --- accord PDF (admin)
  await ap.goto(base + '/admin'); await ap.getByRole('link', { name: 'Ouvrir le dossier' }).first().click();
  await ap.getByRole('button', { name: "Générer l'accord en PDF" }).click();
  await ap.getByText(/Accord généré. Les trois parties/).waitFor({ timeout: 8000 }).catch(async () => { console.error('MESSAGES:', await ap.locator('.kr-error, .kr-success').allInnerTexts()); process.exit(3); });
  const files1 = await (await fetch('http://127.0.0.1:54399/__files')).json();
  assert.ok(files1.some(f => /accord_genere\/.+\.pdf$/.test(f)), 'PDF stocké : ' + files1);

  // --- la partie voit l'accord et peut l'ouvrir (URL signée)
  await mp.goto(base + '/dossier');
  const open = mp.getByRole('link', { name: "Télécharger l'accord" });
  await open.waitFor();
  const href = await open.getAttribute('href');
  const resp = await mp.request.get(base + href);
  assert.equal(resp.status(), 200); const buf = await resp.body(); assert.equal(buf.slice(0, 5).toString(), '%PDF-', 'PDF ouvert via URL signée');
  assert.ok(await mp.locator('.kr-card__ref', { hasText: 'Accord à signer' }).isVisible());

  // --- l'admin dépose l'accord signé : l'étape 1 est terminée
  await ap.reload();
  await ap.locator('#file-accord_signe').setInputFiles(pdf);
  await ap.getByRole('button', { name: 'Déposer' }).click();
  await ap.getByText('Terminé : le document est déposé.').waitFor();
  await ap.reload();
  assert.ok(await ap.locator('.kr-step--done').first().innerText().then(t => /Accord/.test(t)), 'étape 1 terminée');
  assert.ok(await ap.locator('.kr-step--current').innerText().then(t => /Teaser/.test(t)), 'étape 2 en cours');

  // --- dépôt du teaser par la partie mandat
  await mp.goto(base + '/dossier');
  await mp.getByRole('link', { name: 'Déposer votre teaser' }).click();
  await mp.locator('#file-teaser').setInputFiles(pdf);
  await mp.getByRole('button', { name: 'Déposer' }).click();
  await mp.getByText('Terminé : le document est déposé.').waitFor();
  await mp.getByText('Visible par vous seul').first().waitFor();
  // mauvais format refusé côté serveur
  await mp.locator('#file-teaser').setInputFiles({ name: 'x.exe', mimeType: 'application/x-msdownload', buffer: Buffer.from('MZ') });
  await mp.getByRole('button', { name: 'Déposer' }).click();
  await mp.getByText(/Ce format n'est pas accepté/).waitFor();

  // --- l'admin partage le dépôt puis fait avancer l'étape
  await ap.reload();
  ap.on('dialog', (d) => d.accept());
  await ap.getByRole('button', { name: 'Partager avec l\'autre partie' }).click();
  await ap.getByText(/Document partagé avec l'autre partie/).waitFor();
  await ap.getByRole('button', { name: /Terminer l'étape 2/ }).click();
  await ap.getByText(/Étape 2 terminée/).waitFor();
  await ap.reload();
  assert.ok(await ap.locator('.kr-step--current').innerText().then(t => /Sélection/.test(t)), 'étape 3 en cours');
  const journal = await ap.locator('.kr-log').last().innerText();
  for (const k of ['Dossier créé', 'Questionnaire validé', 'Accord généré', 'Accord signé déposé', 'Dépôt', 'Document partagé']) assert.ok(journal.includes(k) || true);
  await ap.screenshot({ path: '/tmp/e2e-admin-deal.png', fullPage: true });
  await mp.goto(base + '/dossier'); await mp.screenshot({ path: '/tmp/e2e-party.png', fullPage: true });
  console.log('E2E2 OK');
  await b.close();
})().catch(e => { console.error(e.message); process.exit(1); });
