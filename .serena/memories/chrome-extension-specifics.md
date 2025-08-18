# Chrome Extension Specifics

## Manifest Configuration
**Location**: Defined in `package.json` "manifest" section (Plasmo generates actual manifest.json)

### Key Permissions
- `storage`: Chrome storage API access
- `activeTab`: Current tab access
- `contextMenus`: Right-click menu integration
- `sidePanel`: Side panel UI support
- `tabs`: Tab management

### Host Permissions
- `https://*/*`: Access to all HTTPS sites

### Extension Architecture
- **Manifest Version**: 3 (modern standard)
- **Service Worker**: `background.ts` (replaces background pages)
- **Content Scripts**: `content.ts` (page interaction)
- **Action Popup**: `popup.tsx` (toolbar button)
- **Side Panel**: `sidepanel.tsx` (extended UI)
- **Options Page**: `options.tsx` (full settings page)

## File Structure
```
Extension Root/
├── background.ts        # Service worker (message router)
├── content.ts          # Content script (page interaction)
├── popup.tsx           # Popup UI (React)
├── sidepanel.tsx       # Side panel UI (React)
├── options.tsx         # Options page UI (React)
└── lib/background/     # Background handlers
```

## Message Passing Pattern
**Background → Handlers → Services**

```typescript
// Background (router only)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'PROCESS_FEATURE':
      handleFeatureMessage(message.data, sendResponse)
      return true
  }
})

// Handler (Chrome API bridge)
export async function handleFeatureMessage(data: any, sendResponse: Function) {
  const service = new ApiService()
  const result = await service.processFeature(data)
  sendResponse({ success: true, data: result })
}
```

## Storage Strategy
- **Chrome Storage API**: For extension preferences
- **Zustand Persistence**: Automatic state synchronization
- **Local Storage**: Avoid (limited, synchronous)

## Development Workflow
1. `pnpm dev` - Start development mode
2. Load extension in Chrome (`chrome://extensions/`)
3. Enable "Developer mode"
4. Click "Load unpacked" → select project folder
5. Test in popup, content script, side panel
6. Reload extension after changes

## Production Build
1. `pnpm build` - Build for production
2. `pnpm package` - Create ZIP for store upload
3. Upload to Chrome Web Store developer dashboard

## Extension Store Requirements
- Icons: 16x16, 48x48, 128x128 PNG
- Screenshots: 1280x800 or 640x400
- Detailed description and privacy policy
- Store listing content and screenshots