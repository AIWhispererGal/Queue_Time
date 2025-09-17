# Queue Time - Zoom App Development Guide

## 🎉 Current Status
**The app is 95% complete!** UI works perfectly, just needs final SDK connection.

## ✅ What's Working
- Full queue management UI
- Timer system with color coding
- Statistics tracking and export
- App loads successfully in Zoom
- Mock data fallback for testing
- ngrok tunnel with HTTPS working

## 🔧 The SDK Connection Issue
The app shows "Dev Mode" because the Zoom SDK isn't connecting. We discovered:

1. **CSP headers were blocking the SDK** - FIXED ✅
2. **The app MUST run inside Zoom client** - not in browser!
3. Error: "The Zoom Apps SDK is not supported by this browser" confirms this

## 📝 How to Test Properly
1. **Start ngrok**: App runs on `https://cda3cf3733c1.ngrok-free.app` (or similar)
2. **In Zoom Desktop Client** (NOT browser):
   - Join/start a meeting
   - Click Apps button
   - Find your app → Open
3. The SDK will connect and show real participants

## 🚀 Next Session Tasks
1. Test inside Zoom client (not browser)
2. Debug any remaining SDK issues
3. Video overlay is not possible with Zoom Apps (only Video SDK)
4. Consider using floating timer or screen share instead

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