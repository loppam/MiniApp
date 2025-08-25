# Daily Bonus System Setup Guide

## Overview

The daily bonus system automatically awards holding bonuses to users based on their pTradoor balance. The bonus rate is **0.0001 points per pTradoor per day**.

## Components Implemented

### 1. Database Schema Updates

- Added `lastHoldingBonusDate` field to `UserProfile` to track when bonuses were last awarded
- This prevents duplicate daily bonuses

### 2. Trading System Enhancements

- **Transaction Counting**: Fixed issue where buy/sell transactions weren't incrementing `totalTransactions`
- **Balance Updates**: Enhanced balance tracking for buy/sell operations
- **Daily Bonus Logic**: Added proper date checking to prevent duplicate awards

### 3. API Endpoints

- **`/api/cron/daily-bonus`**: Vercel cron job endpoint (runs daily at 00:00 UTC)
- **Manual Trigger**: POST to `/api/cron/daily-bonus` with `{"action": "distribute"}`

### 4. Admin Panel Integration

- Added "Distribute Daily Bonus" button in admin panel for manual testing
- Shows results: users processed and total points awarded

## Vercel Cron Job Setup

### 1. Environment Variables

Add to your Vercel project:

```bash
CRON_SECRET=your-secret-key-here
```

### 2. Cron Job Configuration

The `vercel.json` file is already configured:

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-bonus",
      "schedule": "0 0 * * *"
    }
  ]
}
```

**Schedule**: `0 0 * * *` = Daily at 00:00 UTC

### 3. Deploy to Vercel

```bash
vercel --prod
```

## How It Works

### Daily Bonus Calculation

```typescript
const holdingBonus = Math.floor(
  profile.ptradoorBalance * 0.0001 // 0.0001 points per pTradoor per day
);
```

### Example

- User with 1000 pTradoor = 0.1 points per day
- User with 10000 pTradoor = 1 point per day
- User with 100000 pTradoor = 10 points per day

### Anti-Duplicate Protection

- Checks `lastHoldingBonusDate` before awarding
- Only awards once per 24-hour period
- Updates timestamp after successful award

## Testing

### Manual Testing

1. Go to `/admin` panel
2. Click "Distribute Daily Bonus" button
3. Check console logs for results

### API Testing

```bash
curl -X POST https://your-domain.vercel.app/api/cron/daily-bonus \
  -H "Content-Type: application/json" \
  -d '{"action": "distribute"}'
```

## Monitoring

### Logs to Watch

- `🕐 Daily bonus cron job triggered`
- `✅ Daily bonus distribution completed: {usersProcessed, totalBonusAwarded, errors}`
- `❌ Daily bonus cron job failed: {error}`

### Firestore Collections

- **Users**: Check `lastHoldingBonusDate` field updates
- **Transactions**: Look for `bonusType: "daily_holding"` entries
- **Platform Stats**: `totalPoints` should increase daily

## Troubleshooting

### Common Issues

1. **Cron job not running**: Check Vercel deployment and cron configuration
2. **No bonuses awarded**: Verify users have `ptradoorBalance > 0`
3. **Duplicate bonuses**: Check `lastHoldingBonusDate` logic
4. **Build errors**: Ensure all TypeScript types are properly imported

### Debug Steps

1. Check Vercel function logs
2. Verify environment variables
3. Test manual endpoint
4. Check Firestore data consistency

## Security

- Cron job requires `Authorization: Bearer {CRON_SECRET}` header
- Only Vercel's cron system should call the GET endpoint
- Manual triggers available for testing via POST endpoint
