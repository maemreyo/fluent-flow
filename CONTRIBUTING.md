# Contributing to Chrome Extension Starter

Thank you for your interest in contributing! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites

- Node.js 18.0.0 or higher
- npm, pnpm, or yarn
- Google Chrome browser
- Git

### Setup Development Environment

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/yourusername/chrome-extension-starter.git
   cd chrome-extension-starter
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Set up environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Run setup script**
   ```bash
   npm run setup
   ```

5. **Start development**
   ```bash
   npm run dev
   ```

## 📋 Development Workflow

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `test/description` - Test additions/updates

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

feat(ai): add support for Claude 3.5 Sonnet
fix(popup): resolve layout issue on small screens
docs(readme): update installation instructions
test(services): add unit tests for payment service
```

Types:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Code style changes
- `refactor` - Code refactoring
- `test` - Adding tests
- `chore` - Maintenance tasks

### Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clean, documented code
   - Add tests for new functionality
   - Update documentation as needed

3. **Test your changes**
   ```bash
   npm run test
   npm run typecheck
   npm run lint
   npm run build
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat(scope): description"
   ```

5. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Fill out PR template**
   - Describe your changes
   - Link related issues
   - Add screenshots if UI changes
   - Confirm all checks pass

## 🧪 Testing Guidelines

### Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm run test -- popup.test.tsx
```

### Writing Tests

#### Component Tests
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import YourComponent from '../YourComponent'

describe('YourComponent', () => {
  it('should render correctly', () => {
    render(<YourComponent />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})
```

#### Service Tests
```typescript
import { YourService } from '../services/your-service'

describe('YourService', () => {
  let service: YourService

  beforeEach(() => {
    service = new YourService()
  })

  it('should process data correctly', async () => {
    const result = await service.processData('test')
    expect(result).toBeDefined()
  })
})
```

### Test Coverage

Maintain minimum coverage:
- **Lines**: 70%
- **Functions**: 70%
- **Branches**: 70%
- **Statements**: 70%

## 📝 Code Style

### TypeScript Guidelines

- Use strict TypeScript configuration
- Prefer interfaces over types for object shapes
- Use proper generic constraints
- Document complex types

```typescript
// Good
interface UserConfig {
  readonly id: string
  name: string
  preferences: UserPreferences
}

// Avoid
type UserConfig = {
  id: string
  name: string
  preferences: any
}
```

### React Guidelines

- Use functional components with hooks
- Prefer composition over inheritance
- Use proper prop types
- Handle loading and error states

```typescript
// Good
interface ButtonProps {
  variant: 'primary' | 'secondary'
  size: 'sm' | 'md' | 'lg'
  onClick: () => void
  children: React.ReactNode
}

const Button: React.FC<ButtonProps> = ({ variant, size, onClick, children }) => {
  return (
    <button 
      className={`btn btn-${variant} btn-${size}`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
```

### CSS/Tailwind Guidelines

- Use Tailwind utility classes
- Create reusable component classes
- Follow mobile-first approach
- Use semantic color names

```css
/* Good */
.btn-primary {
  @apply bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded-lg transition-colors;
}

/* Avoid inline styles */
<button style={{ backgroundColor: '#3b82f6' }}>
```

## 🏗️ Architecture Guidelines

### File Organization

```
lib/
├── services/          # Business logic
├── stores/           # State management
├── types/            # TypeScript definitions
├── utils/            # Utility functions
└── background/       # Background script modules

components/           # React components
hooks/               # Custom React hooks
styles/              # CSS files
__tests__/           # Test files
```

### Service Layer

- Keep services pure and testable
- Use dependency injection
- Handle errors gracefully
- Implement proper logging

### State Management

- Use Zustand for global state
- Keep state minimal and normalized
- Implement proper persistence
- Handle loading states

### Error Handling

```typescript
// Good error handling
try {
  const result = await apiCall()
  return { success: true, data: result }
} catch (error) {
  logger.error('API call failed', { error, context })
  return { success: false, error: error.message }
}
```

## 🔒 Security Guidelines

### Input Validation

- Validate all user inputs
- Sanitize data before processing
- Use Zod for schema validation

### API Security

- Use HTTPS for all API calls
- Implement proper authentication
- Rate limit API requests
- Validate API responses

### Chrome Extension Security

- Request minimal permissions
- Implement Content Security Policy
- Validate message origins
- Secure sensitive data storage

## 📚 Documentation

### Code Documentation

- Document public APIs
- Use JSDoc for functions
- Explain complex algorithms
- Provide usage examples

```typescript
/**
 * Processes user input and returns formatted result
 * @param input - The raw user input string
 * @param options - Processing options
 * @returns Promise resolving to processed result
 * @throws {ValidationError} When input is invalid
 * 
 * @example
 * ```typescript
 * const result = await processInput('hello world', { 
 *   sanitize: true 
 * })
 * ```
 */
async function processInput(
  input: string, 
  options: ProcessOptions
): Promise<ProcessResult> {
  // Implementation
}
```

### README Updates

- Update installation instructions
- Document new features
- Provide usage examples
- Keep changelog current

## 🐛 Bug Reports

### Before Reporting

1. Check existing issues
2. Reproduce the bug
3. Test with latest version
4. Gather system information

### Bug Report Template

```markdown
**Bug Description**
Clear description of the bug

**Steps to Reproduce**
1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior**
What should happen

**Actual Behavior**
What actually happens

**Environment**
- OS: [e.g., macOS 14.0]
- Chrome: [e.g., 120.0.6099.109]
- Extension: [e.g., 1.0.0]

**Additional Context**
Screenshots, logs, etc.
```

## 💡 Feature Requests

### Before Requesting

1. Check existing feature requests
2. Consider if it fits the project scope
3. Think about implementation complexity
4. Consider breaking changes

### Feature Request Template

```markdown
**Feature Description**
Clear description of the feature

**Use Case**
Why is this feature needed?

**Proposed Solution**
How should it work?

**Alternatives Considered**
Other approaches considered

**Additional Context**
Mockups, examples, etc.
```

## 🏆 Recognition

Contributors are recognized in:
- README.md contributors section
- Release notes
- GitHub contributors page

## 📞 Getting Help

- **GitHub Discussions**: General questions
- **GitHub Issues**: Bug reports and feature requests
- **Discord**: Real-time chat (if available)
- **Email**: maintainer@yourproject.com

## 📄 License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

Thank you for contributing to Chrome Extension Starter! 🚀