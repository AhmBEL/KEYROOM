// Parcours de la démonstration (aucun serveur de données nécessaire).
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const base = 'http://localhost:3111';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 900 }, locale: 'fr-FR' });
  const p = await ctx.newPage();
  const act = async (name) => { const v = await p.locator('#actor option', { hasText: name }).first().getAttribute('value'); await p.locator('#actor').selectOption(v); };
  const noScroll = async (where) => assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'défilement horizontal : ' + where);

  // 1. accueil, garde : sans compte, /demo/projets renvoie à l'inscription
  await p.goto(base + '/demo/projets'); await p.waitForURL('**/demo/inscription');
  await p.goto(base + '/demo'); assert.ok(await p.getByRole('link', { name: 'Commencer' }).isVisible());
  assert.equal(await p.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(11, 31, 51)', 'sombre');
  await p.getByRole('link', { name: 'Commencer' }).click();

  // 2. inscription : adresse pro + code, puis enregistrement des informations
  await p.getByRole('button', { name: 'Avec mon adresse professionnelle' }).click();
  await p.getByRole('button', { name: 'Recevoir le code de vérification' }).click();
  await p.getByText('Indiquez votre prénom et votre nom.').waitFor();
  await p.getByLabel('Prénom').fill('Sophie'); await p.getByLabel('Nom', { exact: true }).fill('Durand'); await p.getByLabel(/Adresse email/).fill('sophie@agence.test');
  await p.getByRole('button', { name: 'Recevoir le code de vérification' }).click();
  await p.getByText(/le code est 123456/).waitFor();
  await p.getByLabel('Code reçu par email').fill('000000'); await p.getByRole('button', { name: 'Vérifier mon adresse' }).click();
  await p.getByText('Ce code est incorrect').waitFor();
  await p.getByLabel('Code reçu par email').fill('123456'); await p.getByRole('button', { name: 'Vérifier mon adresse' }).click();
  await p.getByRole('heading', { name: 'Enregistrer vos informations maintenant ?' }).waitFor();
  await p.getByRole('button', { name: 'Oui, les enregistrer maintenant' }).click();
  await p.getByRole('button', { name: 'Enregistrer et continuer' }).click();
  await p.getByText('Choisissez votre profil.').waitFor();
  await p.getByLabel('Votre profil').selectOption({ label: 'Agent immobilier' });
  await p.getByLabel('Société ou agence').fill('Agence du Port');
  await noScroll('inscription');
  await p.getByRole('button', { name: 'Enregistrer et continuer' }).click();

  // 3. onboarding adapté au profil
  await p.waitForURL('**/demo/bienvenue');
  assert.equal(await p.getByLabel('Qui êtes-vous ?').inputValue(), 'agent');
  await p.getByRole('button', { name: 'Continuer' }).click();
  await p.getByText(/Vos clients voient un cadre sérieux/).waitFor();
  await p.getByRole('button', { name: 'Continuer' }).click();
  await p.getByRole('heading', { name: 'Comment ça marche' }).waitFor();
  await p.getByRole('button', { name: 'Continuer' }).click();
  await p.getByRole('heading', { name: 'Le garde-fou' }).waitFor();
  await p.getByRole('button', { name: 'Explorer un projet d\'exemple' }).click();

  // 4. projet d'exemple : vue administrateur
  await p.getByRole('heading', { name: /Hôtel 5 étoiles/ }).waitFor();
  assert.equal(await p.locator('.kr-flow__box').count(), 10, 'logigramme à 10 cases');
  await noScroll('projet');
  await p.getByRole('tab', { name: 'Documents' }).click();
  await p.getByText('mandat-signé.pdf').waitFor();                         // accès administrateur : nom visible
  assert.ok(await p.getByText('Déposé · contenu privé').first().isVisible(), 'document sans accès administrateur : contenu privé');
  assert.equal(await p.getByText('titre-propriété.pdf').count(), 0, 'nom du fichier privé non affiché');
  await p.getByRole('tab', { name: 'Participants' }).click();
  await p.getByText('Questionnaire reçu').first().waitFor();

  // 5. agir en tant que Yann : identité de Marie masquée, accepter, répondre, déposer, signer
  await act('Yann');
  await p.getByRole('heading', { name: 'À faire maintenant' }).waitFor();
  assert.ok(await p.getByText(/Partie A \(côté vente\)/).first().isVisible(), 'Marie apparaît comme Partie A');
  const visibleText = () => p.evaluate(() => { const el = document.querySelector('main').cloneNode(true); el.querySelector('#actor')?.remove(); return el.textContent; });
  assert.ok(!(await visibleText()).includes('Marie Laurent'), 'identité cachée avant révélation (hors sélecteur de démonstration)');
  await p.getByRole('tab', { name: 'Processus' }).click();
  await p.getByText('Vous avez accepté ce processus.').waitFor();   // le projet d'exemple est déjà accepté
  await p.getByRole('tab', { name: 'Mon espace' }).click();
  await p.getByLabel('Type de bien recherché').fill('Hôtel de luxe');
  await p.getByLabel('Zones recherchées').fill('Océan Indien');
  await p.locator('fieldset', { hasText: 'Budget' }).getByLabel('2 à 10 M€').check();
  await p.getByRole('button', { name: 'Envoyer mes réponses' }).click();
  await p.getByText('Vos réponses sont enregistrées.').waitFor();
  await p.getByRole('tab', { name: 'Mes documents' }).click();
  while (await p.locator('input[type=file]').count()) { await p.locator('input[type=file]').first().setInputFiles({ name: 'piece.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 demo') }); await p.waitForTimeout(60); }
  await p.getByText(/Obligatoires : 4 sur 4 déposés/).waitFor();
  assert.ok(await p.getByText('Ils ne sont pas encore révélés.').isVisible());
  await p.getByRole('tab', { name: 'Mon espace' }).click();
  await p.getByRole('button', { name: 'Signer (simulation)' }).click();

  // 6. demande de modification de Yann, tranchée par l'administrateur
  await p.getByRole('tab', { name: 'Processus' }).click();
  await p.getByLabel('Type de demande').selectOption('remove');
  await p.getByLabel('Étape à retirer').selectOption({ label: 'MOU et exclusivité' });
  await p.getByRole('button', { name: 'Envoyer la demande' }).click();
  await p.getByText('En attente').waitFor();

  // 7. Marie signe, puis l'administrateur arbitre
  await act('Marie');
  await p.getByRole('button', { name: 'Signer (simulation)' }).click();
  await act('Sophie');
  await p.getByRole('tab', { name: 'Processus' }).click();
  await p.getByRole('heading', { name: /Demandes des participants \(1\)/ }).waitFor();
  await p.getByRole('button', { name: 'Accepter', exact: true }).click();
  await p.getByText('Aucune demande en attente.').waitFor();
  assert.equal(await p.locator('.kr-flow__box').count(), 9, 'une étape retirée à la demande de Yann');

  // 8. simuler les autres, puis valider chaque étape jusqu'à la fin ; les révélations se produisent
  await p.getByRole('tab', { name: 'Vue d\'ensemble' }).click();
  await p.getByRole('button', { name: 'Simuler les autres participants' }).click();
  await p.getByText(/ont tout rempli, déposé, signé et approuvé/).waitFor();
  for (let k = 0; k < 12; k++) {
    const btn = p.getByRole('button', { name: 'Valider cette étape' }).first();
    if (!(await btn.count())) break;
    await btn.click(); await p.waitForTimeout(80);
  }
  await p.getByText('Toutes les étapes sont terminées.').waitFor();
  await p.getByRole('tab', { name: 'Journal' }).click();
  await p.getByText(/Étape validée : NDA signé par les parties — révélation : identités/).waitFor();
  await p.getByText(/Étape validée : Data room par paliers — révélation : documents/).waitFor();

  // 9. après révélation, Yann voit Marie et ses documents
  await act('Yann');
  await p.getByRole('tab', { name: 'Mes documents' }).click();
  await p.waitForFunction(() => { const el = document.querySelector('main').cloneNode(true); el.querySelector('#actor')?.remove(); return el.textContent.includes('Marie Laurent'); });
  assert.equal(await p.getByText('Ils ne sont pas encore révélés.').count(), 0);
  await act('Sophie');

  // 10. mandat automatique : générer, valider, signer par le mandant, envoyer
  await p.getByRole('tab', { name: 'Mandat' }).click();
  await p.getByRole('button', { name: 'Générer le mandat' }).click();
  await p.getByText('Brouillon à valider').waitFor();
  await p.getByRole('button', { name: 'Valider le mandat' }).click();
  await p.getByText('Validé, en attente de signature').waitFor();
  await act('Marie');
  await p.getByRole('tab', { name: 'Mandat' }).click();
  await p.getByLabel('Tapez votre nom pour signer').fill('Marie Laurent');
  await p.getByRole('button', { name: 'Signer le mandat' }).isDisabled();
  await p.getByLabel('Je souhaite signer ce mandat.').check();
  await p.getByRole('button', { name: 'Signer le mandat' }).click();
  await p.getByText(/Signé par Marie Laurent/).waitFor();
  await act('Sophie');
  await p.getByRole('tab', { name: 'Mandat' }).click();
  await p.getByRole('button', { name: 'Envoyer le mandat signé' }).click();
  await p.getByText(/Envoyé le .* par signature électronique \(simulation\)/).waitFor();
  const [popup] = await Promise.all([ctx.waitForEvent('page'), p.getByRole('button', { name: 'Ouvrir le mandat (PDF)' }).click()]);
  await popup.waitForTimeout(600); await popup.close();   // le PDF s'ouvre dans un nouvel onglet

  // 11. création d'un projet : assistant complet, version simplifiée, étape ajoutée, avertissements
  await p.goto(base + '/demo/projets');
  await p.getByRole('link', { name: 'Créer un projet' }).click();
  await p.getByText('Étape 1 sur 7').waitFor();
  await p.getByText('Vente immobilière, transaction standard').click();
  await p.getByRole('button', { name: 'Continuer' }).click();
  assert.equal(await p.getByLabel('Mon rôle').inputValue(), 'agent', 'rôle présélectionné selon le profil');
  await p.getByLabel('Nom du projet').fill('Villa à Bordeaux');
  await p.getByRole('button', { name: 'Continuer' }).click();
  await p.getByRole('button', { name: 'Ajouter les parties attendues' }).click();
  await p.getByRole('button', { name: 'Continuer' }).click();
  await p.getByText('Chaque participant doit avoir un nom et une adresse email valide, ou être retiré.').waitFor();
  const names = ['Paul Vendeur', 'Léa Acheteuse'], mails = ['paul@vendeur.test', 'lea@acheteuse.test'];
  for (let i = 0; i < 2; i++) { await p.locator(`#pa${i}`).fill(names[i]); await p.locator(`#pe${i}`).fill(mails[i]); }
  await p.getByRole('button', { name: 'Continuer' }).click();
  await p.getByRole('heading', { name: 'Quelles informations demander ?' }).waitFor();
  await p.getByRole('button', { name: 'Continuer' }).click();
  await p.getByRole('heading', { name: 'Quels documents demander ?' }).waitFor();
  assert.ok(await p.getByText('Vérification automatique de l\'identité').first().isVisible());
  await noScroll('documents (assistant)');
  await p.getByRole('button', { name: 'Continuer' }).click();
  await p.getByRole('heading', { name: 'Le processus' }).waitFor();
  await p.locator('#nt').fill('Visite du bien');
  await p.getByRole('button', { name: 'Ajouter à la fin du processus' }).click();
  await p.getByText('Visite du bien').first().waitFor();
  // désactiver l'accord de départ : avertissement de cohérence
  await p.locator('ul.kr-list > li', { hasText: 'Accord des parties' }).first().getByRole('checkbox').first().uncheck();
  await p.getByText(/Le premier accord signé n'est pas au démarrage/).waitFor();
  await p.locator('ul.kr-list > li', { hasText: 'Accord des parties' }).first().getByRole('checkbox').first().check();
  await p.getByRole('button', { name: 'Version simplifiée' }).click();
  await noScroll('processus (assistant)');
  await p.getByRole('button', { name: 'Continuer' }).click();
  await p.getByRole('heading', { name: 'Récapitulatif' }).waitFor();
  await p.getByRole('button', { name: 'Envoyer les invitations' }).click();
  await p.getByRole('heading', { name: 'Villa à Bordeaux' }).waitFor();
  await p.getByText(/2 participants n'ont pas encore accepté le processus/).waitFor();
  await p.getByRole('tab', { name: 'Journal' }).click();
  await p.getByText(/Invitation envoyée à Paul Vendeur/).waitFor();
  // un invité accepte le processus (état « à accepter » au départ)
  await act('Paul');
  await p.getByText('Rien à faire pour le moment').waitFor({ timeout: 2000 }).catch(() => {});
  await p.getByRole('tab', { name: 'Processus' }).click();
  await p.getByRole('button', { name: 'Accepter le processus' }).click();
  await p.getByText('Vous avez accepté ce processus.').waitFor();
  await act('Sophie');
  await p.screenshot({ path: '/tmp/demo-project.png', fullPage: true });

  // 12. À venir, profil, réinitialisation
  await p.goto(base + '/demo/bientot');
  for (const t of ['Vérification d\'identité', 'Vérification des entreprises', 'Signature électronique certifiée', 'Assistant IA']) assert.ok(await p.getByText(t, { exact: true }).isVisible(), t);
  await p.goto(base + '/demo/profil'); assert.equal(await p.getByLabel('Mon profil').inputValue(), 'agent');
  await noScroll('profil');
  p.once('dialog', (d) => d.accept());
  await p.getByRole('button', { name: 'Réinitialiser la démonstration' }).click();
  await p.waitForURL('**/demo');
  await p.waitForFunction(() => !JSON.parse(localStorage.getItem('kr-demo-v1') || '{}').profile);
  await p.goto(base + '/demo/projets'); await p.waitForURL('**/demo/inscription');
  console.log('DEMO OK');
  await b.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
