# 🔥 Firebase Firestore Setup for Tradoor App

This guide will help you set up Firebase Firestore as the backend for your Tradoor app, including secure wallet-based authentication.

## 📋 Prerequisites

- Node.js 18+ installed
- Firebase account
- Vercel account (for deployment)

## 🚀 Quick Setup

### 1. **Create Firebase Project:**

- Go to [Firebase Console](https://console.firebase.google.com/)
- Click "Add project"
- Name it "tradoor-app" (or your preferred name)
- Enable Google Analytics (optional)
- Click "Create project"

### 2. **Enable Firestore Database:**

- In your Firebase project, go to "Firestore Database"
- Click "Create database"
- Choose "Start in test mode" for development
- Select a location (choose closest to your users)
- Click "Done"

### 3. **Get Firebase Configuration:**

- Go to Project Settings (gear icon)
- Scroll down to "Your apps"
- Click "Add app" → Web app
- Register app with nickname "tradoor-web"
- Copy the config object

### 4. **Set Environment Variables:**

Create a `.env.local` file in your project root:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# App Configuration
NEXT_PUBLIC_URL=http://localhost:3000
```

### 5. **Install Firebase CLI:**

```bash
npm install -g firebase-tools
```

### 6. **Login to Firebase:**

```bash
firebase login
```

### 7. **Initialize Firebase in your project:**

```bash
firebase init firestore
```

### 8. **Deploy Firestore Rules:**

```bash
firebase deploy --only firestore:rules
```

## 🔐 Security Implementation

### **Secure Backend Architecture**

The app uses a **secure backend API** with wallet signature verification:

1. **Frontend**: User signs a message with their wallet
2. **Backend**: Verifies the signature and performs Firestore writes
3. **Firestore**: Only allows reads from clients, writes only from backend

### **How It Works**

1. **Wallet Connection:** User connects wallet via Warpcast
2. **Base Chain Check:** System queries Base chain for user's transaction history
3. **Point Calculation:**
   - 1 point per transaction
   - 0.0001 points per gas unit used
   - 10 points per ETH value (capped at 1000 total initial points)
4. **Secure Writes:** All Firestore writes go through `/api/firestore-proxy` with signature verification

### **Security Features**

- ✅ **Wallet Signature Verification**: All writes require valid wallet signature
- ✅ **Replay Attack Prevention**: Messages include timestamps with 5-minute window
- ✅ **Address Validation**: Ethereum address format validation
- ✅ **Backend-Only Writes**: Firestore rules prevent direct client writes
- ✅ **Action-Based Security**: Each action (trade, profile update, etc.) requires specific signature

### **API Endpoints**

- `POST /api/firestore-proxy`: Secure Firestore operations
- `GET /api/firestore-proxy`: Health check

### **Supported Actions**

- `updateProfile`: Update user profile data
- `addTransaction`: Add a new transaction
- `updateUserPoints`: Update user points
- `checkAchievements`: Check and award achievements
- `initializeUser`: Initialize new user
- `updateLeaderboard`: Update leaderboard entry
- `executeTrade`: Execute a pTradoor trade

## 📊 Database Schema

### **Collections**

1. **users**: User profiles and stats
2. **transactions**: Trading and point transactions
3. **achievements**: Available achievements
4. **userAchievements**: User achievement progress
5. **leaderboard**: Real-time leaderboard data
6. **platformStats**: Platform statistics
7. **milestones**: Platform milestones

### **Real-time Trading**

- **Transaction Recording:** All pTradoor trades recorded with metadata
- **Point Calculation:**
  - 5 points per trade
  - Bonus for large trades (>1000 pTradoor)
  - Additional points for buying
- **Achievement System:** Automatic achievement detection and rewards
- **Leaderboard Updates:** Real-time ranking updates

## 🛠️ Development Setup

### 1. **Install Firebase Emulator:**

```bash
firebase init emulators
```

### 2. **Start Emulators:**

```bash
firebase emulators:start
```

### 3. **Initialize Database:**

```typescript
// In your app, call this once to set up initial data
import { DatabaseSetup } from "~/lib/database-setup";

await DatabaseSetup.initializeDatabase();
```

## 🚀 Production Deployment

### 1. **Deploy to Vercel:**

```bash
vercel --prod
```

### 2. **Update Environment Variables:**

- Update `.env.local` with production values
- Ensure all Firebase config is correct

### 3. **Deploy Firestore Rules:**

```bash
firebase deploy --only firestore:rules
```

## 🧪 Testing

### 1. **Unit Tests:**

```bash
npm test
```

### 2. **Integration Tests:**

```bash
npm run test:integration
```

### 3. **Manual Testing:**

1. Connect wallet
2. Verify initial points allocation
3. Test trading functionality
4. Check achievement system
5. Verify real-time updates

## 🔧 Troubleshooting

### 1. **Firebase Connection Errors:**

- Check environment variables
- Verify Firebase project configuration
- Ensure Firestore is enabled

### 2. **Permission Denied:**

- Check Firestore security rules
- Verify user authentication
- Ensure backend API is working

### 3. **Signature Verification Fails:**

- Check wallet connection
- Verify message format
- Ensure timestamp is within 5-minute window

### 4. **Real-time Updates Not Working:**

- Check Firestore listeners
- Verify collection structure
- Ensure proper error handling

## 📈 Performance Optimization

### 1. **Indexing:**

- Create composite indexes for queries
- Index on frequently queried fields
- Monitor query performance

### 2. **Caching:**

- Implement client-side caching
- Use Firestore offline persistence
- Optimize real-time listeners

### 3. **Security:**

- Regular security audits
- Monitor for suspicious activity
- Keep dependencies updated

## 🔄 Updates and Maintenance

### 1. **Update Security Rules:**

```bash
firebase deploy --only firestore:rules
```

### 2. **Set Environment Variables:**

- Update `.env.local` with production values
- Ensure all Firebase config is correct

### 3. **Database Migrations:**

- Use Firestore batch operations
- Implement versioning for schema changes
- Test migrations in development first

## 📄 License

This project is licensed under the MIT License.
