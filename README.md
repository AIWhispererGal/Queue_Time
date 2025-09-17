# Speaker Queue Manager - Zoom App

A professional Zoom application for managing speaker queues and tracking speaking time during meetings.

## Features

### Core Functionality
- **Speaker Queue Management**: Add participants to a queue with a single click
- **Drag & Drop Reordering**: Easily reorganize the speaker order
- **Countdown Timer**: Configurable time limits for each speaker
- **Real-time Statistics**: Track speaking time and participation metrics
- **Audio Alerts**: Warning sounds at 30s and 10s remaining
- **Export to CSV**: Download meeting statistics for records

### Visual Features
- Color-coded timer warnings (Green > Yellow > Red)
- Current speaker indicator
- Queue position numbers
- Participant avatars or initials
- Speaking time statistics per participant

## Quick Start

### Development Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Run development server**
   ```bash
   npm run dev
   ```

3. **Open in browser**
   Navigate to `http://localhost:5173`

### Zoom App Setup

1. **Register on Zoom Marketplace**
   - Go to [marketplace.zoom.us](https://marketplace.zoom.us)
   - Click "Develop" → "Build App"
   - Choose "Zoom Apps" as the app type

2. **Configure App Settings**
   - App name: Speaker Queue Manager
   - Add required scopes:
     - `listParticipants`
     - `getMeetingParticipants`
     - `onParticipantChange`
     - `onActiveSpeakerChange`

3. **Set URLs**
   - Home URL: `https://localhost:5173`
   - Redirect URL: `https://localhost:5173/auth`

4. **Create Environment File**
   ```bash
   cp .env.example .env
   ```
   Add your Zoom credentials to the `.env` file

## Usage

### Adding Speakers to Queue
- Click any participant's name in the left panel
- Participants already in queue show "In Queue" badge
- Current speaker shows "Speaking" badge

### Managing the Queue
- **Start Speaking**: Click "Start Next Speaker" button
- **Reorder**: Drag and drop speakers in the queue
- **Remove**: Click the × button next to a queued speaker
- **Clear All**: Click "Clear Queue" to remove all speakers

### Timer Controls
- Adjust time limit when timer is inactive (10-600 seconds)
- Timer automatically starts when speaker begins
- Manual "End Turn" button available during speaking
- Audio alerts at 30s and 10s remaining

### Statistics
- View total speaking time per participant
- See number of turns taken
- Calculate average speaking time
- Export data to CSV for records

## Project Structure

```
queue-time/
├── src/
│   ├── components/
│   │   ├── ParticipantList.jsx    # Display meeting participants
│   │   ├── SpeakerQueue.jsx       # Manage speaker queue
│   │   ├── Timer.jsx               # Countdown timer
│   │   └── Statistics.jsx         # Speaking statistics
│   ├── App.jsx                    # Main application
│   └── App.css                    # Global styles
├── manifest.json                  # Zoom app configuration
├── package.json                   # Dependencies
└── .env.example                   # Environment variables template
```

## Development Mode

The app includes a development mode that works without Zoom integration:
- Mock participants are provided
- All features are functional
- "Development Mode" badge appears in header

## Technologies Used

- **React 19** - UI framework
- **Vite** - Build tool
- **Zoom Apps SDK** - Zoom integration
- **React Beautiful DnD** - Drag and drop functionality
- **Web Audio API** - Alert sounds

## Browser Support

- Chrome (recommended)
- Edge
- Firefox
- Safari

## Troubleshooting

### App not connecting to Zoom
- Verify Zoom credentials in `.env` file
- Check that required scopes are enabled
- Ensure app is running on correct port (5173)

### Drag and drop not working
- Check browser compatibility
- Ensure JavaScript is enabled
- Try refreshing the page

### No audio alerts
- Check browser audio permissions
- Ensure volume is not muted
- Try a different browser

## License

MIT License - See LICENSE file for details

## Support

For issues or questions, please contact support or create an issue in the repository.