# 🔐 Admin Panel Setup

The Tradoor app includes a comprehensive admin panel for managing achievements, milestones, and platform data.

## 🚀 Quick Setup

### 1. **Environment Variables**

Add these to your `.env.local` file:

```bash
# Admin Credentials
NEXT_PUBLIC_ADMIN_USERNAME=lopam
NEXT_PUBLIC_ADMIN_PASSWORD=lopam
```

### 2. **Access Admin Panel**

Navigate to `/admin` in your app to access the admin panel.

### 3. **Login**

Use the credentials:

- **Username**: `lopam`
- **Password**: `lopam`

## 📊 Admin Features

### **Achievements Management**

- ✅ Create new achievements
- ✅ Edit existing achievements
- ✅ Delete achievements
- ✅ Set rarity levels (Common, Rare, Epic, Legendary)
- ✅ Configure point rewards
- ✅ Set achievement requirements

### **Milestones Management**

- ✅ Create new milestones
- ✅ Edit milestone targets
- ✅ Track completion status
- ✅ Set milestone types (Users, Transactions, Points)

### **Platform Statistics**

- ✅ View real-time platform stats
- ✅ Monitor user growth
- ✅ Track transaction volume
- ✅ View point distribution

### **System Overview**

- ✅ Achievement summaries
- ✅ Milestone progress
- ✅ System health metrics

## 🛠️ Usage

### **Creating Achievements**

1. Navigate to the "Achievements" tab
2. Click "Add Achievement"
3. Fill in the form:
   - **Name**: Achievement title
   - **Description**: What users need to do
   - **Icon**: Emoji or symbol
   - **Rarity**: Common, Rare, Epic, or Legendary
   - **Points Reward**: Points given when unlocked
   - **Requirement Type**: What triggers the achievement
   - **Requirement Value**: How much is needed

### **Creating Milestones**

1. Navigate to the "Milestones" tab
2. Click "Add Milestone"
3. Fill in the form:
   - **Name**: Milestone title
   - **Target**: Goal number
   - **Type**: Users, Transactions, or Points

### **Managing Data**

- **Edit**: Click the edit button on any item
- **Delete**: Click the delete button to remove items
- **View**: All data is displayed in real-time

## 🔒 Security

- Admin credentials are stored in environment variables
- All admin operations require authentication
- Firebase security rules prevent unauthorized access
- All changes are logged and tracked

## 🚨 Important Notes

- **Backup Data**: Always backup your data before making changes
- **Test Changes**: Test new achievements/milestones in development first
- **Monitor Impact**: Watch how changes affect user engagement
- **Regular Updates**: Keep the admin panel updated with new features

## 🔧 Troubleshooting

### **Login Issues**

- Check environment variables are set correctly
- Ensure Firebase is properly configured
- Verify admin credentials match

### **Data Not Loading**

- Check Firebase connection
- Verify Firestore rules allow admin access
- Check browser console for errors

### **Changes Not Saving**

- Verify Firebase write permissions
- Check network connectivity
- Ensure proper authentication

## 📈 Best Practices

1. **Achievement Design**

   - Start with common achievements
   - Gradually introduce rare/epic achievements
   - Balance point rewards with difficulty
   - Test achievement triggers thoroughly

2. **Milestone Planning**

   - Set realistic targets
   - Consider user growth patterns
   - Update milestones as platform grows
   - Celebrate milestone completions

3. **Data Management**
   - Regular backups
   - Monitor system performance
   - Track user engagement metrics
   - Iterate based on user feedback

## 🎯 Example Achievements

### **Beginner Achievements**

- First Trade (10 points)
- Daily Login (5 points)
- Profile Complete (15 points)

### **Intermediate Achievements**

- 10 Trades (50 points)
- Weekly Streak (100 points)
- Silver Tier (25 points)

### **Advanced Achievements**

- 100 Trades (500 points)
- Gold Tier (100 points)
- Legendary Trader (1000 points)

## 📊 Example Milestones

### **User Growth**

- 100 Users
- 500 Users
- 1000 Users

### **Activity Goals**

- 10K Transactions
- 50K Transactions
- 100K Transactions

### **Point Milestones**

- 1M Total Points
- 5M Total Points
- 10M Total Points
