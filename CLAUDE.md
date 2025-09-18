# Queue Time - Zoom App Development Guide

## 🎉 Current Status
**The app is WORKING!** UI works perfectly AND video overlay is functional!

## ✅ What's Working
- Full queue management UI
- Timer system with color coding
- Statistics tracking and export
- App loads successfully in Zoom
- Mock data fallback for testing
- ngrok tunnel with HTTPS working

## 🎊 Video Overlay FULLY WORKING!
**The overlay displays perfectly on video during meetings!**

### ✅ What's Working:
- **Method 3 (ImageData)** is most reliable, with base64 as fallback
- Timer updates smoothly once per second
- Optimized to only try working methods
- Shows custom logo when queue is idle
- Displays queue count when people are waiting

### ✅ Issues SOLVED:
1. **Overlay clearing** - Shows logo instead of trying to clear (clearImage doesn't work)
2. **Method optimization** - Only tries Method 3 and base64 fallbacks
3. **Visual polish** - Logo displays when idle, professional timer design

### Technical Implementation:
- Using Zoom Apps SDK Layers API with `drawImage`
- ImageData format (Method 3) works most reliably
- Base64 format as fallback
- Custom logo at `/public/logo.jpg`
- Always displays something (timer or logo) to avoid stuck overlays

## 🚨 CRITICAL: Ngrok Restart Required!
**Every time you restart development:**
1. **Kill old ngrok**: `pkill -f ngrok`
2. **Start fresh tunnel**: `npx ngrok http 5173`
3. **Get new URL**: Check terminal for `https://xxxxx.ngrok-free.app`
4. **Update Zoom Marketplace**:
   - Go to your app settings
   - Update "Home URL" with new ngrok address
   - Save changes
5. **Test in Zoom** (not browser!)

**White screen = Wrong/old ngrok URL!**

## 🛠 Quick Commands
- `k.bat` - Kill dev server (Windows)
- `s.bat` - Start dev server (Windows)
- `npm run dev` - Start server (port 5173 required!)
- `npx ngrok http 5173` - Start ngrok tunnel

## Development Notes:
   - Only works for developer account
   - Shows "Dev Mode" badge (by design!)
   - May fall back to mock data
   - Limited to testing purposes

3. **What we fixed along the way**:
   - ✅ CSP headers for blob: URLs
   - ✅ SDK initialization code
   - ✅ ngrok HTTPS tunnel
   - ✅ All the code works perfectly!

## 📝 How to Test Properly
1. **Start ngrok**: App runs on `https://cda3cf3733c1.ngrok-free.app` (or similar)
2. **In Zoom Desktop Client** (NOT browser):
   - Join/start a meeting
   - Click Apps button
   - Find your app → Open
3. The SDK will connect and show real participants

## 🚀 Next Session Tasks

### Potential Enhancements:
1. **Publish to Zoom Marketplace**
   - Complete app submission process
   - Add privacy policy and terms
   - Submit for review

2. **Enhanced Features**
   - Add sound notifications when turn starts
   - Customizable timer colors/themes
   - Save queue history between sessions
   - Add moderator controls

3. **UI/UX Improvements**
   - Better mobile responsiveness
   - Keyboard shortcuts
   - Dark mode theme option
   - Animation transitions

4. **Testing & Polish**
   - Add comprehensive error handling
   - Test with larger meetings (50+ participants)
   - Performance optimization for large queues

## 💡 Key Learnings
- Zoom Apps run in iframe inside Zoom
- SDK requires parent window communication
- CSP headers can block this communication
- Must test inside Zoom, not browser
- Video modification needs Video SDK, not Zoom Apps

## 🛠 Development Commands
```bash
# Start dev server
npm run dev

# Start ngrok tunnel
npx ngrok http 5173

# Git commands
git add -A
git commit -m "message"
```

## 🔑 Important Files
- `/src/App.jsx` - Main app logic and SDK initialization
- `/vite.config.js` - Server config (removed CSP headers)
- `/.env` - Zoom credentials (keep secret!)
- `/SETUP_STATUS.md` - Original setup instructions

## 📚 Resources
- Zoom Apps SDK: https://marketplace.zoom.us/docs/sdk/native-sdks/web-apps/
- App in marketplace: https://marketplace.zoom.us (your account)
- ngrok dashboard: https://dashboard.ngrok.com

## 🎯 Success Criteria
When working correctly, you should see:
1. Real participant names (not mock data)
2. No "Dev Mode" badge
3. Ability to add real participants to queue
4. Timer functionality working as expected

---
**Remember: The app is actually working great! Just test it in Zoom client, not browser!**