import { getStore } from "@netlify/blobs";

const STORE_NAME = "goblers-knob-2026-live-book";
const BOOK_KEY = "book";
const ADMIN_CODE = process.env.ADMIN_CODE || "benson2026";

const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"
};

const players = [
  { name: "ABA", baseOdds: 3.6638077705 },
  { name: "Dermo", baseOdds: 4.7833045893 },
  { name: "Boral", baseOdds: 6.1063462842 },
  { name: "Hasha", baseOdds: 7.1240706649 },
  { name: "Big Bitch", baseOdds: 7.6330000000 },
  { name: "Simmo", baseOdds: 8.1417950450 },
  { name: "MOS", baseOdds: 10.6869476641 },
  { name: "Duff", baseOdds: 13.2305812963 },
  { name: "Little Jimmy", baseOdds: 13.2305812963 },
  { name: "Prince Andy", baseOdds: 15.2658655418 },
  { name: "John", baseOdds: 39.3866502633 },
  { name: "Wow", baseOdds: 41.0000000000 }
];

const seedBets = [
  { bettor:"Wow", selection:"Simmo", stake:50, odds:12, notes:"Loaded bet", marketCount:false },
  { bettor:"ABA", selection:"Hasha", stake:50, odds:11, notes:"Loaded bet", marketCount:false },
  { bettor:"ABA", selection:"ABA", stake:200, odds:3.4, notes:"Loaded bet", marketCount:false },
  { bettor:"ABA", selection:"Boral", stake:50, odds:5.5, notes:"Loaded bet. Boris treated as Boral.", marketCount:false },
  { bettor:"Big Bitch", selection:"Big Bitch", stake:50, odds:7, notes:"Loaded bet", marketCount:false },
  { bettor:"Big Bitch", selection:"Simmo", stake:50, odds:12, notes:"Loaded bet", marketCount:false },
  { bettor:"MOS", selection:"MOS", stake:50, odds:8.5, notes:"Loaded bet", marketCount:false },
  { bettor:"Little Jimmy", selection:"Little Jimmy", stake:50, odds:18, notes:"Loaded bet", marketCount:false },
  { bettor:"Duff", selection:"Duff", stake:50, odds:15, notes:"Loaded bet. Duff handicap 15.", marketCount:false },
  { bettor:"Duff", selection:"Hasha", stake:50, odds:11, notes:"Loaded bet", marketCount:false },
  { bettor:"Duff", selection:"Big Bitch", stake:50, odds:7, notes:"Loaded bet", marketCount:false },
  { bettor:"Little Jimmy", selection:"Dermo", stake:20, odds:4, notes:"Loaded bet", marketCount:false },
  { bettor:"Hasha", selection:"Hasha", stake:50, odds:8, notes:"Loaded bet at $8", marketCount:false },
  { bettor:"Boral", selection:"Boral", stake:40, odds:5.5, notes:"Loaded bet", marketCount:false },
  { bettor:"Boral", selection:"John", stake:10, odds:34, notes:"Loaded bet. Jon treated as John.", marketCount:false }
];

function defaultBook() {
  return {
    players,
    settings: { targetPct: 140, sensitivity: 250, freeCredit: 50 },
    bets: seedBets.map((b, i) => ({
      id: `seed_${i}`,
      created: "loaded",
      bettor: b.bettor,
      selection: b.selection,
      stake: b.stake,
      odds: b.odds,
      notes: b.notes,
      marketCount: b.marketCount
    })),
    updatedAt: new Date().toISOString(),
    version: 1
  };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers });
}

function cleanName(value) {
  return String(value || "").trim();
}

function validPlayer(name, book) {
  return book.players.some(p => p.name === name);
}

function calcOddsMap(book) {
  const target = Number(book.settings?.targetPct || 140) / 100;
  const sens = Math.max(50, Number(book.settings?.sensitivity || 250));
  const newStake = {};
  for (const b of book.bets || []) {
    if (b.marketCount) newStake[b.selection] = (newStake[b.selection] || 0) + Number(b.stake || 0);
  }
  const raw = [];
  let totalRaw = 0;
  for (const p of book.players) {
    const r = (1 / Number(p.baseOdds)) * (1 + ((newStake[p.name] || 0) / sens));
    raw.push({ name: p.name, r });
    totalRaw += r;
  }
  const out = {};
  for (const item of raw) {
    out[item.name] = 1 / (item.r * target / totalRaw);
  }
  return out;
}

