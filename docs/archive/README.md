# Rejected Approaches Archive

This folder contains documentation of approaches that were considered but ultimately rejected during the design phase.

## Files

### Cookie Extraction Methods (Rejected)

1. **ANYROUTER_SETUP.md** - Browser Extension Method
   - Required user to install EditThisCookie extension
   - Manual cookie export process
   - **Rejected**: Too complex for users, requires browser extension installation

2. **COOKIE_UPLOAD_METHOD.md** - Manual Cookie Upload
   - User exports cookies manually via browser extension
   - Uploads JSON file to server
   - **Rejected**: Poor UX, requires extension, multi-step process

### Embedded Browser Methods (Rejected)

3. **EMBEDDED_BROWSER_DESIGN.md** - VNC/Xvfb Approach
   - Server-side VNC + Xvfb + noVNC
   - Browser streaming via VNC protocol
   - **Rejected**: Too heavy (large Docker image), complex infrastructure

4. **SIMPLE_EMBEDDED_BROWSER.md** - Screenshot Streaming
   - Playwright screenshot capture (10-15 FPS)
   - WebSocket streaming to web UI
   - **Rejected**: Still uses WebSocket (user wanted REST-only), resource intensive

## Final Solution

**PWA + One-Click Script Launcher** (see `/PWA_SCRIPT_LAUNCHER.md`)
- ✅ Lightweight (1KB script)
- ✅ Browser-native trust
- ✅ 2-step user flow
- ✅ REST API only (WebSocket internal)
- ✅ Cross-platform

## Lessons Learned

1. **User Trust Matters**: Browser-native downloads more trusted than unknown apps
2. **Simplicity Wins**: Fewer steps = better UX
3. **REST API Requirement**: Public interface must be REST, internal WebSocket is acceptable
4. **No Heavy Infrastructure**: VNC/Xvfb adds unnecessary complexity
5. **Progressive Enhancement**: Start simple, add features based on user feedback

---

*These documents are preserved for reference and to document the decision-making process.*
