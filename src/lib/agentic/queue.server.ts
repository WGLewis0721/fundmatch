import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";

export type AgenticQueue = "agent_runs" | "embeddings";

export interface QueueMessage<T = Record<string, unknown>> {
  msgId: number;
  readCount: number;
  enqueuedAt: string;
  message: T;
}

/**
 * pgmq is deliberately not exposed through PostgREST (migration 0006). These
 * helpers call the narrow `agentic_queue_*` wrappers from 0008, which accept
 * only FundMatch's own queue names and are granted to the service role alone.
 *
 * The queue is delivery, not truth: `agent_runs` rows are the durable ledger, so
 * a database without pgmq installed still records and drains work.
 */
export async function queueAvailable(): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc("agentic_queue_available");
  if (error) throw new Error(`Queue availability check failed: ${error.message}`);
  return data === true;
}

export async function sendQueueMessage(
  queue: AgenticQueue,
  message: Record<string, Json>,
): Promise<number | null> {
  const { data, error } = await supabaseAdmin.rpc("agentic_queue_send", {
    _queue: queue,
    _message: message,
  });
  if (error) throw new Error(`Queue send failed: ${error.message}`);
  return data ?? null;
}

export async function readQueueMessages<T = Record<string, unknown>>(
  queue: AgenticQueue,
  options: { visibilitySeconds?: number; quantity?: number } = {},
): Promise<QueueMessage<T>[]> {
  const { data, error } = await supabaseAdmin.rpc("agentic_queue_read", {
    _queue: queue,
    _visibility_seconds: options.visibilitySeconds ?? 180,
    _quantity: options.quantity ?? 5,
  });
  if (error) throw new Error(`Queue read failed: ${error.message}`);
  return (data ?? []).map((row) => ({
    msgId: Number(row.msg_id),
    readCount: row.read_ct,
    enqueuedAt: row.enqueued_at,
    message: row.message as T,
  }));
}

/** Hands a message straight back so another worker can pick it up immediately. */
export async function releaseQueueMessage(queue: AgenticQueue, msgId: number): Promise<void> {
  const { error } = await supabaseAdmin.rpc("agentic_queue_release", {
    _queue: queue,
    _msg_id: msgId,
  });
  if (error) throw new Error(`Queue release failed: ${error.message}`);
}

/** Keeps the message as operational history instead of deleting it. */
export async function archiveQueueMessage(queue: AgenticQueue, msgId: number): Promise<void> {
  const { error } = await supabaseAdmin.rpc("agentic_queue_archive", {
    _queue: queue,
    _msg_id: msgId,
  });
  if (error) throw new Error(`Queue archive failed: ${error.message}`);
}
