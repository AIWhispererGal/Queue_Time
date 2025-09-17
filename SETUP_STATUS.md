# Speaker Queue Manager - Setup Status & Instructions

## ✅ What's Been Built

### Core Features Implemented:
- **Queue Management**: Add/remove/reorder speakers with drag-and-drop
- **Timer System**: Configurable countdown with color-coded warnings
- **Statistics Tracking**: Speaking time, turns, participation metrics
- **Video Overlay**: Timer displays on YOUR video feed (as timekeeper)
- **Settings Panel**: Quick presets (30s to 5m) and custom time limits
- **Panelist Support**: Handles both webinar panelists and regular participants
- **Export**: CSV download of speaking statistics
- **Floating Timer**: Optional local display mode
- **Development Mode**: Works without Zoom for testing

### Technical Stack:
- React 19 + Vite
- Zoom Apps SDK (@zoom/appssdk)
- React Beautiful DnD (drag-drop)
- Custom video processor for overlay

## 📍 Current Setup Status

### ✅ Completed:
1. Full app development
2. UI/UX implementation
3. Zoom SDK integration prep
4. Development environment

### 🔄 In Progress - Zoom Registration:
- **Platform**: marketplace.zoom.us
- **App Type**: General App (User-managed)
- **You have**: Client ID & Secret (need to add to .env)

### ⏳ Next Steps:

#### 1. Create `.env` file:
```bash
VITE_ZOOM_CLIENT_ID=your_client_id_here
VITE_ZOOM_CLIENT_SECRET=your_client_secret_here
```

#### 2. Set up HTTPS for local development:
```bash
# Install mkcert
npm install -g mkcert

# Create certificates
mkcert -install
mkcert localhost
```

#### 3. Update vite.config.js for HTTPS:
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

export default defineConfig({
  plugins: [react()],
  server: {
    https: {
      key: fs.readFileSync('./localhost-key.pem'),
      cert: fs.readFileSync('./localhost.pem'),
    }
  }
})
```

## 🚀 Quick Start Commands

```bash
# Install dependencies (already done)
npm install --legacy-peer-deps

# Run development server
npm run dev

# Build for production
npm run build
```

## 🔧 Zoom App Configuration Needed

### Required Scopes:
- `zoomapp:inmeeting`
- `user:read`
- `meeting:read`
- `meeting:read:participant`
- `webinar:read`
- `webinar:read:participant`

### URLs to Configure:
- **Home URL**: https://localhost:5173
- **Redirect URL**: https://localhost:5173/auth

### App Context:
- ✅ In Meeting
- ✅ In Webinar
- ❌ Main Client
- ❌ Phone

## 📱 How to Test

### Without Zoom (Development Mode):
1. Run `npm run dev`
2. Open http://localhost:5173
3. You're "John Doe (You)" - add others to queue
4. Test all features locally

### With Zoom:
1. Enable Zoom Apps in client settings
2. Add yourself as test user in Marketplace
3. Start a meeting
4. Click Apps → Find your app → Add

## 🎯 Key Features Usage

### As Meeting Host/Timekeeper:
1. **Add to Queue**: Click any participant
2. **Start Timer**: "Start Next Speaker" button
3. **Adjust Time**: Use settings panel between speakers
4. **Video Overlay**: Toggle "My Video Timer: ON"
   - Shows timer on YOUR video
   - Everyone sees the countdown on your feed
   - Includes queue display

### Display Options:
- **Floating Timer**: Local browser popup (just for you)
- **Video Overlay**: On your video feed (everyone sees)
- Both can be used independently

## ⚠️ Common Issues

### "App won't load in Zoom"
- Need HTTPS certificate setup
- URLs must match exactly
- Check Zoom Apps enabled in settings

### "Can't see participants"
- Check scopes approved
- Verify SDK initialization
- May need to refresh permissions

## 📦 File Structure
```
queue-time/
├── src/
│   ├── components/
│   │   ├── Timer.jsx           # Countdown timer
│   │   ├── ParticipantList.jsx # People list with panelist badges
│   │   ├── SpeakerQueue.jsx    # Drag-drop queue
│   │   ├── Statistics.jsx      # Speaking stats & export
│   │   ├── Settings.jsx        # Time configuration
│   │   └── FloatingTimer.jsx   # Optional popup timer
│   ├── hooks/
│   │   └── useVideoOverlay.js  # Video feed modification
│   └── App.jsx                 # Main app logic
├── manifest.json               # Zoom app configuration
└── .env                       # Your credentials (create this!)
```

## 🎨 UI Features
- Compact design for Zoom sidebar (320-1000px)
- Panelists marked with purple dot (●)
- Color-coded timer: Green → Yellow → Red
- Responsive to panel width
- Professional gradient theme

## 📝 For Next Session
1. Complete Zoom Marketplace setup
2. Configure HTTPS
3. Test in actual Zoom meeting
4. Troubleshoot any integration issues
5. Consider production deployment

---
**App is functionally complete! Just needs Zoom registration finishing and testing.**