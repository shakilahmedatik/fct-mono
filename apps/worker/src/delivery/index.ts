import { emailDelivery } from "./email";
import { telegramDelivery } from "./telegram";
import type {
  AudioBriefDeliveryPayload,
  DeliveryChannel,
  DeliveryChannelAdapter,
  DeliveryResult,
  TextBriefDeliveryPayload,
} from "./types";

export * from "./email";
export * from "./telegram";
export * from "./types";

export class DeliveryChannelRegistry {
  private adapters = new Map<DeliveryChannel, DeliveryChannelAdapter>();

  constructor() {
    this.register(telegramDelivery);
    this.register(emailDelivery);
  }

  register(adapter: DeliveryChannelAdapter) {
    this.adapters.set(adapter.channel, adapter);
  }

  getAdapter(channel: DeliveryChannel): DeliveryChannelAdapter | undefined {
    return this.adapters.get(channel);
  }

  async dispatchAudio(
    channel: DeliveryChannel,
    payload: AudioBriefDeliveryPayload,
  ): Promise<DeliveryResult> {
    const adapter = this.getAdapter(channel);
    if (!adapter) {
      return {
        success: false,
        channel,
        errorMessage: `Delivery channel "${channel}" is not supported or not registered.`,
      };
    }
    return adapter.sendAudio(payload);
  }

  async dispatchText(
    channel: DeliveryChannel,
    payload: TextBriefDeliveryPayload,
  ): Promise<DeliveryResult> {
    const adapter = this.getAdapter(channel);
    if (!adapter) {
      return {
        success: false,
        channel,
        errorMessage: `Delivery channel "${channel}" is not supported or not registered.`,
      };
    }
    return adapter.sendText(payload);
  }
}

export const deliveryRegistry = new DeliveryChannelRegistry();
