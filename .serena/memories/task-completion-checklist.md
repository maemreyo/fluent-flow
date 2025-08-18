# Task Completion Checklist

## MANDATORY Steps After Any Code Changes

### 1. Code Quality Checks (REQUIRED)
```bash
pnpm typecheck    # TypeScript compilation check
pnpm lint         # ESLint validation
pnpm test:ci      # Run all tests
```

### 2. Validation Command
```bash
pnpm validate     # Runs all three above commands
```

### 3. Security Audit (For Dependencies)
```bash
pnpm security:audit    # Check for vulnerabilities
```

### 4. Build Verification
```bash
pnpm build       # Ensure production build works
```

## Pre-Commit Requirements
- All TypeScript errors fixed
- All ESLint errors resolved (warnings acceptable)
- All tests passing
- Code formatted with Prettier
- No console.log statements (use console.warn/error if needed)
- No debugger statements
- Input validation added for new user inputs
- Error handling added for async operations

## Extension Testing
1. Load extension in Chrome (`chrome://extensions/`)
2. Test popup functionality
3. Test side panel (if modified)
4. Test content script interactions (if modified)
5. Check console for errors in all contexts

## Performance Considerations
- Bundle size analysis: `pnpm analyze`
- Rate limiting implemented for API calls
- Caching strategy verified
- Memory leaks checked (especially for long-running operations)

## Security Review
- Input sanitization implemented
- API keys properly protected
- No sensitive data in logs
- XSS prevention measures in place
- CORS handling verified

## Documentation Updates
- Update README if public APIs changed
- Add JSDoc comments for complex functions
- Update type definitions if interfaces changed