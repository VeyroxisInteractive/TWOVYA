# TWOVYA

Privacy-first PWA prototype with 2-person private rooms, peer-to-peer text chat, WebRTC video/audio calls, random matching, Tic-Tac-Toe, Fun Time, PWA install, and no database.

## Run
1. Install Node.js 18+
2. `npm install`
3. `npm start`
4. Open `http://localhost:3000`

For phone camera/mic and production PWA use HTTPS.

## Privacy architecture
- No account or database.
- Room and matchmaking state is held only in Node process memory and disappears on restart/room exit.
- Messages use WebRTC DataChannel once peers connect; server is used for signaling only.
- Calls use WebRTC and are not recorded by this app.
- Static service-worker cache does not cache chat messages.
- Current default uses Google's public STUN server. For strict infrastructure control, replace it in `public/app.js` with your own STUN/TURN (Coturn).

## Important production limitation
Reliable worldwide WebRTC requires a TURN server for networks where direct peer-to-peer connection fails. This ZIP does not include hosted TURN credentials. Random anonymous chat also needs stronger moderation, age policy, persistent abuse controls/rate limiting before a public launch.

## Included now
Private room, optional PIN, random matchmaking, P2P chat, camera/mic calls, Tic-Tac-Toe, basic 2048 screen, Fun Time, installable PWA.

## Not falsely marked complete
Full Ludo, Chess, Carrom, Party Room/group calling, photo/voice-note transfer, Doodle, Our Space persistence, and production-grade random moderation are not complete in this build. Their UI direction is included, but they need additional game/network modules before they should be advertised as working.
