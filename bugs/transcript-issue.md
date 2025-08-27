# YouTube Data Extraction in Chrome Extensions - Technical Analysis

## Problem Statement

Cần trích xuất dữ liệu video YouTube trong Chrome extension nhưng không thể sử
dụng `youtubei.js` vì:

- `youtubei.js` được thiết kế cho Node.js environment
- Chrome extension không support Node.js modules
- Nếu deploy server để proxy thì gặp các vấn đề:
  - Cookie management phức tạp
  - Bot detection: "Sign in to prove you're not a bot"
  - Rate limiting từ YouTube

## Root Cause Analysis

### 1. Architecture Mismatch

- `youtubei.js` sử dụng Node.js APIs (fs, http, crypto) không có trong browser
- Chrome extension chạy trong sandboxed environment với limited APIs

### 2. Authentication & Security Issues

- Server-side approach cần handle user cookies
- YouTube phát hiện automated requests từ server
- CAPTCHA/bot detection khi không có proper browser context

### 3. API Limitations

- YouTube Data API v3 có quota limits (10,000 units/day default)
- Không cung cấp download links cho videos
- Cần API key và Google Cloud project

## Solution Approaches

### 1. Client-side Scraping (Recommended)

**Approach**: Extract data trực tiếp từ YouTube DOM trong content script

**Pros**:

- Chạy trong user's browser context → bypass bot detection
- Không cần server infrastructure
- Access full page data including restricted info

**Cons**:

- Dễ break khi YouTube update frontend
- Cần handle SPA navigation

**Implementation**:

- Content script inject vào YouTube pages
- Extract từ `window.ytInitialData`, `window.ytInitialPlayerResponse`
- Fallback parsing từ DOM elements

### 2. InnerTube API (Unofficial)

**Approach**: Sử dụng YouTube's internal API endpoints

**Pros**:

- Stable JSON responses
- Comprehensive data
- No authentication required for basic info

**Cons**:

- Unofficial, có thể thay đổi bất cứ lúc nào
- Potential rate limiting

**Implementation**:

- POST requests to `https://www.youtube.com/youtubei/v1/player`
- Mimic web client parameters

### 3. Hybrid Approach (Best Practice)

**Strategy**: Combine multiple methods với fallback chain

**Flow**:

1. Content script scraping (primary)
2. InnerTube API (fallback)
3. YouTube Data API v3 (last resort)
4. oEmbed API (basic info only)

### 4. YouTube Data API v3 (Official)

**Approach**: Use Google's official API

**Pros**:

- Official support
- Stable and documented
- No scraping risks

**Cons**:

- Quota limitations
- No download URLs
- Requires API key setup

## Technical Considerations

### Performance

- Content script method: ~50ms response time
- API calls: ~200-500ms latency
- Server proxy: +network overhead + server processing

### Reliability

- **Content script**: 85-90% (breaks on YouTube updates)
- **InnerTube API**: 70-80% (unofficial, can change)
- **Official API**: 99% (but limited functionality)

### Compliance

- Content script: Uses publicly available page data
- All approaches should respect YouTube ToS
- Rate limiting recommended for all methods

## Recommendation

**Primary**: Client-side scraping với content script **Backup**: InnerTube API
calls **Monitoring**: Implement error tracking để detect khi scraping methods
fail

Approach này tối ưu cho Chrome extension vì:

- Không cần infrastructure
- Bypass authentication issues
- Access full range of data
- Cost-effective

==============

# YouTube Window Objects - Data Structure Reference

## 1. `window.ytInitialPlayerResponse`

**Mục đích**: Chứa thông tin chi tiết về video player và metadata

### Core Structure:

```javascript
{
  videoDetails: {
    videoId: "string",
    title: "string",
    lengthSeconds: "string",
    keywords: ["array"],
    channelId: "string",
    isLiveContent: boolean,
    shortDescription: "string",
    viewCount: "string",
    author: "string",
    isPrivate: boolean,
    allowRatings: boolean,
    thumbnail: {
      thumbnails: [
        { url: "string", width: number, height: number }
      ]
    }
  },

  streamingData: {
    formats: [
      {
        itag: number,
        url: "string",
        mimeType: "string",
        quality: "string",
        qualityLabel: "string", // "720p", "1080p"
        fps: number,
        audioQuality: "string"
      }
    ],
    adaptiveFormats: [
      // Riêng audio hoặc video
      {
        itag: number,
        url: "string",
        mimeType: "string",
        bitrate: number,
        width?: number, // cho video
        height?: number, // cho video
        audioSampleRate?: "string" // cho audio
      }
    ]
  },

  captions: {
    playerCaptionsTracklistRenderer: {
      captionTracks: [
        {
          baseUrl: "string", // URL subtitle
          name: { simpleText: "string" }, // Language name
          languageCode: "string", // "en", "vi"
          isTranslatable: boolean
        }
      ]
    }
  },

  playabilityStatus: {
    status: "string", // "OK", "ERROR", "LOGIN_REQUIRED"
    reason?: "string" // Error message if not OK
  },

  microformat: {
    playerMicroformatRenderer: {
      publishDate: "string",
      uploadDate: "string",
      category: "string",
      liveBroadcastDetails?: {
        isLiveNow: boolean,
        startTimestamp: "string",
        endTimestamp: "string"
      }
    }
  }
}
```

