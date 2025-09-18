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

## 🎊 Video Overlay WORKING!
**The overlay displays on video during meetings!**

### What Works:
- ✅ **Method 2 or 2b** (Base64 format) successfully draws overlay
- ✅ Timer updates smoothly once per second
- ✅ Smart format caching for performance
- ✅ Rendering context activates properly

### 🔧 Next Improvements Needed:
1. **Optimize format detection** - Stop trying all 6 methods when we know 2/2b works
2. **Fix overlay clearing** - Not properly clearing when speaker finishes
3. **Enhance cosmetics** - Make the overlay look more professional

### Technical Details:
- Using Zoom Apps SDK Layers API
- `drawImage` with base64 encoded canvas data
- Full ImageData object also works on some systems
- `clearImage` API may not be available (fallback needed)

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

## 🚀 Next Session Tasks - Video Overlay Fix

### 🔍 DISCOVERED ISSUE: Wrong SDK Methods!
**We have Video SDK code but we're using Apps SDK!** The Detective found:
- `/src/hooks/useVideoOverlay.js` uses `startVideoProcessor`/`stopVideoProcessor` (Video SDK only)
- We're importing `@zoom/appssdk` which doesn't have these methods
- Need to use `setVirtualForeground` from Apps SDK instead

### 📋 TODO for Video Overlay:
1. **Replace Video SDK methods with Apps SDK `setVirtualForeground`**
   - Remove `startVideoProcessor`/`stopVideoProcessor` calls
   - Implement `zoomSdk.setVirtualForeground()` instead

2. **Convert canvas to image format**
   ```javascript
   // Example approach:
   canvas.toBlob(blob => {
     const reader = new FileReader();
     reader.onload = () => {
       zoomSdk.setVirtualForeground({
         imageData: reader.result
       });
     };
     reader.readAsDataURL(blob);
   });
   ```

3. **Add capability for `setVirtualForeground`**
   - Add to capabilities array in App.jsx line 56-72
   - Check if API is available before using

4. **Keep existing canvas rendering**
   - Timer drawing code in useVideoOverlay.js is good
   - Just need to feed it to correct API

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