import AiUsage from '../models/AiUsage.js';

export async function enforceAiQuota(req, res, next) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Bypass daily request limits during local development/testing
  if (process.env.NODE_ENV === 'development') {
    return next();
  }

  const userId = req.user.id;
  const isSandboxUser = userId === 'sandbox-scholar' || userId.startsWith('sandbox_');

  // Enforce daily limits: 15 for sandbox, 100 for standard users
  const dailyLimit = isSandboxUser ? 15 : 100;

  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const requestCount = await AiUsage.countDocuments({
      userId,
      timestamp: { $gt: twentyFourHoursAgo }
    });

    if (requestCount >= dailyLimit) {
      return res.status(429).json({
        error: `Daily AI usage limit reached (${requestCount}/${dailyLimit} requests). Please try again later or upgrade your plan.`,
        limitReached: true,
        limit: dailyLimit,
        count: requestCount
      });
    }

    // Register this request
    await AiUsage.create({ userId });
    next();
  } catch (error) {
    req.log?.error({ err: error, userId }, 'Quota checking failed');
    // Fail-open for safety if database lookup fails, but log the error
    next();
  }
}
