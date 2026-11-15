import { beforeEach, describe, expect, it, vi } from 'vitest';

const redis = vi.hoisted(() => ({ set: vi.fn(), exists: vi.fn() }));
vi.mock('@/lib/queue/client', () => ({ getRedisConnection: () => redis }));

import { isOwnReply, rememberOwnReply } from '@/lib/queue/own-replies';

describe('own reply guard', () => {
  beforeEach(() => { redis.set.mockReset(); redis.exists.mockReset(); });

  it('remembers the id of a posted reply with an expiry', async () => {
    await rememberOwnReply('reply1');
    expect(redis.set).toHaveBeenCalledWith('openreply:own-reply:reply1', '1', 'EX', 60 * 60 * 24 * 30);
  });
  it('ignores a missing reply id', async () => {
    await rememberOwnReply(undefined);
    expect(redis.set).not.toHaveBeenCalled();
  });
  it('recognises remembered replies and lets other comments through', async () => {
    redis.exists.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    expect(await isOwnReply('reply1')).toBe(true);
    expect(await isOwnReply('someone-else')).toBe(false);
  });
  it('never blocks delivery when Redis fails', async () => {
    redis.set.mockRejectedValueOnce(new Error('down'));
    redis.exists.mockRejectedValueOnce(new Error('down'));
    await expect(rememberOwnReply('reply1')).resolves.toBeUndefined();
    expect(await isOwnReply('reply1')).toBe(false);
  });
});
