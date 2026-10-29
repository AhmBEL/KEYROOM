// Test des règles d'accès avec trois utilisateurs : admin, partie mandat, partie investisseurs,
// plus un second dossier et un utilisateur sans dossier.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";

const root = new pg.Client({ connectionString: process.env.DATABASE_URL });
const ids = {
  admin: randomUUID(),
  mandat: randomUUID(),
  invest: randomUUID(),
  mandat2: randomUUID(),
  invest2: randomUUID(),
  outsider: randomUUID(),
};
let dealA, dealB;
const doc = {};

before(async () => {
  await root.connect();
  const profiles = [
    ["admin", "Ahmed", "Belhadj", "admin"],
    ["mandat", "Marie", "Mandat", "partie_mandat"],
    ["invest", "Yann", "Invest", "partie_investisseurs"],
    ["mandat2", "Paul", "Autre", "partie_mandat"],
    ["invest2", "Lea", "Autre", "partie_investisseurs"],
    ["outsider", "Sans", "Dossier", "partie_mandat"],
  ];
  for (const [k, prenom, nom, role] of profiles) {
    await root.query("insert into auth.users (id, email) values ($1, $2)", [ids[k], `${k}@test.local`]);
    await root.query("insert into public.profiles (id, prenom, nom, role) values ($1,$2,$3,$4)", [ids[k], prenom, nom, role]);
  }
  dealA = (await root.query("select * from public.create_deal($1)", [ids.admin])).rows[0];
  dealB = (await root.query("select * from public.create_deal($1)", [ids.admin])).rows[0];
  const members = [[dealA, "mandat", "partie_mandat"], [dealA, "invest", "partie_investisseurs"],
    [dealB, "mandat2", "partie_mandat"], [dealB, "invest2", "partie_investisseurs"]];
  for (const [d, k, role] of members) {
    await root.query("insert into public.deal_members values ($1,$2,$3)", [d.id, ids[k], role]);
    await root.query(
      "insert into public.questionnaire_responses (deal_id, user_id, answers, submitted_at) values ($1,$2,$3,now())",
      [d.id, ids[k], JSON.stringify({ secret: `reponse-${k}` })],
    );
  }
  const insertDoc = async (key, d, by, category, shared = false) => {
    const id = randomUUID();
    doc[key] = id;
    await root.query(
      `insert into public.documents (id, deal_id, uploaded_by, category, storage_path, filename, mime_type, size_bytes, shared_with_other_party)
       values ($1,$2,$3,$4,$5,'f.pdf','application/pdf',1000,$6)`,
      [id, d.id, ids[by], category, `${d.id}/${category}/${id}.pdf`, shared],
    );
  };
  await insertDoc("teaserA", dealA, "mandat", "teaser");
  await insertDoc("criteresA", dealA, "invest", "criteres");
  await insertDoc("accordA", dealA, "admin", "accord_genere");
  await insertDoc("teaserB", dealB, "mandat2", "teaser");
});

after(async () => { await root.end(); });

// Ouvre une transaction annulée à la fin ; as(user) bascule sur le rôle « authenticated »
// avec le jeton de cet utilisateur, as(null) sur « anon ».
async function withTx(fn) {
  const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  await c.query("begin");
  let n = 0;
  const tx = {
    async as(user) {
      await c.query("reset role");
      if (user === null) {
        await c.query("select set_config('request.jwt.claims', '', true)");
        await c.query("set local role anon");
      } else {
        await c.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: ids[user] })]);
        await c.query("set local role authenticated");
      }
    },
    async q(sql, params) { return (await c.query(sql, params)).rows; },
    async res(sql, params) { return c.query(sql, params); },
    async fails(sql, params) {
      const sp = `sp${n++}`;
      await c.query(`savepoint ${sp}`);
      try { await c.query(sql, params); await c.query(`release ${sp}`); return null; }
      catch (e) { await c.query(`rollback to ${sp}`); return e.code; }
    },
  };
  try { await fn(tx); } finally { await c.query("rollback"); await c.end(); }
}

const PERMISSION_OR_RLS = "42501";
const TABLES = ["profiles", "deals", "deal_members", "deal_steps", "deal_settings",
  "questionnaire_responses", "documents", "audit_log"];

test("RLS est activée sur toutes les tables de public", async () => {
  const rows = (await root.query(
    "select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity",
  )).rows;
  assert.deepEqual(rows, []);
});

test("un visiteur non connecté ne lit aucune table", async () => {
  await withTx(async (tx) => {
    await tx.as(null);
    for (const t of TABLES) assert.equal(await tx.fails(`select * from public.${t}`), PERMISSION_OR_RLS, t);
  });
});

