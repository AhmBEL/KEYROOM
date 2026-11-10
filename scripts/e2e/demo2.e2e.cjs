// Parcours de la démonstration V2 (aucun serveur de données nécessaire).
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const base = 'http://localhost:3111';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 900 }, locale: 'fr-FR' });
  const p = await ctx.newPage();
  const noScroll = async (w) => assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'défilement horizontal : ' + w);
  const act = async (name) => { const v = await p.locator('#actor option', { hasText: name }).first().getAttribute('value'); await p.locator('#actor').selectOption(v); };
  const bodyText = () => p.evaluate(() => { const el = document.querySelector('.kr2-page').cloneNode(true); el.querySelector('#actor')?.remove(); return el.textContent; });
  const draw = async () => {
    const box = await p.locator('.kr2-pad canvas').boundingBox();
    await p.mouse.move(box.x + 30, box.y + 80); await p.mouse.down();
    for (let k = 1; k <= 12; k++) await p.mouse.move(box.x + 30 + k * 18, box.y + 80 + Math.sin(k) * 30);
    await p.mouse.up();
  };

  // 1. accueil + garde
  await p.goto(base + '/demo2/projets'); await p.waitForURL('**/demo2/inscription');
  await p.goto(base + '/demo2'); await noScroll('accueil');
  assert.equal(await p.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(11, 31, 51)');
  await p.getByRole('link', { name: 'Commencer' }).click();

  // 2. inscription conversationnelle : e-mail, code (saisie chiffre par chiffre), nom, métier, enregistrement
  await p.getByText('Utiliser mon adresse professionnelle').click();
  await p.getByRole('button', { name: 'Recevoir le code' }).click();
  await p.getByText("Cette adresse n'est pas valide").waitFor();
  await p.getByLabel('Adresse email professionnelle').fill('sophie@agence.test');
  await p.getByRole('button', { name: 'Recevoir le code' }).click();
  await p.getByRole('heading', { name: 'Entrez le code reçu' }).waitFor();
  await p.getByLabel('Chiffre 1').click(); await p.keyboard.type('000000');
  await p.getByText('Ce code est incorrect').waitFor();
  for (let i = 1; i <= 6; i++) await p.getByLabel(`Chiffre ${i}`).fill('');
  await p.getByLabel('Chiffre 1').click(); await p.keyboard.type('123456');
  await p.getByRole('heading', { name: 'Comment vous appelez-vous ?' }).waitFor();
  await p.getByLabel('Prénom').fill('Sophie'); await p.getByLabel('Nom', { exact: true }).fill('Durand');
  await p.getByRole('button', { name: 'Continuer' }).click();
  await p.getByRole('heading', { name: /Quel est votre métier/ }).waitFor();
  await noScroll('métier');
  await p.getByRole('button', { name: /Agent immobilier/ }).click();
  await p.getByRole('heading', { name: 'Voulez-vous enregistrer vos informations ?' }).waitFor();
  await p.getByRole('button', { name: /Oui, gagner du temps/ }).click();
  await p.getByLabel('Société ou agence').fill('Agence du Port');
  await p.getByRole('button', { name: 'Terminer' }).click();

  // 3. onboarding en trois écrans
  await p.waitForURL('**/demo2/bienvenue');
  await p.getByRole('heading', { name: 'Bienvenue, Sophie' }).waitFor();
  await p.getByRole('button', { name: 'Continuer' }).click();
  await p.getByRole('heading', { name: 'Chacun dépose, personne ne voit' }).waitFor();
  await p.getByRole('button', { name: 'Continuer' }).click();
  await p.getByText(/Vos clients voient un cadre sérieux/).waitFor();
  await p.getByRole('button', { name: 'Découvrir un exemple' }).click();

  // 4. cockpit administrateur
  await p.getByRole('heading', { name: /Hôtel 5 étoiles/ }).waitFor();
  await noScroll('cockpit admin');
  assert.ok(await p.getByText('Le parcours', { exact: true }).isVisible()); assert.ok(await p.getByText('Les personnes', { exact: true }).isVisible());
  assert.ok(await p.getByText(/Prêt à valider|Étape en cours/).first().isVisible());

  // 5. Yann : une tâche à la fois (questionnaire question par question, coffre, signature dessinée)
  await act('Yann');
  await p.getByRole('heading', { name: 'Votre prochaine action' }).count().catch(() => 0);
  await p.getByText('Répondre au questionnaire').first().waitFor();
  assert.ok(!(await bodyText()).includes('Marie Laurent'), 'identité masquée avant révélation');
  await p.getByRole('button', { name: 'Commencer' }).click();
  await p.getByText('1 / 4').waitFor();
  await p.getByLabel('Type de bien recherché').fill('Hôtel de luxe');
  await p.getByRole('button', { name: 'Continuer' }).click();
  await p.getByRole('button', { name: 'Continuer' }).click();            // obligatoire vide → erreur
  await p.getByText('Cette réponse est requise.').waitFor();
  await p.getByLabel('Zones recherchées').fill('Océan Indien');
  await p.getByRole('button', { name: 'Continuer' }).click();
  await p.getByText('3 / 4').waitFor();
  await p.getByRole('button', { name: '2 à 10 M€' }).click();           // choix à toucher : passe à la suite tout seul
  await p.getByText('4 / 4').waitFor();
  await p.getByText('Passer cette question (facultatif)').click();
  await p.getByRole('heading', { name: 'Vérifiez vos réponses' }).waitFor();
  await p.getByRole('button', { name: 'Modifier : Zones recherchées' }).click();
  await p.getByLabel('Zones recherchées').fill('Maurice');
  await p.getByRole('button', { name: 'Continuer' }).click();
  await p.getByRole('heading', { name: 'Vérifiez vos réponses' }).waitFor();   // retour direct au résumé après une modification
  assert.ok((await bodyText()).includes('Maurice'), 'réponse modifiée visible dans le résumé');
  await p.getByRole('button', { name: 'Envoyer mes réponses' }).click();
  await p.getByText('Réponses envoyées, merci').waitFor();
  // coffre
  await p.getByText('Déposer vos documents').first().waitFor();
  await p.getByRole('button', { name: 'Commencer' }).click();
  await p.getByText('Mon coffre').first().waitFor();
  assert.ok(await p.getByText('Prendre une photo').first().isVisible());
  while (await p.locator('input[type=file]:not([capture])').count()) { await p.locator('input[type=file]:not([capture])').first().setInputFiles({ name: 'piece.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 demo') }); await p.waitForTimeout(60); }
  await p.getByText('Votre coffre est complet').waitFor();
  await noScroll('coffre');
  await p.getByRole('tab', { name: 'Aujourd\'hui' }).click();
  // signature dessinée
  await p.getByText(/Signer : Accord tripartite/).first().waitFor();
  await p.getByRole('button', { name: 'Commencer' }).click();
  await p.getByRole('heading', { name: 'Votre signature' }).waitFor();
  assert.equal(await p.getByRole('button', { name: 'Signer', exact: true }).isDisabled(), true, 'signature vide : bouton inactif');
  await draw(); await p.getByLabel('Je confirme vouloir signer.').check();
  await p.getByRole('button', { name: 'Signer', exact: true }).click();
  await p.getByText('Signature enregistrée').waitFor();
  await p.getByText('Vous avez tout fait pour l\'instant').waitFor();

  // 6. Marie signe avec la signature enregistrée n'existe pas : elle dessine ; l'admin simule le reste
  await act('Marie');
  await p.getByRole('button', { name: 'Commencer' }).click();
  await p.getByRole('heading', { name: /Déposer vos documents|Votre signature/ }).first().waitFor().catch(() => {});
  await act('Sophie');
  await p.getByText('Outils de démonstration').click();
  await p.getByRole('button', { name: 'Simuler les autres participants' }).click();
  await p.getByText('Les autres participants ont tout rempli').waitFor();
  for (let k = 0; k < 14; k++) {
    const btn = p.getByRole('button', { name: 'Valider cette étape' }).first();
    await p.waitForTimeout(120);
    if (!(await btn.count())) break;
    await btn.click();
  }
  await p.getByText('Processus terminé').waitFor();
  await p.getByRole('tab', { name: 'Journal' }).click();
  await p.getByText(/révélation : identités/).waitFor();
  await p.getByText(/révélation : documents/).waitFor();

  // 7. après révélation, Yann voit Marie
  await act('Yann'); await p.getByRole('tab', { name: 'Mon coffre' }).click();
  await p.waitForFunction(() => document.querySelector('.kr2-page').textContent.includes('Marie Laurent'));

  // 8. mandat : l'admin génère et valide, Marie signe au doigt, l'admin envoie
  await act('Sophie'); await p.getByRole('tab', { name: 'Mandat' }).click();
  await p.getByRole('button', { name: 'Générer le mandat' }).click(); await p.getByRole('button', { name: 'Valider le mandat' }).click();
  await act('Marie'); await p.getByRole('tab', { name: 'Mandat' }).click();
  await p.getByText('Prêt à signer').waitFor();
  await p.getByRole('button', { name: 'Signer le mandat' }).click();
  await draw(); await p.getByLabel('Je confirme vouloir signer.').check(); await p.getByRole('button', { name: 'Signer', exact: true }).click();
  await p.getByText('Mandat signé').first().waitFor();
  await p.getByRole('tab', { name: 'Mandat' }).click(); await p.getByRole('heading', { name: 'Signé', exact: true }).waitFor();
  await act('Sophie'); await p.getByRole('tab', { name: 'Mandat' }).click();
  await p.getByRole('button', { name: 'Envoyer le mandat signé' }).click();
  await p.getByText(/par signature électronique \(simulation\)/).waitFor();

  // 9. assistant de création en 5 écrans
  await p.goto(base + '/demo2/projets');
  await p.getByRole('button', { name: /Nouveau projet/ }).click();
  await p.getByRole('heading', { name: 'Que souhaitez-vous faire ?' }).waitFor();
  await p.getByRole('button', { name: /Accompagner une transaction/ }).click();
  await p.getByRole('heading', { name: 'Quel type de transaction ?' }).waitFor();
  await p.getByRole('button', { name: /Vente immobilière, transaction standard/ }).click();
  await p.getByRole('heading', { name: 'Quel niveau de sécurité ?' }).waitFor();
  await p.getByRole('button', { name: /Simple/ }).click();
  await p.getByRole('button', { name: 'Continuer' }).click();
  await p.getByRole('heading', { name: 'Qui invitez-vous ?' }).waitFor();
  await p.getByRole('button', { name: /Ajouter une personne/ }).click();
  await p.getByLabel('Nom').fill('Paul Vendeur'); await p.getByLabel('Email').fill('paul@vendeur.test');
  await p.getByRole('button', { name: 'Ajouter', exact: true }).click();
  await p.getByText('Paul Vendeur').first().waitFor();
  await p.getByRole('button', { name: 'Continuer' }).click();
  await p.getByRole('heading', { name: 'Tout est prêt' }).waitFor();
  await noScroll('assistant');
  await p.getByLabel('Nom du projet').fill('Villa à Bordeaux');
  await p.getByRole('button', { name: 'Envoyer les invitations' }).click();
  await p.getByRole('heading', { name: 'Villa à Bordeaux' }).waitFor();
  await p.getByText('Invitations envoyées').waitFor();
  // l'invité accepte : écran du processus
  await act('Paul'); await p.getByText('Accepter le processus').first().waitFor();
  await p.getByRole('button', { name: 'Commencer' }).click();
  await p.getByRole('heading', { name: 'Le processus proposé' }).waitFor();
  await p.getByRole('button', { name: "J'accepte le processus" }).click();
  await p.getByText('Processus accepté').first().waitFor();
  await p.screenshot({ path: '/tmp/demo2-project.png', fullPage: true });
  await p.goto(base + '/demo2/bientot'); assert.ok(await p.getByText('Vérification d\'identité').isVisible());
  console.log('DEMO2 OK');
  await b.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
