import express from "express";
import cors from "cors";

import { env } from "./config/env.js";

import documentRoutes
  from "./modules/documents/routes.js";

import authRoutes from "./modules/auth/routes.js";
import testRoutes from "./modules/tests/routes.js";

import questionRoutes
  from "./modules/questions/routes.js";

import configurationRoutes
  from "./modules/configurations/routes.js";

import publicRoutes
  from "./modules/public/routes.js";

import participantRoutes
  from "./modules/participants/routes.js";

import attemptRoutes
  from "./modules/attempts/routes.js";

import resultsRoutes
  from "./modules/results/routes.js";

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: env.clientUrl
  })
);

app.use(
  "/api",
  questionRoutes
);

app.use(
  "/api",
  configurationRoutes
);

app.use(
  "/api",
  publicRoutes
);

app.use(
  "/api",
  participantRoutes
);

app.use(
  "/api",
  attemptRoutes
);

app.use(
  "/api",
  resultsRoutes
);

app.use(
  "/api",
  documentRoutes
);

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "assessment-platform-api",
    version: "v1"
  });
});

app.use("/api/auth", authRoutes);

app.use("/api/tests", testRoutes);

app.listen(env.port, () => {
  console.log(
    `V1 API running on http://localhost:${env.port}`
  );
});