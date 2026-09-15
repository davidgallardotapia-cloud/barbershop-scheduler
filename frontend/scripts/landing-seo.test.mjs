import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { landingSeo } from "../src/config/landingSeo.js";

const readDist = (file) => readFile(new URL(`../dist/${file}`, import.meta.url), "utf8");

test("built landing has unique SEO metadata and crawl files", async () => {
  const html = await readDist("index.html");
  assert.ok(html.includes(`<title>${landingSeo.title}</title>`));
  assert.ok(html.includes(landingSeo.description));
  for (const pattern of [/name="description"/g, /rel="canonical"/g, /property="og:title"/g]) {
    assert.equal([...html.matchAll(pattern)].length, 1);
  }
  const canonical = html.match(/rel="canonical" href="([^"]+)"/)[1];
  const sitemap = await readDist("sitemap.xml");
  assert.ok(sitemap.includes(`<loc>${canonical}/</loc>`));
  assert.equal([...sitemap.matchAll(/<loc>/g)].length, 1);
  assert.ok((await readDist("robots.txt")).includes(`Sitemap: ${canonical}/sitemap.xml`));
});

test("business pages keep their own titles and canonical URLs", async () => {
  for (const slug of ["giocata", "regencura", "urban-district-barber", "centro-ama"]) {
    const html = await readDist(`${slug}/index.html`);
    assert.ok(!html.includes(landingSeo.title), slug);
    assert.ok(!html.includes('data-prerendered="landing"'), slug);
    assert.ok(html.includes(`/${slug}" />`), slug);
    assert.equal([...html.matchAll(/name="description"/g)].length, 1, slug);
  }
});

test("landing is readable before JavaScript and fallback is isolated", async () => {
  const html = await readDist("index.html");
  assert.equal([...html.matchAll(/<h1\b/g)].length, 1);
  assert.ok(html.includes('href="/giocata"'));
  assert.ok(html.includes('href="/regencura"'));
  const schema = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  assert.equal(schema["@type"], "WebSite");
  assert.equal(schema.name, "AgendaSmart");
  const shell = await readDist("app-shell.html");
  assert.ok(shell.includes('<div id="root"></div>'));
  assert.ok(!shell.includes('rel="canonical"'));
  assert.ok(!shell.includes('application/ld+json'));
  const config = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
  assert.equal(config.rewrites.find(rule => rule.source === "/").destination, "/index.html");
  assert.equal(config.rewrites.at(-1).destination, "/app-shell.html");
});
