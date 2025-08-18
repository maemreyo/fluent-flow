# Testing Configuration & Patterns

## Jest Configuration
**File**: `jest.config.js`
**Environment**: jsdom (for React components)
**Setup**: `src/setupTests.ts` (after env setup)

## Key Settings
- **Coverage Threshold**: 70% for branches, functions, lines, statements
- **Test Timeout**: 10000ms
- **Test Environment**: jsdom for React testing
- **Coverage Reports**: text, lcov, html formats

## Test Patterns
- **Test Files**: `__tests__/**/*.(test|spec).(ts|tsx|js)`
- **Source Tests**: `src/**/*.(test|spec).(ts|tsx|js)`
- **Coverage**: `lib/`, `components/`, `hooks/` directories

## Module Mapping
- `@/*` → `<rootDir>/*`
- `~/*` → `<rootDir>/*`
- `lib/*` → `<rootDir>/lib/*`
- `components/*` → `<rootDir>/components/*`
- `hooks/*` → `<rootDir>/hooks/*`
- `styles/*` → `<rootDir>/styles/*`

## Chrome Extension Mocks
- **Chrome APIs**: `__mocks__/chrome.js`
- **Static Assets**: identity-obj-proxy for CSS
- **File Assets**: `__mocks__/fileMock.js`

## Test Commands
- `pnpm test` - Run tests once
- `pnpm test:watch` - Watch mode
- `pnpm test:coverage` - With coverage report
- `pnpm test:ci` - CI mode (no watch, with coverage)

## Testing Best Practices
- Mock Chrome APIs for all extension functionality
- Test React components with Testing Library
- Test services with mocked HTTP responses
- Maintain 70%+ coverage threshold
- Use descriptive test names
- Test error scenarios and edge cases

## Required Test Coverage
- All service classes in `lib/services/`
- All React components in `components/`
- All custom hooks in `hooks/`
- Critical utility functions in `lib/utils/`
- Background message handlers