test("la partie mandat ne lit pas les réponses de l'investisseur (et inversement)", async () => {
  await withTx(async (tx) => {
    await tx.as("mandat");
    const mine = await tx.q("select answers from public.questionnaire_responses");
    assert.equal(mine.length, 1);
    assert.equal(mine[0].answers.secret, "reponse-mandat");
    await tx.as("invest");
    const theirs = await tx.q("select answers from public.questionnaire_responses");
    assert.equal(theirs.length, 1);
    assert.equal(theirs[0].answers.secret, "reponse-invest");
  });
});

test("le dépôt d'une partie est invisible de l'autre tant que l'admin ne l'a pas partagé", async () => {
  await withTx(async (tx) => {
    await tx.as("invest");
    let ids_ = (await tx.q("select id from public.documents")).map((r) => r.id);
    assert.ok(!ids_.includes(doc.teaserA), "teaser visible avant partage");
    assert.ok(ids_.includes(doc.criteresA));
    assert.ok(ids_.includes(doc.accordA), "accord visible par les membres");

    await tx.as("admin");
    const upd = await tx.res("update public.documents set shared_with_other_party = true where id = $1", [doc.teaserA]);
    assert.equal(upd.rowCount, 1);

    await tx.as("invest");
    ids_ = (await tx.q("select id from public.documents")).map((r) => r.id);
    assert.ok(ids_.includes(doc.teaserA), "teaser visible après partage");

    await tx.as("outsider");
    assert.equal((await tx.q("select id from public.documents")).length, 0);
  });
});

test("une partie ne peut pas modifier shared_with_other_party ni insérer un dépôt déjà partagé", async () => {
  await withTx(async (tx) => {
    await tx.as("mandat");
    const upd = await tx.res("update public.documents set shared_with_other_party = true where id = $1", [doc.teaserA]);
    assert.equal(upd.rowCount, 0);
    const id = randomUUID();
    const code = await tx.fails(
      `insert into public.documents (id, deal_id, uploaded_by, category, storage_path, filename, mime_type, size_bytes, shared_with_other_party)
       values ($1,$2,$3,'teaser',$4,'x.pdf','application/pdf',10,true)`,
      [id, dealA.id, ids.mandat, `${dealA.id}/teaser/${id}.pdf`],
    );
    assert.equal(code, PERMISSION_OR_RLS);
    await tx.as("admin");
    const [row] = await tx.q("select shared_with_other_party s from public.documents where id = $1", [doc.teaserA]);
    assert.equal(row.s, false);
  });
});

test("règles de dépôt : catégorie selon le rôle, chemin dans son dossier, pas d'accord signé", async () => {
  await withTx(async (tx) => {
    const insert = (deal, by, category, path) => tx.fails(
      `insert into public.documents (deal_id, uploaded_by, category, storage_path, filename, mime_type, size_bytes)
       values ($1,$2,$3,$4,'x.pdf','application/pdf',10)`,
      [deal.id, ids[by], category, path],
    );
    const p = (deal, cat) => `${deal.id}/${cat}/${randomUUID()}.pdf`;
    await tx.as("invest");
    assert.equal(await insert(dealA, "invest", "teaser", p(dealA, "teaser")), PERMISSION_OR_RLS, "teaser côté investisseurs");
    assert.equal(await insert(dealA, "invest", "accord_signe", p(dealA, "accord_signe")), PERMISSION_OR_RLS, "accord signé par une partie");
    assert.equal(await insert(dealB, "invest", "criteres", p(dealB, "criteres")), PERMISSION_OR_RLS, "autre dossier");
    assert.equal(await insert(dealA, "mandat", "criteres", p(dealA, "criteres")), PERMISSION_OR_RLS, "usurpation d'identité");
    assert.equal(await insert(dealA, "invest", "criteres", p(dealB, "criteres")), "23514", "chemin vers le dossier d'un autre");
    assert.equal(await insert(dealA, "invest", "criteres", p(dealA, "criteres")), null, "dépôt légitime");
    await tx.as("admin");
    assert.equal(await insert(dealA, "admin", "accord_signe", p(dealA, "accord_signe")), null, "l'admin dépose l'accord signé");
    await tx.as("mandat");
    const cats = (await tx.q("select category from public.documents where deal_id = $1", [dealA.id])).map((r) => r.category);
    assert.ok(cats.includes("accord_signe"), "accord signé visible par la partie mandat");
  });
});

test("isolation entre dossiers et pour un utilisateur sans dossier", async () => {
  await withTx(async (tx) => {
    await tx.as("mandat");
    assert.deepEqual((await tx.q("select id from public.deals")).map((r) => r.id), [dealA.id]);
    assert.equal((await tx.q("select 1 from public.deal_steps where deal_id = $1", [dealB.id])).length, 0);
    assert.equal((await tx.q("select 1 from public.documents where deal_id = $1", [dealB.id])).length, 0);
    await tx.as("outsider");
    for (const t of ["deals", "deal_members", "deal_steps", "questionnaire_responses", "documents"]) {
      assert.equal((await tx.q(`select 1 from public.${t}`)).length, 0, t);
    }
    const code = await tx.fails(
      "insert into public.questionnaire_responses (deal_id, user_id) values ($1,$2)", [dealA.id, ids.outsider]);
    assert.equal(code, PERMISSION_OR_RLS);
  });
});

