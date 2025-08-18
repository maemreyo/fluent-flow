# Famous Packages & Their Usage

## HTTP Client: ky (1.2.3)
**Usage**: All API calls via `ImprovedBaseService`
**Benefits**: Better than fetch - retry logic, timeout, type safety
**Pattern**: Services extend `ImprovedBaseService` for HTTP operations

```typescript
// Correct usage in services
export class MyService extends ImprovedBaseService {
  async getData() {
    return await this.get<DataType>('/endpoint')
  }
}
```

## State Management: Zustand (4.5.2)
**Usage**: Replace React hooks and complex state logic
**Benefits**: Simple, performant, TypeScript-friendly, persistence built-in
**Pattern**: Domain-specific stores with hooks

```typescript
// Store pattern
export const useMyStore = create<State>()(
  persist((set, get) => ({ /* state */ }), { name: 'my-store' })
)
```

## Validation: Zod (4.0.14)
**Usage**: All input validation and schema definition
**Benefits**: Runtime type checking, type inference, better than manual validation
**Pattern**: Schema-first validation at all boundaries

## Date Handling: date-fns (3.6.0)
**Usage**: All date operations instead of native Date methods
**Benefits**: Immutable, tree-shakable, comprehensive
**Examples**: formatDistanceToNow, format, addDays, etc.

## AI Integration: Official SDKs
- **OpenAI SDK (4.47.1)**: For GPT models
- **Anthropic SDK (0.20.9)**: For Claude models
**Benefits**: Official support, type safety, streaming support

## UI Components: Radix UI
**Usage**: Accessible, unstyled components
**Components**: Dialog, Dropdown, Tabs, Toast
**Benefits**: Accessibility built-in, customizable styling

## Icons: Lucide React (0.535.0)
**Usage**: Consistent icon system
**Benefits**: Tree-shakable, customizable, React-optimized

## Utilities
- **clsx (2.1.1)**: Conditional CSS classes
- **class-variance-authority (0.7.1)**: Component variants
- **uuid (9.0.1)**: Unique ID generation
- **jwt-decode (4.0.0)**: JWT token parsing

## Payment: Stripe (14.25.0)
**Usage**: Secure payment processing with backend integration
**Benefits**: Industry standard, comprehensive API

## Testing: Jest + Testing Library
**Usage**: Unit and integration testing
**Benefits**: React-focused testing utilities

## Code Quality
- **ESLint + TypeScript ESLint**: Code linting
- **Prettier**: Code formatting with import sorting
- **Husky**: Git hooks for code quality

## Development Framework: Plasmo (0.88.0)
**Usage**: Chrome extension development framework
**Benefits**: Hot reload, TypeScript support, manifest generation