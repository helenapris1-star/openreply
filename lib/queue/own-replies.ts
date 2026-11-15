import { getRedisConnection } from "./client";

// Public replies we post under a comment come back as new "comment" events.
// The commenter-id and username checks should already drop them, but those
// depend on what the provider reports. Remembering the id of every reply we
// post is an independent guard: a campaign set to "any word" can then never
// answer its own replies, whatever the provider says about the author.
const OWN_REPLY_TTL_SECONDS = 60 * 60 * 24 * 30;
const key = (commentId: string) => `openreply:own-reply:${commentId}`;

export async function rememberOwnReply(commentId: string | undefined): Promise<void> {
  if (!commentId) return;
  try {
    await getRedisConnection().set(key(commentId), "1", "EX", OWN_REPLY_TTL_SECONDS);
  } catch (error) {
    // Best effort: never let the guard break delivery.
    console.error("[DM Worker] Could not remember own reply id:", error instanceof Error ? error.message : error);
  }
}

export async function isOwnReply(commentId: string): Promise<boolean> {
  try {
    return (await getRedisConnection().exists(key(commentId))) === 1;
  } catch {
    return false;
  }
}
