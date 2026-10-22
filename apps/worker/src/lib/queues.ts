import { getQueue, PIPELINE_QUEUE_NAMES } from "@repo/pipeline/stages";

/**
 * The queue names are defined once in the pipeline package so that the
 * producer (the pipeline stages) and the consumers (the workers) can never
 * drift apart.
 */
export const QUEUES = PIPELINE_QUEUE_NAMES;

export const digestQueue = getQueue(QUEUES.DIGEST_PIPELINE);
export const audioQueue = getQueue(QUEUES.AUDIO_GENERATION);
export const deliveryQueue = getQueue(QUEUES.TELEGRAM_DELIVERY);
export const emailQueue = getQueue(QUEUES.EMAIL_DELIVERY);
