import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  timestamps: number[];
}

// In-memory sliding window rate limiter per user ID
const userAiRateLimits = new Map<string, RateLimitRecord>();

const WINDOW_MS = 60 * 60 * 1000; // 1 hour window
const MAX_REQUESTS = 10; // Maximum 10 requests per window

export const aiRateLimiter = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const user = req.user;
  if (!user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required.',
    });
    return;
  }

  const userId = user._id.toString();
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  const record = userAiRateLimits.get(userId) || { timestamps: [] };

  // Filter timestamps within the active sliding window
  const activeTimestamps = record.timestamps.filter((ts) => ts > windowStart);

  if (activeTimestamps.length >= MAX_REQUESTS) {
    const oldestTimestamp = activeTimestamps[0];
    const resetTimeRemainingMinutes = Math.ceil(
      (oldestTimestamp + WINDOW_MS - now) / 60000
    );

    res.status(429).json({
      success: false,
      message: `AI summary request limit exceeded. Maximum ${MAX_REQUESTS} requests per hour allowed. Please try again in ${resetTimeRemainingMinutes} minute(s).`,
      limit: MAX_REQUESTS,
      remaining: 0,
      resetInMinutes: resetTimeRemainingMinutes,
    });
    return;
  }

  // Record this request timestamp and update map
  activeTimestamps.push(now);
  userAiRateLimits.set(userId, { timestamps: activeTimestamps });

  next();
};

// In-memory sliding window rate limiter per user ID for Workspace Summaries
const userWorkspaceAiRateLimits = new Map<string, RateLimitRecord>();
const WORKSPACE_MAX_REQUESTS = 5; // 5 analyses per user per hour for arbitrary uploads

export const workspaceAiRateLimiter = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const user = req.user;
  if (!user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required.',
    });
    return;
  }

  const userId = user._id.toString();
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  const record = userWorkspaceAiRateLimits.get(userId) || { timestamps: [] };

  // Filter timestamps within the active sliding window
  const activeTimestamps = record.timestamps.filter((ts) => ts > windowStart);

  if (activeTimestamps.length >= WORKSPACE_MAX_REQUESTS) {
    const oldestTimestamp = activeTimestamps[0];
    const resetTimeRemainingMinutes = Math.ceil(
      (oldestTimestamp + WINDOW_MS - now) / 60000
    );

    res.status(429).json({
      success: false,
      message: `Workspace AI analysis request limit exceeded. Maximum ${WORKSPACE_MAX_REQUESTS} requests per hour allowed. Please try again in ${resetTimeRemainingMinutes} minute(s).`,
      limit: WORKSPACE_MAX_REQUESTS,
      remaining: 0,
      resetInMinutes: resetTimeRemainingMinutes,
    });
    return;
  }

  // Record this request timestamp and update map
  activeTimestamps.push(now);
  userWorkspaceAiRateLimits.set(userId, { timestamps: activeTimestamps });

  next();
};

// Helper to reset rate limits in testing environments
export const _resetAiRateLimits = (): void => {
  userAiRateLimits.clear();
  userWorkspaceAiRateLimits.clear();
};

