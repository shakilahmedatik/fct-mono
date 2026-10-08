import { app } from "./app";
import { logger } from "./middleware/logger";

const port = Number(process.env.PORT) || 4000;

logger.info(`🚀 First Cup Tech API server listening on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};

export type { AppType } from "./app";
