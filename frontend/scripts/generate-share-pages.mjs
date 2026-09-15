import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { landingSeo } from "../src/config/landingSeo.js";
import { renderLanding } from "./prerender-landing.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, "../dist");
const siteUrl = (process.env.VITE_PUBLIC_SITE_URL || "https://agendasmart.cl")
  .replace(/\/+$/, "");

const sharePages = {
  "/": {
    ...landingSeo,
    image: "/agendasmart/agendasmart.png",
    imageWidth: 1254,
    imageHeight: 1254,
  },
  "/agendasmart-demo": {
    title: "AgendaSmart Demo | Prueba la plataforma",
    description:
      "Explora una agenda demo con reservas, pagos, clientes, reportes y disponibilidad online.",
    image: "/agendasmart/agendasmart.png",
    imageWidth: 1254,
    imageHeight: 1254,
  },
  "/odontologia-demo": {
    title: "Clinica Dental Demo | AgendaSmart",
    description:
      "Agenda online para atenciones odontologicas con profesionales, tramos horarios y servicios por duracion.",
    image: "/odontologia-demo/odontologia-demo-logo.png",
    imageWidth: 1254,
    imageHeight: 1254,
  },
  "/giocata": {
    title: "Canchas Giocata | Reserva online",
    description:
      "Reserva tu cancha online en La Serena de forma rapida y simple.",
    image: "/giocata/giocata-logo.png",
    imageWidth: 1254,
    imageHeight: 1254,
  },
  "/giocata/link": {
    title: "Canchas Giocata | Reserva online",
    description:
      "Reserva tu cancha, habla por WhatsApp o revisa la ubicacion de Centro Deportivo La Giocata.",
    image: "/giocata/giocata-logo.png",
    imageWidth: 1254,
    imageHeight: 1254,
  },
  "/l/giocata": {
    title: "Canchas Giocata | Reserva online",
    description:
      "Reserva tu cancha, habla por WhatsApp o revisa la ubicacion de Centro Deportivo La Giocata.",
    image: "/giocata/giocata-logo.png",
    imageWidth: 1254,
    imageHeight: 1254,
  },
  "/pinguino-club": {
    title: "Pinguino Club | Reserva online",
    description:
      "Reserva canchas y horarios disponibles de forma simple con AgendaSmart.",
    image: "/pinguino-club/pinguino-logo.jpg",
    imageWidth: 1080,
    imageHeight: 1080,
  },
  "/centro-ama": {
    title: "Centro AMA Salud Integral | Agenda online",
    description:
      "Agenda tu sesion de psicologia, kinesiologia o nutricion en Centro AMA Salud Integral.",
    image: "/centro-ama/centro-ama-logo.png",
    imageWidth: 1254,
    imageHeight: 1254,
  },
  "/regencura": {
    title: "Regencura | Curaciones Avanzadas",
    description:
      "Agenda atenciones de enfermeria y curaciones avanzadas con Leslie Bustos Fernandez.",
    image: "/regencura/regencura-logo.png",
    imageWidth: 1254,
    imageHeight: 1254,
  },
  "/regencura/link": {
    title: "Regencura | Curaciones Avanzadas",
    description:
      "Agenda tu atencion, habla por WhatsApp o revisa la ubicacion de Regencura.",
    image: "/regencura/regencura-logo.png",
    imageWidth: 1254,
    imageHeight: 1254,
  },
  "/l/regencura": {
    title: "Regencura | Curaciones Avanzadas",
    description:
      "Agenda tu atencion, habla por WhatsApp o revisa la ubicacion de Regencura.",
    image: "/regencura/regencura-logo.png",
    imageWidth: 1254,
    imageHeight: 1254,
  },
  "/urban-district-barber": {
    title: "Urban District Barber | Reserva online",
    description:
      "Agenda tu hora para cortes de cabello y barba profesionales.",
    image: "/urban-district-barber/logo-james.jpg",
    imageWidth: 1536,
    imageHeight: 1024,
  },
  "/urban-district-barber/link": {
    title: "Urban District Barber | Reserva online",
    description:
      "Agenda tu hora, habla por WhatsApp o revisa la ubicacion de Urban District Barber.",
    image: "/urban-district-barber/logo-james.jpg",
    imageWidth: 1536,
    imageHeight: 1024,
  },
  "/l/urban-district-barber": {
    title: "Urban District Barber | Reserva online",
    description:
      "Agenda tu hora, habla por WhatsApp o revisa la ubicacion de Urban District Barber.",
    image: "/urban-district-barber/logo-james.jpg",
    imageWidth: 1536,
    imageHeight: 1024,
  },
  "/barberia-junior": {
    title: "Barberia Junior | Reserva online",
    description:
      "Agenda tu hora de barberia de forma rapida y simple.",
    image: "/urban-district-barber/logo-james.jpg",
    imageWidth: 1536,
    imageHeight: 1024,
  },
};

