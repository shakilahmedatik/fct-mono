import { zValidator } from "@hono/zod-validator";
import { digestQuerySchema, feedbackSchema } from "@repo/shared-types/validators";
import { Hono } from "hono";
import { authGuard } from "../../middleware/auth-guard";
import type { AppBindings } from "../../types";
import { digestService } from "./service";

export const digestRouter = new Hono<AppBindings>()
  .get("/public/latest", async (c) => {
    const digest = await digestService.getLatestMasterDigest();
    return c.json({ digest });
  })
  .use("*", authGuard)
  .get("/", zValidator("query", digestQuerySchema), async (c) => {
    const user = c.get("user");
    const query = c.req.valid("query");
    const digests = await digestService.getUserDigests(user.id, query.limit, query.offset);
    return c.json({ digests });
  })
  .get("/latest", async (c) => {
    const user = c.get("user");
    const latest = await digestService.getLatestDigest(user.id);
    return c.json({ digest: latest });
  })
  .get("/:id", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const digest = await digestService.getDigestById(id, user.id);
    return c.json({ digest });
  })
  .post("/:id/feedback", zValidator("json", feedbackSchema), async (c) => {
    const user = c.get("user");
    const digestId = c.req.param("id");
    const data = c.req.valid("json");
    const feedback = await digestService.submitFeedback(user.id, { ...data, digestId });
    return c.json({ feedback });
  })
  .post("/trigger", async (c) => {
    const user = c.get("user");
    const result = await digestService.triggerGeneration(user.id);
    return c.json(result);
  });
