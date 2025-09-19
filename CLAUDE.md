# Queue Time - Zoom App Development Guide

## 🎉 Current Status
**PRODUCTION READY!** Professional broadcast-quality queue management with stunning video overlay!

## ✅ What's Working PERFECTLY
- Full queue management UI with clean, uncluttered design
- Professional full-screen overlay with ring progress
- THREE overlay modes: OFF, MINI (huge timer only), FULL (timer + queue + stats)
- Custom background image support
- Keyboard shortcuts (Space/E, N, P, G) ALL WORKING
- Pause/resume that actually pauses (not resets!)
- Grace period (+15s) working smoothly
- Stats tracking with proper turn counting (includes current speaker!)
- Percentage-based color transitions (>50% green, 25-50% amber, <25% red)
- Smart name truncation
- Perfect queue spacing with larger fonts (16px)
- Collapsible statistics panel
- "End Turn" and "End Topic" buttons for proper session management

## 🎊 ENHANCED Overlay Features!
**Professional broadcast quality with three modes!**

### ✅ Overlay Modes:
- **OFF** - No overlay on video
- **MINI** - Giant timer only (80% of screen) - perfect for focused presentations
- **FULL** - Complete overlay with timer, queue, stats, and keyboard hints

### ✅ Overlay Features:
- **Full-screen design** with circular progress ring
- **Custom background image** from `/public/background.jpg`
- **Queue visualization** showing only waiting speakers (no current speaker duplication!)
- **Stats panel** showing Turn # and Topic Time
- **Keyboard hints** vertically stacked at bottom-right (full mode only)
- **Pause overlay** with instant response and clean || bars
- **Color-coded timer** using percentages (>50% green, 25-50% amber, <25% red)
- **No ghosting** - clean canvas updates
- **Proper clearing** when toggled off

### ✅ Keyboard Shortcuts:
- **Space/E** - End current speaker's turn (with stats tracking!)
- **N/Enter** - Start next speaker
- **P** - Pause/Resume timer (instant visual feedback!)
- **G** - Add 15 seconds grace period (WORKS!)

### ✅ UI Improvements:
- **Single cycling button** in header for overlay mode (OFF → MINI → FULL → OFF)
- **Collapsible Statistics** panel to reduce clutter
- **Two action buttons** when speaker active:
  - "End Turn" - Same as spacebar, ends current speaker only
  - "End Topic" - Ends speaker AND clears queue for new topic
- **Larger queue text** (16px) for better readability
- **Clean Settings panel** with only time limit controls

## 🚨 CRITICAL: Ngrok Restart Required!
**Every time you restart development:**
1. **Kill everything**: `lsof -t -i:5173 | xargs kill -9; pkill -9 ngrok`
2. **Start dev server**: `npm run dev`
3. **Start ngrok**: `npx ngrok http 5173`
4. **Get new URL**: Check terminal for `https://xxxxx.ngrok-free.app`
5. **Update Zoom Marketplace**:
   - Go to your app settings
   - Update "Home URL" with new ngrok address
   - Save changes
6. **Test in Zoom** (not browser!)

**White screen = Wrong/old ngrok URL!**

## 🛠 Quick Commands
```bash
# Kill and restart everything
lsof -t -i:5173 | xargs kill -9; pkill -9 ngrok
npm run dev
npx ngrok http 5173

# Git commands
git add -A
git commit -m "message"
```

## 📝 How to Test Properly
1. **Start ngrok**: Get the new URL from terminal
2. **Update Zoom Marketplace**: Use the new ngrok URL
3. **In Zoom Desktop Client** (NOT browser):
   - Join/start a meeting
   - Click Apps button
   - Find your app → Open
4. The SDK will connect and show real participants

## 🏆 Latest Improvements (Production Polish)
- Removed duplicate video overlay toggles
- Fixed statistics to include current speaker time
- Added "End Turn" button (purple) for ending speaker
- Added "End Topic" button (orange) for ending session and clearing queue
- Made statistics collapsible (click header)
- Restored single cycling button for overlay modes
- Increased queue font size to 16px
- Cleaned up Settings panel
- Removed redundant UI elements

## 💡 Key Features
- **Queue Management**: Add/remove/reorder speakers
- **Timer Control**: Customizable time limits with presets
- **Statistics Tracking**: Total time, turns, averages per speaker
- **Video Overlay**: Three modes for different presentation needs
- **Keyboard Control**: Full keyboard shortcuts for hands-free operation
- **Session Management**: End Turn vs End Topic for different workflows

## 🔑 Important Files
- `/src/App.jsx` - Main app logic and SDK initialization
- `/src/components/SpeakerQueue.jsx` - Queue management UI
- `/src/components/Statistics.jsx` - Stats tracking (collapsible)
- `/src/components/Settings.jsx` - Time limit controls
- `/src/hooks/useVideoOverlay.js` - Video overlay implementation
- `/src/utils/overlayRenderer.js` - Canvas rendering for overlay

## 📚 Resources
- Zoom Apps SDK: https://marketplace.zoom.us/docs/sdk/native-sdks/web-apps/
- App in marketplace: https://marketplace.zoom.us (your account)
- ngrok dashboard: https://dashboard.ngrok.com

## 🎯 Production Ready!
The app is now fully polished and ready for production use:
1. Clean, intuitive UI with no clutter
2. Professional video overlay with multiple modes
3. Proper session management with End Turn/End Topic
4. Accurate statistics tracking
5. Responsive keyboard controls
6. Collapsible panels to save space

---
**The app is PRODUCTION READY! Deploy with confidence!** 🚀