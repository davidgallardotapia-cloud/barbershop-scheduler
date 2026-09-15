import React from "react";
import { renderToString } from "react-dom/server";
import { createServer } from "vite";

export async function renderLanding(root) {
  const server = await createServer({
    root,
    server: { middlewareMode: true, hmr: false },
    appType: "custom",
  });
  try {
    const { default: HomeLanding } = await server.ssrLoadModule("/src/components/HomeLanding.jsx");
    return renderToString(React.createElement(HomeLanding));
  } finally {
    await server.close();
  }
}
