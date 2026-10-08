import { Hono } from "hono";
import { deliveryService } from "./service";

export const deliveryRouter = new Hono().post("/telegram/webhook", async (c) => {
  const update = await c.req.json();
  const res = await deliveryService.handleTelegramWebhook(update);
  return c.json(res);
});
