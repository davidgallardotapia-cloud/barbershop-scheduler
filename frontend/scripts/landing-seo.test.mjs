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
  for (const slug of ["giocata", "vitalcure", "urban-district-barber", "centro-ama"]) {
    const html = await readDist(`${slug}/index.html`);
    assert.ok(!html.includes(landingSeo.title), slug);
    assert.ok(!html.includes('data-prerendered="landing"'), slug);
    assert.ok(html.includes(`/${slug}" />`), slug);
    assert.equal([...html.matchAll(/name="description"/g)].length, 1, slug);
  }
});

test("VitalCure link previews use the padded square image without changing the website logo", async () => {
  const imagePath = "/vitalcure/vitalcure-share-v3.jpg";
  for (const route of ["vitalcure", "vitalcure/link", "l/vitalcure"]) {
    const html = await readDist(`${route}/index.html`);
    const ogImage = html.match(/property="og:image" content="([^"]+)"/)[1];
    assert.equal(new URL(ogImage).pathname, imagePath, route);
    assert.ok(html.includes(`property="og:image:secure_url" content="${ogImage}"`), route);
    assert.ok(html.includes(`name="twitter:image" content="${ogImage}"`), route);
    assert.ok(html.includes('property="og:image:width" content="1254"'), route);
    assert.ok(html.includes('property="og:image:height" content="1254"'), route);
    assert.equal([...html.matchAll(/property="og:image"/g)].length, 1, route);
  }
  const image = await readFile(new URL(`../dist${imagePath}`, import.meta.url));
  assert.ok(image.length > 0 && image.length < 300_000, "share image stays lightweight");
  assert.deepEqual(
    await readFile(new URL("../dist/vitalcure/vitalcure-logo.jpg", import.meta.url)),
    await readFile(new URL("../public/vitalcure/vitalcure-logo.jpg", import.meta.url)),
    "the website still serves the original logo"
  );
});

test("landing is readable before JavaScript and fallback is isolated", async () => {
  const html = await readDist("index.html");
  assert.equal([...html.matchAll(/<h1\b/g)].length, 1);
  assert.ok(html.includes('href="/giocata"'));
  assert.ok(html.includes('href="/vitalcure"'));
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

test("legacy clinic URLs redirect to VitalCure and preserve the booking destination", async () => {
  const config = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
  for (const [source, destination] of [
    ["/regencura", "/vitalcure"],
    ["/regencura/link", "/vitalcure/link"],
    ["/l/regencura", "/l/vitalcure"],
    ["/eu-curaciones-avanzadas", "/vitalcure"],
    ["/l/eu-curaciones-avanzadas", "/l/vitalcure"],
  ]) {
    const rule = config.redirects.find(rule => rule.source === source);
    assert.equal(rule?.destination, destination, source);
    assert.equal(rule?.permanent, true, source);
  }
  assert.ok(config.rewrites.some(rule => rule.source === "/vitalcure"));
});
