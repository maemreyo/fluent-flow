# Chrome Extension Starter Template - Project Overview

## Purpose
A modern Chrome extension starter template with clean architecture, TypeScript, React, and comprehensive AI integration features. Designed for scalable development with built-in monetization and security features.

## Key Features
- **Clean Architecture**: Strict separation of concerns with layered architecture
- **AI Integration**: Multi-provider support (OpenAI, Anthropic Claude, custom APIs)
- **Monetization**: Complete payment system with Stripe integration and feature gating
- **Security**: Input validation, rate limiting, secure storage, and XSS prevention
- **Modern Stack**: TypeScript, React, Zustand state management, ky HTTP client
- **Professional Libraries**: date-fns, zod validation, radix-ui components
- **Multi-UI**: Popup, side panel, options page, and content scripts
- **Comprehensive Tooling**: ESLint, Prettier, Jest, automation scripts

## Architecture Principles
1. **Background Script = Router Only**: Pure message routing, no business logic
2. **Service Layer Separation**: Business logic in services, not Chrome handlers
3. **Type-Safe Communication**: Strictly typed interfaces for all messages
4. **State Management**: Zustand stores with automatic persistence
5. **HTTP Client**: ky-based services with retry logic and error handling

## Tech Stack
- **Framework**: Plasmo (Chrome extension framework)
- **Language**: TypeScript 5.3.3
- **UI**: React 18.2.0 with Radix UI components
- **State**: Zustand 4.5.2 with persistent storage
- **HTTP**: ky 1.2.3 for API calls
- **Validation**: Zod 4.0.14 for schema validation
- **Styling**: CSS with Tailwind support
- **AI**: OpenAI 4.47.1, Anthropic SDK 0.20.9
- **Payment**: Stripe 14.25.0
- **Date**: date-fns 3.6.0
- **Testing**: Jest 29.7.0 with Testing Library