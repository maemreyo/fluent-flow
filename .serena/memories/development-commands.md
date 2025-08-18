# Development Commands & Workflow

## Essential Commands (use pnpm only)
- `pnpm dev` - Start development with hot reload
- `pnpm build` - Build for production
- `pnpm typecheck` - Run TypeScript checks
- `pnpm lint` - Run ESLint
- `pnpm lint:fix` - Fix ESLint issues automatically
- `pnpm format` - Format code with Prettier
- `pnpm test` - Run Jest tests
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:coverage` - Run tests with coverage
- `pnpm package` - Create distributable ZIP

## Automation Scripts
- `node scripts/setup.js` - Interactive setup wizard for new developers
- `node scripts/configure.js` - Advanced configuration for AI, payments, analytics
- `node scripts/dev-workflow.js` - Interactive development menu
- `node scripts/deploy.js` - Complete deployment automation

## Validation Commands (REQUIRED after changes)
- `pnpm validate` - Run all checks: typecheck + lint + test
- `pnpm security:audit` - Check for security vulnerabilities
- `pnpm analyze` - Analyze bundle size

## Utility Commands
- `pnpm clean` - Remove build artifacts and caches
- `pnpm reinstall` - Clean reinstall of dependencies

## Development Workflow
1. Make changes to source files
2. Run `pnpm build` 
3. Reload extension in Chrome
4. Test functionality
5. Before commit: `pnpm validate`

## System Requirements
- Node.js 18+
- pnpm (required package manager)
- Chrome browser for testing