// UserUsageTracker.ts

export const userUsage: { [userId: string]: { count: number, lastReset: number } } = {}

// Daily limit configuration
export const DAILY_LIMIT = 5
export const ONE_DAY_MS = 24 * 60 * 60 * 1000

// Function to check and reset user's usage if a day has passed
export const checkAndResetUsage = (userId: string) => {
    const currentTime = Date.now()
    if (!userUsage[userId]) {
        userUsage[userId] = { count: 0, lastReset: currentTime }
    } else if (currentTime - userUsage[userId].lastReset > ONE_DAY_MS) {
        userUsage[userId] = { count: 0, lastReset: currentTime }
    }
}