test("une partie ne peut pas écrire des réponses au nom d'un autre, ni modifier une réponse validée", async () => {
  await withTx(async (tx) => {
    await tx.as("mandat");
    assert.equal(await tx.fails(
      "insert into public.questionnaire_responses (deal_id, user_id) values ($1,$2)", [dealA.id, ids.invest]), PERMISSION_OR_RLS);
    const upd = await tx.res(
      "update public.questionnaire_responses set answers = '{\"x\":1}' where user_id = $1", [ids.mandat]);
    assert.equal(upd.rowCount, 0, "réponse validée verrouillée");
    const other = await tx.res(
      "update public.questionnaire_responses set answers = '{\"x\":1}' where user_id = $1", [ids.invest]);
    assert.equal(other.rowCount, 0);
  });
});

test("étapes : seul l'admin les change, et le changement est journalisé", async () => {
  await withTx(async (tx) => {
    await tx.as("mandat");
    assert.equal((await tx.res("update public.deal_steps set status = 'done' where deal_id = $1 and position = 1", [dealA.id])).rowCount, 0);
    assert.equal(await tx.fails("update public.deal_steps set label = 'x' where deal_id = $1", [dealA.id]), PERMISSION_OR_RLS);
    assert.equal((await tx.q("select 1 from public.audit_log")).length, 0, "journal fermé aux parties");
    assert.equal(await tx.fails("insert into public.audit_log (action) values ('faux')"), PERMISSION_OR_RLS);

    await tx.as("admin");
    assert.equal((await tx.res("update public.deal_steps set status = 'done' where deal_id = $1 and position = 1", [dealA.id])).rowCount, 1);
    const log = await tx.q("select details from public.audit_log where action = 'etape_modifiee' and deal_id = $1", [dealA.id]);
    assert.equal(log.length, 1);
    assert.equal(log[0].details.vers, "done");
  });
});

test("l'admin lit tout ; les paramètres de l'accord sont réservés à l'admin", async () => {
  await withTx(async (tx) => {
    await tx.as("admin");
    assert.equal((await tx.q("select 1 from public.questionnaire_responses")).length, 4);
    assert.equal((await tx.q("select 1 from public.documents")).length, 4);
    assert.equal((await tx.q("select 1 from public.deals")).length, 2);
    assert.equal((await tx.q("select 1 from public.deal_settings")).length, 2);
    await tx.as("mandat");
    assert.equal((await tx.q("select 1 from public.deal_settings")).length, 0);
    assert.equal((await tx.res("update public.deal_settings set duree_protection_mois = 12")).rowCount, 0);
  });
});

test("profils : chacun voit le sien, personne ne peut changer son rôle", async () => {
  await withTx(async (tx) => {
    await tx.as("mandat");
    assert.deepEqual((await tx.q("select id from public.profiles")).map((r) => r.id), [ids.mandat]);
    assert.equal(await tx.fails("update public.profiles set role = 'admin' where id = $1", [ids.mandat]), PERMISSION_OR_RLS);
    assert.equal(await tx.fails("insert into public.profiles (id, prenom, nom, role) values ($1,'a','b','admin')", [randomUUID()]), PERMISSION_OR_RLS);
    assert.equal(await tx.fails("insert into public.deal_members values ($1,$2,'partie_mandat')", [dealB.id, ids.mandat]), PERMISSION_OR_RLS);
  });
});

test("référence au format KR-AAAA-NNNN, unique ; create_deal réservé au serveur", async () => {
  assert.match(dealA.reference, /^KR-\d{4}-\d{4}$/);
  assert.notEqual(dealA.reference, dealB.reference);
  assert.equal(dealA.reference.slice(3, 7), String(new Date().getFullYear()));
  const steps = (await root.query("select status from public.deal_steps where deal_id = $1 order by position", [dealA.id])).rows;
  assert.equal(steps.length, 9);
  assert.equal(steps[0].status, "current");
  await withTx(async (tx) => {
    await tx.as("admin");
    assert.equal(await tx.fails("select public.create_deal($1)", [ids.admin]), PERMISSION_OR_RLS);
    await tx.as(null);
    assert.equal(await tx.fails("select public.create_deal($1)", [ids.admin]), PERMISSION_OR_RLS);
  });
});

test("le bucket « dossiers » est privé, limité à 20 Mo, sans accès direct pour les utilisateurs", async () => {
  const [b] = (await root.query("select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'dossiers'")).rows;
  assert.equal(b.public, false);
  assert.equal(Number(b.file_size_limit), 20971520);
  assert.equal(b.allowed_mime_types.length, 4);
  const pol = (await root.query("select 1 from pg_policies where schemaname = 'storage'")).rows;
  assert.equal(pol.length, 0, "aucune policy storage : accès uniquement par URL signée côté serveur");
});
