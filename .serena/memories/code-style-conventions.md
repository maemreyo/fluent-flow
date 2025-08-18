# Code Style & Conventions

## TypeScript Configuration
- **Version**: 5.3.3
- **Strict mode**: Enabled
- **Target**: ES2021
- **Module**: ESNext
- **JSX**: React JSX

## ESLint Rules
- **Parser**: @typescript-eslint/parser
- **Extends**: eslint:recommended, @typescript-eslint/recommended, react/recommended
- **Key Rules**:
  - No unused vars (with `_` prefix exception)
  - No explicit any (warn)
  - No console (warn)
  - No debugger (error)
  - Prefer const over let
  - No var declarations

## Prettier Configuration
- **Semi**: false (no semicolons)
- **Quotes**: Single quotes for JS/TS, double for JSX
- **Print width**: 100 characters
- **Tab width**: 2 spaces
- **Trailing commas**: none
- **Arrow parens**: avoid
- **Import sorting**: Enabled with plugin

## Import Order
1. React imports first
2. Third-party modules
3. Internal modules (@/ paths)
4. Relative imports (./...)

## Naming Conventions
- **Files**: kebab-case (e.g., `api-service.ts`)
- **Components**: PascalCase (e.g., `AIChatPanel`)
- **Functions/Variables**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Types/Interfaces**: PascalCase
- **Store hooks**: use prefix (e.g., `useExtensionStore`)

## File Organization
- **Services**: Classes extending base service
- **Types**: Comprehensive TypeScript definitions
- **Stores**: Zustand patterns with persistence
- **Components**: Single responsibility, typed props
- **Utils**: Pure functions with validation

## Code Quality Requirements
- All inputs must be validated with Zod schemas
- Error handling required in all async operations
- Type safety enforced - no `any` types
- Security patterns: input sanitization, XSS prevention
- Rate limiting for API calls