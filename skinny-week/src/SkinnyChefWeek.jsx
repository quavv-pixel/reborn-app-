import React, { useState, useEffect, useMemo } from "react";
import { RefreshCw, Check, Copy, ShoppingCart, BookOpen, Loader2 } from "lucide-react";
import { BOOK } from "./book";
import {
  weekIndex,
  weekLabel,
  pickOptions,
  buildList,
  claudeMessage,
  hasWrapped,
  toInstacartLineItems,
  instacartTitle,
} from "./rotation";

const C = {
  paper: "#EFEDE6",
  card: "#FBFAF6",
  ink: "#16233A",
  inkSoft: "#4A5566",
  rule: "#CFCCC2",
  orange: "#F0531C",
  blue: "#0A72B8",
  red: "#CE1B24",
};

const mono = "'IBM Plex Mono', ui-monospace, monospace";
const body = "'IBM Plex Sans', system-ui, sans-serif";
const display = "'Archivo Black', 'Arial Black', sans-serif";

// localStorage, not the artifact `window.storage` shim — this is what actually
// persists on a real domain. Wrapped because Safari private mode throws on
// access rather than returning null.
const STORE_KEY = "skinny-week:cooked-pages";
const STORE_AREA = "skinny-week:store";

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota or private mode — the session still works, it just won't persist */
  }
}