function calcSummary(book) {
  const odds = calcOddsMap(book);
  let bookSize = 0;
  const exposure = {};
  const stakeByBettor = {};
  for (const p of book.players) {
    exposure[p.name] = 0;
    stakeByBettor[p.name] = 0;
  }
  for (const b of book.bets || []) {
    const stake = Number(b.stake || 0);
    const locked = Number(b.odds || 0);
    bookSize += stake;
    exposure[b.selection] = (exposure[b.selection] || 0) + stake * locked;
    stakeByBettor[b.bettor] = (stakeByBettor[b.bettor] || 0) + stake;
  }
  const results = book.players.map(p => ({ name: p.name, exposure: exposure[p.name] || 0, net: bookSize - (exposure[p.name] || 0) }));
  const freeCredit = Number(book.settings?.freeCredit || 50);
  const owe = book.players.map(p => {
    const stake = stakeByBettor[p.name] || 0;
    return { name: p.name, stake, credit: freeCredit, owing: Math.max(0, stake - freeCredit) };
  });
  return { odds, bookSize, exposure, results, owe, totalOwing: owe.reduce((s, r) => s + r.owing, 0) };
}

async function getStoreStrong() {
  return getStore({ name: STORE_NAME, consistency: "strong" });
}

async function readBook() {
  const store = await getStoreStrong();
  const existing = await store.get(BOOK_KEY, { type: "json", consistency: "strong" });
  if (existing) return existing;
  const seed = defaultBook();
  await store.setJSON(BOOK_KEY, seed);
  return seed;
}

async function mutateBook(mutator) {
  const store = await getStoreStrong();
  for (let attempt = 0; attempt < 4; attempt++) {
    const entry = await store.getWithMetadata(BOOK_KEY, { type: "json", consistency: "strong" });
    const current = entry?.data || defaultBook();
    const next = await mutator(current);
    next.updatedAt = new Date().toISOString();
    next.version = Number(next.version || 0) + 1;
    const opts = entry?.etag ? { onlyIfMatch: entry.etag } : { onlyIfNew: true };
    const result = await store.setJSON(BOOK_KEY, next, opts);
    if (result.modified) return next;
  }
  throw new Error("The book changed at the same time. Please retry.");
}

function assertAdmin(body) {
  if (!body || String(body.adminCode || "") !== ADMIN_CODE) {
    const err = new Error("Bad admin code.");
    err.status = 403;
    throw err;
  }
}

export default async function handler(req) {
  if (req.method === "OPTIONS") return new Response("", { headers });
  try {
    if (req.method === "GET") {
      const book = await readBook();
      return json({ ok: true, book, summary: calcSummary(book), serverTime: new Date().toISOString() });
    }
    if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");

    if (action === "addBet") {
      assertAdmin(body);
      const updated = await mutateBook(book => {
        const bettor = cleanName(body.bettor);
        const selection = cleanName(body.selection);
        const stake = Number(body.stake || 0);
        if (!validPlayer(bettor, book)) throw Object.assign(new Error("Invalid bettor."), { status: 400 });
        if (!validPlayer(selection, book)) throw Object.assign(new Error("Invalid selection."), { status: 400 });
        if (!Number.isFinite(stake) || stake <= 0) throw Object.assign(new Error("Invalid stake."), { status: 400 });
        const oddsMap = calcOddsMap(book);
        const manualOdds = Number(body.odds || 0);
        const locked = manualOdds > 1 ? manualOdds : oddsMap[selection];
        book.bets.push({
          id: `bet_${Date.now()}_${crypto.randomUUID()}`,
          created: new Date().toISOString(),
          bettor,
          selection,
          stake,
          odds: Number(Number(locked).toFixed(4)),
          notes: String(body.notes || "").slice(0, 300),
          marketCount: true
        });
        return book;
      });
      return json({ ok: true, book: updated, summary: calcSummary(updated) });
    }

    if (action === "deleteBet") {
      assertAdmin(body);
      const id = String(body.id || "");
      const updated = await mutateBook(book => {
        book.bets = (book.bets || []).filter(b => b.id !== id);
        return book;
      });
      return json({ ok: true, book: updated, summary: calcSummary(updated) });
    }

    if (action === "saveSettings") {
      assertAdmin(body);
      const updated = await mutateBook(book => {
        const targetPct = Number(body.targetPct || book.settings.targetPct || 140);
        const sensitivity = Number(body.sensitivity || book.settings.sensitivity || 250);
        const freeCredit = Number(body.freeCredit || book.settings.freeCredit || 50);
        book.settings = {
          targetPct: Math.max(100, targetPct),
          sensitivity: Math.max(50, sensitivity),
          freeCredit: Math.max(0, freeCredit)
        };
        return book;
      });
      return json({ ok: true, book: updated, summary: calcSummary(updated) });
    }

    if (action === "reset") {
      assertAdmin(body);
      const updated = await mutateBook(() => defaultBook());
      return json({ ok: true, book: updated, summary: calcSummary(updated) });
    }

    return json({ ok: false, error: "Unknown action." }, 400);
  } catch (err) {
    return json({ ok: false, error: err.message || "Server error" }, err.status || 500);
  }
}
