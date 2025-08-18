# Automation Scripts Overview

## Core Automation Scripts
**Location**: `scripts/` directory

### 1. Setup Script (`scripts/setup.js`)
**Purpose**: Interactive onboarding wizard for new developers
**Usage**: `node scripts/setup.js` or `pnpm run setup`

**Features**:
- System requirements validation (Node.js 18+, Chrome)
- Project configuration (name, description, author)
- AI provider selection and API key setup
- Payment system configuration (optional)
- Analytics setup (optional)
- Environment file generation
- Dependency installation with preferred package manager
- Initial build and validation

### 2. Configuration Script (`scripts/configure.js`)
**Purpose**: Advanced configuration wizard
**Usage**: `node scripts/configure.js`

**Features**:
- AI provider configuration and testing
- Payment system setup with Stripe integration
- Analytics and monitoring configuration
- Feature flags management
- Security settings and API key management
- Environment synchronization

### 3. Development Workflow Script (`scripts/dev-workflow.js`)
**Purpose**: Interactive development menu
**Usage**: `node scripts/dev-workflow.js`

**Features**:
- Code validation (TypeScript, ESLint, tests)
- Build automation with validation
- Development server management
- Test execution with coverage
- Codebase analysis and metrics
- Project cleanup utilities
- Performance profiling

### 4. Deployment Script (`scripts/deploy.js`)
**Purpose**: Complete deployment automation
**Usage**: `node scripts/deploy.js`

**Features**:
- Multi-environment builds (dev, staging, production)
- Pre-deployment validation checks
- Distribution package creation with checksums
- Store upload preparation (Chrome, Edge, Firefox)
- Version management and tagging
- Deployment reporting and documentation
- Rollback capabilities

## Script Benefits
- **Interactive Wizards**: Guided setup with intelligent defaults
- **Comprehensive Validation**: System requirements, code quality, pre-deployment checks
- **Error Prevention**: Reduce manual tasks and human error
- **Professional Workflows**: Enterprise-grade development processes
- **Multi-environment Support**: Development, staging, production deployments

## Usage Patterns
- **New Project Setup**: Run setup.js once for initial configuration
- **Daily Development**: Use dev-workflow.js for routine tasks
- **Advanced Config**: Use configure.js for complex integrations
- **Production Release**: Use deploy.js for store deployment

## Integration with Package Scripts
- `pnpm run setup` → `node scripts/setup.js`
- `pnpm run dev-menu` → `node scripts/dev-workflow.js`
- Package scripts provide convenient shortcuts to automation