export default function SkinnyChefWeek() {
  const [store, setStore] = useState("Lansing, MI");
  const [deals, setDeals] = useState([]);
  const [dealsState, setDealsState] = useState("idle");
  const [dealsMsg, setDealsMsg] = useState("");
  const [picked, setPicked] = useState([]);
  const [cooked, setCooked] = useState([]);
  const [copied, setCopied] = useState(false);
  const [ready, setReady] = useState(false);
  const [cartBusy, setCartBusy] = useState(false);
  const [cartMsg, setCartMsg] = useState("");

  useEffect(() => {
    const saved = readJSON(STORE_KEY, []);
    setCooked(Array.isArray(saved) ? saved.filter(n => typeof n === "number") : []);
    const savedStore = readJSON(STORE_AREA, null);
    if (typeof savedStore === "string" && savedStore) setStore(savedStore);
    setReady(true);
  }, []);

  const wi = weekIndex();
  const options = useMemo(() => pickOptions(BOOK, wi, cooked), [wi, cooked]);
  const list = useMemo(() => buildList(BOOK, picked), [picked]);
  const wrapped = ready && hasWrapped(BOOK, cooked);

  async function loadDeals() {
    setDealsState("loading");
    setDealsMsg("");
    writeJSON(STORE_AREA, store);
    try {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setDealsState("error");
        setDealsMsg(data?.message || data?.error || `Request failed (${res.status}).`);
        return;
      }
      const found = Array.isArray(data?.deals) ? data.deals : [];
      setDeals(found);
      setDealsState(found.length ? "done" : "empty");
    } catch {
      setDealsState("error");
      setDealsMsg("Couldn't reach the ad. Try again in a moment.");
    }
  }

  function markCooked() {
    const next = [...new Set([...cooked, ...picked])];
    setCooked(next);
    setPicked([]);
    writeJSON(STORE_KEY, next);
  }

  function resetCooked() {
    setCooked([]);
    setPicked([]);
    writeJSON(STORE_KEY, []);
  }

  async function copyForClaude() {
    const msg = claudeMessage(BOOK, picked);
    try {
      await navigator.clipboard.writeText(msg);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard is blocked outside a secure context and in some in-app
      // browsers. Fall back to a prompt the user can copy out of by hand.
      window.prompt("Copy this and paste it to Claude:", msg);
    }
  }

  // Hands the list to /api/instacart, which asks Instacart for a shopping list
  // page and returns its URL. On a phone that URL opens the Instacart app with
  // the list loaded. Push-only — nothing is read back from your account.
  async function openInInstacart() {
    if (!picked.length) return;
    setCartBusy(true);
    setCartMsg("");
    try {
      const res = await fetch("/api/instacart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: instacartTitle(BOOK, picked),
          line_items: toInstacartLineItems(BOOK, picked),
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.url) {
        window.open(data.url, "_blank", "noopener");
      } else {
        setCartMsg(data?.message || data?.error || `Instacart request failed (${res.status}).`);
      }
    } catch {
      setCartMsg("Couldn't reach Instacart. Are you online?");
    } finally {
      setCartBusy(false);
    }
  }

  const toggle = pg =>
    setPicked(p => (p.includes(pg) ? p.filter(x => x !== pg) : [...p, pg]));

  return (
    <div style={{ background: C.paper, fontFamily: body, color: C.ink, minHeight: "100%" }}>
      <div className="mx-auto max-w-2xl px-5 py-7">
        {/* Masthead */}
        <div className="flex items-end justify-between border-b-4 pb-3" style={{ borderColor: C.ink }}>
          <div>
            <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: ".14em", color: C.inkSoft }}>
              WEEK OF {weekLabel().toUpperCase()}
            </div>
            <h1 style={{ fontFamily: display, fontSize: 30, lineHeight: 1.02, marginTop: 4 }}>
              THREE DINNERS,
              <br />
              ONE SHOP
            </h1>
          </div>
          <div
            style={{
              fontFamily: mono,
              fontSize: 10,
              letterSpacing: ".1em",
              background: C.ink,
              color: C.paper,
              padding: "5px 8px",
            }}
          >
            ALDI
          </div>
        </div>

        {/* Deals */}
        <section className="mt-7">
          <div className="flex items-center justify-between">
            <h2 style={{ fontFamily: display, fontSize: 15, letterSpacing: ".02em" }}>ON SALE NOW</h2>
            <div className="flex items-center gap-2">
              <input
                value={store}
                onChange={e => setStore(e.target.value)}
                aria-label="Store area"
                style={{
                  fontFamily: mono,
                  fontSize: 11,
                  background: "transparent",
                  borderBottom: `1px solid ${C.rule}`,
                  width: 96,
                  padding: "2px 0",
                  outline: "none",
                }}
              />
              <button
                onClick={loadDeals}
                disabled={dealsState === "loading"}
                className="flex items-center gap-1 px-2 py-1"
                style={{ fontFamily: mono, fontSize: 11, background: C.ink, color: C.paper }}
              >
                {dealsState === "loading" ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <RefreshCw size={11} />
                )}
                CHECK
              </button>
            </div>
          </div>

          {dealsState === "idle" && (
            <p className="mt-3" style={{ fontSize: 13, color: C.inkSoft }}>
              Tap check to search this week's Aldi ad for your area. Each check costs a little
              API usage.
            </p>
          )}
          {dealsState === "loading" && (
            <p className="mt-3" style={{ fontSize: 13, color: C.inkSoft }}>
              Searching the ad — this takes a few seconds.
            </p>
          )}
          {dealsState === "error" && (
            <p className="mt-3" style={{ fontSize: 13, color: C.red }}>
              {dealsMsg || "Couldn't reach the ad. Try again in a moment."}
            </p>
          )}
          {dealsState === "empty" && (
            <p className="mt-3" style={{ fontSize: 13, color: C.inkSoft }}>
              No specials found for that area this week.
            </p>
          )}

          {deals.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {deals.map((d, i) => (
                <div
                  key={i}
                  className="p-3"
                  style={{ background: C.card, borderLeft: `4px solid ${C.orange}` }}
                >
                  <div style={{ fontFamily: mono, fontSize: 17, color: C.red }}>{d.price}</div>
                  <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.25, marginTop: 2 }}>
                    {d.item}
                  </div>
                  {d.note && (
                    <div style={{ fontFamily: mono, fontSize: 10, color: C.inkSoft, marginTop: 3 }}>
                      {d.note}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recipe picks */}
        <section className="mt-8">
          <h2 style={{ fontFamily: display, fontSize: 15 }}>PICK YOUR THREE</h2>
          <p style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 3 }}>
            From your copy of Trust The Skinny Chef. Cook the page, not the card.
          </p>

          {wrapped && (
            <p style={{ fontSize: 12.5, color: C.orange, marginTop: 6 }}>
              You've cooked your way through the book — the rotation has started over.{" "}
              <button onClick={resetCooked} style={{ textDecoration: "underline" }}>
                Clear the record
              </button>
              .
            </p>
          )}

          <div className="mt-4 space-y-2">
            {options.map(r => {
              const on = picked.includes(r.p);
              return (
                <button
                  key={r.p}
                  onClick={() => toggle(r.p)}
                  className="w-full text-left p-4 flex items-start gap-3"
                  style={{
                    background: on ? C.ink : C.card,
                    color: on ? C.paper : C.ink,
                    border: `1px solid ${on ? C.ink : C.rule}`,
                    transition: "background 140ms ease",
                  }}
                >
                  <div
                    className="flex items-center justify-center shrink-0"
                    style={{
                      width: 20,
                      height: 20,
                      marginTop: 2,
                      background: on ? C.orange : "transparent",
                      border: `1.5px solid ${on ? C.orange : C.rule}`,
                    }}
                  >
                    {on && <Check size={13} color="#fff" strokeWidth={3} />}
                  </div>
                  <div className="min-w-0">
                    <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.25 }}>{r.t}</div>
                    <div
                      style={{
                        fontFamily: mono,
                        fontSize: 11,
                        marginTop: 4,
                        color: on ? "#B9C2CF" : C.inkSoft,
                        letterSpacing: ".05em",
                      }}
                    >
                      PAGE {r.p} · {r.tag.toUpperCase()} · {r.items.length} ITEMS
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Shopping list */}
        <section className="mt-8">
          <h2 style={{ fontFamily: display, fontSize: 15 }}>SHOPPING LIST</h2>
          {list.length === 0 ? (
            <p style={{ fontSize: 13, color: C.inkSoft, marginTop: 8 }}>
              Pick a recipe above and the list builds itself.
            </p>
          ) : (
            <div className="mt-3" style={{ background: C.card, padding: "6px 14px" }}>
              {list.map(([item, n]) => (
                <div
                  key={item}
                  className="flex items-baseline justify-between py-2"
                  style={{ borderBottom: `1px solid ${C.rule}`, fontSize: 14 }}
                >
                  <span className="capitalize">{item}</span>
                  <span style={{ fontFamily: mono, fontSize: 12, color: n > 1 ? C.orange : C.inkSoft }}>
                    {n > 1 ? `×${n} recipes` : "1"}
                  </span>
                </div>
              ))}
            </div>
          )}

          {list.length > 0 && (
            <>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={openInInstacart}
                  disabled={cartBusy}
                  className="flex items-center gap-2 px-4 py-3"
                  style={{ background: C.orange, color: "#fff", fontSize: 13.5, fontWeight: 600 }}
                >
                  {cartBusy ? <Loader2 size={15} className="animate-spin" /> : <ShoppingCart size={15} />}
                  {cartBusy ? "Opening…" : "Open in Instacart"}
                </button>
                <button
                  onClick={copyForClaude}
                  className="flex items-center gap-2 px-4 py-3"
                  style={{ background: "transparent", border: `1px solid ${C.ink}`, fontSize: 13.5 }}
                >
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                  {copied ? "Copied — paste it to Claude" : "Copy for Claude"}
                </button>
                <button
                  onClick={markCooked}
                  className="flex items-center gap-2 px-4 py-3"
                  style={{ background: "transparent", border: `1px solid ${C.ink}`, fontSize: 13.5 }}
                >
                  <BookOpen size={15} />
                  Mark cooked
                </button>
              </div>

              {cartMsg && (
                <p className="mt-3" style={{ fontSize: 12.5, color: C.red }}>{cartMsg}</p>
              )}
              <p className="mt-3" style={{ fontSize: 12, color: C.inkSoft, lineHeight: 1.4 }}>
                Instacart opens a shopping list page with these items — it can't see what's
                already in your cart. Needs a key on the server; until then use Copy for Claude.
              </p>
            </>
          )}
        </section>

        <footer
          className="mt-9 pt-4 flex items-center gap-2"
          style={{ borderTop: `1px solid ${C.rule}`, fontFamily: mono, fontSize: 10.5, color: C.inkSoft, letterSpacing: ".06em" }}
        >
          <ShoppingCart size={12} />
          {ready ? `${cooked.length} OF ${BOOK.length} RECIPES COOKED` : "LOADING ROTATION"}
        </footer>
      </div>
    </div>
  );
}