## 2. `window.ytInitialData`

**Mục đích**: Chứa thông tin page layout, comments, recommendations, channel
info

### Core Structure:

```javascript
{
  contents: {
    twoColumnWatchNextResults: {
      results: {
        results: {
          contents: [
            {
              videoPrimaryInfoRenderer: {
                title: { runs: [{ text: "string" }] },
                viewCount: {
                  videoViewCountRenderer: {
                    viewCount: { simpleText: "string" }
                  }
                },
                dateText: { simpleText: "string" },
                relativeDateText: { simpleText: "string" }
              }
            },
            {
              videoSecondaryInfoRenderer: {
                owner: {
                  videoOwnerRenderer: {
                    title: { runs: [{ text: "string" }] },
                    subscriberCountText: { simpleText: "string" },
                    thumbnail: { thumbnails: [] }
                  }
                },
                description: { runs: [] },
                subscribeButton: {
                  subscribeButtonRenderer: {
                    subscriberCountText: { simpleText: "string" }
                  }
                }
              }
            }
          ]
        }
      },

      secondaryResults: {
        secondaryResults: {
          results: [
            // Recommended videos
            {
              compactVideoRenderer: {
                videoId: "string",
                title: { simpleText: "string" },
                viewCountText: { simpleText: "string" },
                lengthText: { simpleText: "string" }
              }
            }
          ]
        }
      }
    }
  },

  // Comments section
  engagementPanels: [
    {
      engagementPanelSectionListRenderer: {
        content: {
          sectionListRenderer: {
            contents: [
              {
                itemSectionRenderer: {
                  contents: [
                    {
                      continuationItemRenderer: {
                        trigger: "string",
                        continuationEndpoint: {
                          // API endpoint để load comments
                        }
                      }
                    }
                  ]
                }
              }
            ]
          }
        }
      }
    }
  ],

  // Page metadata
  metadata: {
    channelMetadataRenderer: {
      title: "string",
      description: "string",
      keywords: "string",
      channelUrl: "string"
    }
  },

  header: {
    c4TabbedHeaderRenderer: {
      channelId: "string",
      title: "string",
      subscriberCountText: { simpleText: "string" }
    }
  }
}
```

## Key Information Available:

### From `ytInitialPlayerResponse`:

- ✅ **Video streaming URLs** (formats, adaptive formats)
- ✅ **Subtitle/Caption URLs**
- ✅ **Video metadata** (title, description, duration, views)
- ✅ **Channel info** (author, channelId)
- ✅ **Playability status** (available, restricted, etc.)
- ✅ **Live stream info** (if applicable)
- ✅ **Thumbnails** (various sizes)

### From `ytInitialData`:

- ✅ **Page UI data** (like/dislike buttons, comments count)
- ✅ **Related/recommended videos**
- ✅ **Channel subscriber count**
- ✅ **Video description with formatting**
- ✅ **Comments continuation endpoints**
- ✅ **Channel header info**
- ❌ **Direct comment content** (cần additional API calls)

## Practical Usage:

### Essential Video Info:

```javascript
// Basic video data
const title = ytInitialPlayerResponse.videoDetails.title
const views = ytInitialPlayerResponse.videoDetails.viewCount
const duration = ytInitialPlayerResponse.videoDetails.lengthSeconds

// Channel info
const channelName = ytInitialPlayerResponse.videoDetails.author
const subscriberCount =
  ytInitialData.contents.twoColumnWatchNextResults.results.results.contents[1]
    .videoSecondaryInfoRenderer.owner.videoOwnerRenderer.subscriberCountText
    .simpleText
```

### Download URLs:

```javascript
// Video + Audio combined
const progressiveFormats = ytInitialPlayerResponse.streamingData.formats

// Separate video/audio (higher quality)
const adaptiveFormats = ytInitialPlayerResponse.streamingData.adaptiveFormats
```

### Subtitles:

```javascript
const captionTracks =
  ytInitialPlayerResponse.captions?.playerCaptionsTracklistRenderer
    ?.captionTracks || []
```

## Limitations:

- Structure có thể thay đổi khi YouTube update
- Một số field có thể undefined với certain video types
- viewCount is under videoDetails nhưng cần handle string format
- Streaming URLs có thể expire sau một thời gian