const escapeHtml = (value) => {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
};

const removeExistingShareMeta = (html) => {
  return html
    .replace(/\s*<meta\s+(?:property|name)="(?:og|twitter):[^"]+"[^>]*>/gi, "")
    .replace(/\s*<meta\s+name="description"[^>]*>/gi, "")
    .replace(/\s*<link\s+rel="canonical"[^>]*>/gi, "");
};

const buildMetaTags = (routePath, meta) => {
  const canonicalUrl = `${siteUrl}${routePath === "/" ? "" : routePath}`;
  const imageUrl = `${siteUrl}${meta.image}`;
  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);
  const imageAlt = escapeHtml(`${meta.title} logo`);

  return [
    `<link rel="canonical" href="${canonicalUrl}" />`,
    `<meta name="description" content="${description}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="AgendaSmart" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${canonicalUrl}" />`,
    `<meta property="og:image" content="${imageUrl}" />`,
    `<meta property="og:image:secure_url" content="${imageUrl}" />`,
    `<meta property="og:image:width" content="${meta.imageWidth}" />`,
    `<meta property="og:image:height" content="${meta.imageHeight}" />`,
    `<meta property="og:image:alt" content="${imageAlt}" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    `<meta name="twitter:image" content="${imageUrl}" />`,
  ].join("\n    ");
};

const injectShareMeta = (html, routePath, meta) => {
  const cleanHtml = removeExistingShareMeta(html)
    .replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(meta.title)}</title>`);

  return cleanHtml.replace(
    "</head>",
    `    ${buildMetaTags(routePath, meta)}\n  </head>`
  );
};

const writeSharePage = async (routePath, html) => {
  if (routePath === "/") {
    const content = await renderLanding(path.resolve(__dirname, ".."));
    const schema = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "AgendaSmart",
      url: `${siteUrl}/`,
      inLanguage: "es-CL",
    }).replace(/</g, "\\u003c");
    html = html.replace('<div id="root"></div>', `<div id="root" data-prerendered="landing">${content}</div>`)
      .replace("</head>", `<script type="application/ld+json">${schema}</script>\n</head>`);
    await writeFile(path.join(distDir, "index.html"), html);
    return;
  }

  const routeDir = path.join(distDir, routePath.replace(/^\/+/, ""));
  await mkdir(routeDir, { recursive: true });
  await writeFile(path.join(routeDir, "index.html"), html);
};

const baseHtml = await readFile(path.join(distDir, "index.html"), "utf8");
// Unknown/new business routes must not inherit the landing content or canonical.
await writeFile(path.join(distDir, "app-shell.html"), baseHtml);

await Promise.all(
  Object.entries(sharePages).map(async ([routePath, meta]) => {
    await writeSharePage(routePath, injectShareMeta(baseHtml, routePath, meta));
  })
);

// Start with the landing only; business pages are outside this SEO rollout.
await writeFile(path.join(distDir, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${escapeHtml(siteUrl)}/</loc></url></urlset>\n`
);
await writeFile(path.join(distDir, "robots.txt"),
  `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`
);

console.log(
  `Generated ${Object.keys(sharePages).length} AgendaSmart share pages.`
);
