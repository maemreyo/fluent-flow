# YouTube Overlay Questions Feature

## Problem
During group study sessions when sharing screen via Google Meet, users can share the YouTube tab with audio, but the AI-generated practice questions are only visible in the browser's sidepanel. This means shared screen viewers cannot see the questions, making collaborative practice impossible.

## Solution Architecture
Create an overlay system that injects questions directly onto the YouTube page using Shadow DOM for isolation.

## Research Findings
1. **Current Question System**: Uses ConversationQuestionsPanel component in sidepanel with full quiz interface (364 lines)
2. **Chrome Extension APIs**: Content scripts can inject overlay UI using Shadow DOM for style isolation
3. **Message Passing**: chrome.runtime.sendMessage/onMessage for sidepanel <-> content script communication
4. **Best Practices**: Shadow DOM recommended over iframe for seamless integration

## Implementation Plan
1. Create compact overlay component (QuestionOverlay) 
2. Inject overlay via content script using Shadow DOM
3. Add message passing for questions data
4. Add toggle in sidepanel to switch display modes
5. Position overlay to not interfere with YouTube controls

## Key Components
- **QuestionOverlay**: Compact display component
- **content script**: Overlay injection and message handling  
- **sidepanel**: Toggle and message sending
- **Shadow DOM**: Style isolation from YouTube page

## Display Modes
- **Sidepanel Mode**: Current behavior (default)
- **Overlay Mode**: Questions displayed on YouTube tab for screen sharing