# Chrome Web Store Publishing Guide

## Prerequisites

### 1. Developer Account Registration

- **One-time fee**: $5 (upfront payment required)
- **Registration**: Visit
  [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/developer/dashboard)
- **Email**: Use a dedicated email for Chrome Web Store communications
- **Publishing limit**: Maximum 20 extensions per account

### 2. Technical Requirements

- **Manifest Version**: Must use Manifest V3 (required for new submissions)
- **Package size**: Maximum 2GB
- **Code compliance**: All logic must be self-contained (no remote code
  execution)

## Required Assets

### Icons

- **Store icon**: 128x128px PNG (with 16px transparent padding, actual icon
  96x96px)
- **Extension icon**: 48x48px PNG (for chrome://extensions)
- **Favicon**: 16x16px PNG (optional)

### Screenshots

- **Minimum**: 1 screenshot (maximum 5)
- **Size**: 1280x800px (preferred) or 640x400px
- **Format**: PNG or JPEG
- **Content**: Show actual extension functionality, no excessive text

### Promotional Images

- **Small promo tile**: 440x280px (mandatory)
- **Large promo tile**: 920x680px (optional)
- **Marquee promo tile**: 1400x560px (optional)

## Store Listing Content

### Description

- **Length**: Up to 16,000 characters
- **Content**: Explain what the extension does and why users should install it
- **Keywords**: Relevant, avoid keyword stuffing

### Privacy Policy

- **Required if**: Extension handles user data
- **Location**: Must be publicly accessible URL
- **Content**: Must match actual data collection practices

### Category Selection

- Choose appropriate category for your extension
- Affects discoverability in Chrome Web Store

## Pre-Publishing Checklist

### Testing

- [ ] Test in Developer Mode (chrome://extensions/)
- [ ] Enable Developer Mode and load unpacked extension
- [ ] Verify all features work correctly
- [ ] Test keyboard shortcuts and UI interactions

### Code Review

- [ ] All permissions are necessary and used
- [ ] No unused permissions requested
- [ ] Code follows Chrome Web Store policies
- [ ] Extension purpose is clear and single-focused

### Assets Preparation

- [ ] All required images created and optimized
- [ ] Screenshots demonstrate core functionality
- [ ] Icons are clear at all sizes
- [ ] Store description is comprehensive

## Publishing Process

### 1. Package Creation

```bash
# Build production version
pnpm build

# Create ZIP from build output
cd build/chrome-mv3-prod
zip -r fluent-flow-extension.zip .
```

### 2. Upload to Store

1. Go to
   [Developer Dashboard](https://chrome.google.com/webstore/developer/dashboard)
2. Click "New Item"
3. Upload your extension ZIP file
4. Complete store listing information
5. Submit for review

### 3. Review Process

- **Timeline**: Usually 1-3 days for initial review
- **Publishing window**: 30 days to publish after approval
- **Updates**: Faster review for updates to existing extensions

## Post-Publishing

### Version Updates

- **Version numbers**: Must increment (e.g., 1.0.0 → 1.0.1)
- **Update process**: Upload new ZIP with higher version number
- **Review**: Updates typically have faster review times

### Monitoring

- **User feedback**: Respond to reviews and ratings
- **Analytics**: Monitor usage statistics in developer dashboard
- **Policy compliance**: Stay updated with Chrome Web Store policy changes

## FluentFlow Specific Preparation

### Current Status

✅ Manifest V3 compatible  
✅ Extension functionality complete  
✅ Build system configured

### Still Needed

- [ ] Create store icons (128x128, 48x48, 16x16)
- [ ] Take 5 screenshots of extension in action
- [ ] Create promotional images (440x280 required)
- [ ] Write comprehensive store description
- [ ] Create privacy policy (if handling user data)
- [ ] Final testing and code review

### Recommended Description Focus

- YouTube language learning enhancement
- Loop creation and management features
- Voice recording and comparison
- Time-based note-taking
- Keyboard shortcuts for efficiency
- Privacy-focused (local/offline functionality)

## Key Success Tips

1. **Clear value proposition**: Explain benefits clearly
2. **Quality screenshots**: Show the extension in action
3. **Accurate permissions**: Only request what you need
4. **Regular updates**: Keep extension current
5. **User feedback**: Respond to reviews promptly

## Important Deadlines

- **Manifest V2 sunset**: June 2025 (all extensions must use V3)
- **Review submission**: Allow 3-7 days for review process
- **Publishing deadline**: 30 days after approval

---

_Last updated: January 2025_  
_For latest requirements, check:
[Chrome Web Store Policies](https://developer.chrome.com/docs/webstore/program-policies/)_
