import { buildServer } from "./app.js";

const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? "0.0.0.0";
const rawCors = process.env.CORS_ORIGIN?.trim();
// Unset or "*" = allow any origin; otherwise a comma-separated list of exact origins.
const corsOrigin = !rawCors || rawCors === "*" ? true : rawCors.split(",").map((o) => o.trim().replace(/\/$/, ""));

const { app } = buildServer({ corsOrigin, logger: true });

app.listen({ port, host }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
