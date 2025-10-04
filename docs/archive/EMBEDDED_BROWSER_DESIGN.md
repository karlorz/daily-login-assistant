# Embedded Browser Login - Design Document

## 🎯 Goal
Create a simple, one-page workflow where users can:
1. Enter website URL
2. See browser embedded in the web page
3. Login directly
4. System auto-captures cookies
5. Profile created automatically

## 🏗️ Architecture

### Option 1: noVNC Embedded (Recommended)
```
┌─────────────────────────────────────────┐
│   Web UI (http://server:3001)          │
│                                         │
│  [Enter URL: https://anyrouter.top/]   │
│  [Site: anyrouter] [User: user1]       │
│  [ Start Login Session ]               │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  noVNC Viewer (embedded iframe)   │ │
│  │  ┌─────────────────────────────┐  │ │
│  │  │ Browser showing:            │  │ │
│  │  │ https://anyrouter.top/      │  │ │
│  │  │ [Login form visible here]   │  │ │
│  │  └─────────────────────────────┘  │ │
│  └───────────────────────────────────┘ │
│                                         │
│  [ Save Profile & Capture Cookies ]    │
└─────────────────────────────────────────┘
```

**How it works:**
1. User fills form and clicks "Start Login Session"
2. Backend:
   - Starts Xvfb virtual display
   - Launches Playwright browser (non-headless) in Xvfb
   - Starts VNC server on Xvfb
   - Returns noVNC URL to frontend
3. Frontend:
   - Loads noVNC in iframe
   - User sees browser and logs in
4. User clicks "Save Profile"
5. Backend:
   - Captures cookies from browser
   - Saves profile
   - Closes browser

### Option 2: Playwright CDP Screenshots (Alternative)
```
Use Playwright CDP to stream screenshots to web UI
+ Simpler (no VNC)
- More complex implementation
- Slower updates
```

### Option 3: Browser Extensions API (Not suitable)
Requires browser extension - rejected by user requirements.

## 📋 Implementation Plan

### Phase 1: Backend API
**New Endpoints:**
- `POST /api/sessions/start` - Start browser session
  - Input: { url, site, user }
  - Output: { sessionId, vncUrl }

- `POST /api/sessions/:id/save` - Save cookies and close
  - Input: { profileId }
  - Output: { success, cookies }

- `DELETE /api/sessions/:id` - Cancel session

**Services:**
```typescript
class EmbeddedBrowserService {
  // Start Xvfb + VNC + Browser
  async startSession(url: string): Promise<SessionInfo>

  // Capture cookies from active browser
  async captureCookies(sessionId: string): Promise<Cookie[]>

  // Clean up session
  async closeSession(sessionId: string): Promise<void>
}
```

### Phase 2: Frontend UI

**New UI Flow:**
```html
<!-- Step 1: Initial Form -->
<form id="createSessionForm">
  <input name="site" placeholder="anyrouter">
  <input name="user" placeholder="user1">
  <input name="url" placeholder="https://anyrouter.top/">
  <button>Start Login Session</button>
</form>

<!-- Step 2: Browser View (shown after start) -->
<div id="browserView" class="hidden">
  <h3>Login to your account</h3>
  <iframe id="vncFrame" src=""></iframe>
  <button onclick="saveProfile()">Save Profile</button>
  <button onclick="cancelSession()">Cancel</button>
</div>

<!-- Step 3: Success -->
<div id="success" class="hidden">
  ✅ Profile created! Cookies captured.
</div>
```

### Phase 3: Docker Configuration

**Add to Dockerfile:**
```dockerfile
# Install Xvfb, VNC, noVNC
RUN apt-get update && apt-get install -y \
    xvfb \
    x11vnc \
    novnc \
    websockify

# Expose noVNC port
EXPOSE 6080
```

**Startup script:**
```bash
# Start Xvfb on demand (when session starts)
Xvfb :99 -screen 0 1920x1080x24 &

# Start x11vnc
x11vnc -display :99 -forever -shared &

# Start noVNC
websockify --web=/opt/noVNC 6080 localhost:5900 &
```

## 🎨 UI Mockup

### Before Login:
```
┌────────────────────────────────────┐
│ 🤖 Profile Manager                │
├────────────────────────────────────┤
│                                    │
│  Create New Profile                │
│                                    │
│  Site Name:    [anyrouter      ]  │
│  User Name:    [user1          ]  │
│  Login URL:    [https://...    ]  │
│                                    │
│  [ Start Login Session ]          │
│                                    │
└────────────────────────────────────┘
```

### During Login:
```
┌────────────────────────────────────┐
│ 🤖 Login to anyrouter.top          │
├────────────────────────────────────┤
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃ [Browser View via noVNC]    ┃  │
│  ┃                             ┃  │
│  ┃  https://anyrouter.top/     ┃  │
│  ┃  ┌─────────────────────┐    ┃  │
│  ┃  │ Username: _______   │    ┃  │
│  ┃  │ Password: _______   │    ┃  │
│  ┃  │ [ Login ]           │    ┃  │
│  ┃  └─────────────────────┘    ┃  │
│  ┃                             ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                    │
│  [ ✅ Save Profile ]  [ ❌ Cancel ]│
└────────────────────────────────────┘
```

## ⚡ Advantages

1. **No Extension Required** ✅
   - Users don't install anything
   - Works on any device with browser

2. **All-in-One Page** ✅
   - Never leave our UI
   - Seamless experience

3. **Automatic Cookie Capture** ✅
   - No manual export
   - No JSON copy/paste

4. **Visual Confirmation** ✅
   - User sees browser
   - Confirms login success
   - Knows exactly what's happening

5. **Universal Compatibility** ✅
   - Works with OAuth
   - Works with 2FA
   - Works with any auth method

## 🔧 Alternative: Simpler Approach

If noVNC is too complex, we can use **Playwright Screenshots**:

```typescript
// Take screenshot every second
setInterval(async () => {
  const screenshot = await page.screenshot({ encoding: 'base64' });
  websocket.send({ type: 'screenshot', data: screenshot });
}, 1000);

// User clicks in web UI → send to Playwright
websocket.on('click', ({ x, y }) => {
  await page.mouse.click(x, y);
});
```

But noVNC is better because it's real-time and fully interactive.

## 📊 Comparison

| Method | Complexity | Real-time | User Experience |
|--------|------------|-----------|-----------------|
| **Cookie Extension** | Low | N/A | Poor (2 tools) |
| **noVNC Embedded** | Medium | Yes | Excellent |
| **Screenshot Stream** | Medium | ~1s delay | Good |
| **Manual Copy/Paste** | Low | N/A | Poor |

**Recommendation: noVNC Embedded** ✅

## 🚀 Next Steps

1. Update Dockerfile with Xvfb + noVNC
2. Create `EmbeddedBrowserService`
3. Add session management API
4. Update web UI with iframe
5. Test with anyrouter.top
6. Deploy to Docker

---

**Estimated Time**: 2-3 hours
**Priority**: HIGH (user requested)
**Status**: Ready to implement
