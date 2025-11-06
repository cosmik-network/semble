# Contributing to Semble

Thank you for your interest in contributing to Semble! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Database Migrations](#database-migrations)
- [Additional Resources](#additional-resources)

## Code of Conduct

This project is built by [Cosmik Network](https://cosmik.network/). We are committed to providing a welcoming and inclusive environment for all contributors. Please be respectful and professional in all interactions.

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: Version 20 or higher
- **npm**: Comes with Node.js
- **Docker**: Required for running local databases and running integration tests
- **Git**: For version control

### First-Time Setup

1. **Fork and Clone the Repository**

   ```bash
   git clone https://github.com/your-username/semble.git
   cd semble
   ```

2. **Install Dependencies**

   ```bash
   npm ci
   ```

3. **Set Up Environment Variables**

   Create a `.env.local` file in the root directory with the necessary environment variables. Refer to existing documentation or ask a maintainer for required variables.

4. **Start Local Database Services**

   ```bash
   # Start PostgreSQL
   npm run db:start

   # Start Redis
   npm run redis:start
   ```

## Development Setup

### Running the Application

Semble is a monorepo with multiple workspaces. Here are the main development commands:

#### Backend Development

```bash
# Run the backend with mock services (recommended for quick development)
npm run dev:mock

# Run the full backend (requires proper configuration)
npm run dev

# Run specific workers
npm run dev:worker:feeds:inner
npm run dev:worker:search:inner
```

#### Frontend Development

```bash
# Run the webapp
npm run webapp:dev

# Run the browser extension in development mode
npm run webapp:extension:dev

# Run Storybook for component development
npm run webapp:storybook
```

#### Building

```bash
# Build everything
npm run build

# Build specific workspaces
npm run build:types
npm run build:webapp
```

### Stopping Services

When you're done, stop the Docker containers:

```bash
# Stop PostgreSQL
npm run db:stop

# Stop Redis
npm run redis:stop

# Remove containers (if needed)
npm run db:remove
npm run redis:remove
```

## Project Structure

Semble follows Domain-Driven Design (DDD) principles with a layered architecture:

```
semble/
├── docs/                 # Project documentation
├── src/
│   ├── modules/          # Bounded contexts (DDD)
│   │   └── <context>/
│   │       ├── domain/           # Core business logic
│   │       ├── application/      # Use cases and DTOs
│   │       └── infrastructure/   # Persistence, external services
│   ├── shared/           # Shared utilities and infrastructure
│   ├── types/            # Shared TypeScript types workspace
│   ├── webapp/           # Next.js web application workspace
│   └── workers/          # Background job workers
├── .github/workflows/    # CI/CD pipelines
└── tests/                # Test files
```

### Key Architectural Principles

- **Bounded Contexts**: Top-level directories under `src/modules/` separate distinct domain areas
- **Layered Architecture**: Each context has domain, application, and infrastructure layers
- **Dependency Rule**: Dependencies flow inward (Infrastructure → Application → Domain)
- **Workspaces**: The project uses npm workspaces for `types` and `webapp`

For more details, see [docs/directory-structure.md](docs/directory-structure.md).

## Development Workflow

### Branch Strategy

- `main` - Production branch
- `development` - Development branch (base your work off this)
- `feature/your-feature-name` - Feature branches

### Making Changes

1. **Create a New Branch**

   ```bash
   git checkout development
   git pull origin development
   git checkout -b feature/your-feature-name
   ```

2. **Make Your Changes**

   - Write clear, focused commits
   - Follow the coding standards (see below)
   - Add tests for new functionality
   - Update documentation as needed

3. **Test Your Changes**

   ```bash
   # Run unit tests
   npm run test:unit

   # Run integration tests
   npm run test:integration

   # Run all tests
   npm test

   # Run linting
   npm run lint

   # Run formatting check
   npm run format:check
   ```

4. **Format and Lint**

   ```bash
   # Auto-format code
   npm run format

   # Auto-fix linting issues
   npm run lint:fix
   ```

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Enable strict mode and fix type errors
- Use explicit types for function parameters and return values
- Avoid `any` types when possible

### Code Style

The project uses Prettier and ESLint to enforce consistent code style:

- **Prettier Configuration**:
  - Single quotes
  - 2-space indentation
  - Semicolons required
  - Trailing commas
  - 80 character line width
  - Arrow function parentheses always

Run `npm run format` to automatically format your code according to these rules.

### Architecture Guidelines

- **Domain Layer**: Pure business logic, no external dependencies
- **Application Layer**: Use cases that orchestrate domain objects
- **Infrastructure Layer**: Database, external APIs, framework-specific code
- Follow the dependency rule: outer layers depend on inner layers, never the reverse

### Naming Conventions

- **Files**: Use kebab-case for file names (e.g., `user-repository.ts`)
- **Classes**: Use PascalCase (e.g., `UserRepository`)
- **Functions/Variables**: Use camelCase (e.g., `getUserById`)
- **Constants**: Use UPPER_SNAKE_CASE (e.g., `MAX_RETRY_COUNT`)
- **Interfaces**: Use PascalCase, avoid prefixing with "I" (e.g., `Repository`, not `IRepository`)

## Testing

Semble uses a comprehensive testing strategy with multiple levels of tests.

### Test Types

1. **Unit Tests**: Test individual functions, classes, or components in isolation
   - Focus on domain logic and utility functions
   - Use mocks for dependencies
   - Run with: `npm run test:unit`

2. **Integration Tests**: Test interactions between components
   - Test use cases with real or mocked repositories
   - Test repositories against test databases
   - Run with: `npm run test:integration`

3. **End-to-End Tests**: Test complete user workflows
   - Simulate real user scenarios through the API
   - Run with: `npm run test:e2e`

### Writing Tests

- Place tests in the same directory structure as the code being tested
- Use descriptive test names that explain the scenario and expected outcome
- Follow the Arrange-Act-Assert pattern
- Use factories or builders for creating test data

### Test Guidelines

- Write tests for all new features
- Maintain or improve code coverage
- Integration tests use testcontainers for PostgreSQL and Redis
- Run tests locally before pushing

For detailed testing strategy, see [docs/testing-strategy.md](docs/testing-strategy.md).

## Pull Request Process

### Before Submitting

1. **Ensure All Tests Pass**

   ```bash
   npm test
   npm run lint
   npm run format:check
   ```

2. **Build Successfully**

   ```bash
   npm run build:types
   npm run build
   ```

3. **Update Documentation**

   - Update README.md if needed
   - Add or update relevant docs in the `docs/` directory
   - Update JSDoc comments for public APIs

### Submitting a Pull Request

1. **Push Your Branch**

   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create a Pull Request**

   - Go to the repository on GitHub
   - Click "New Pull Request"
   - Select `development` as the base branch
   - Fill out the PR template with:
     - Clear description of changes
     - Related issue numbers (if applicable)
     - Screenshots (for UI changes)
     - Testing performed

3. **Address Review Feedback**

   - Respond to comments
   - Make requested changes
   - Push updates to the same branch

4. **Merge**

   - A maintainer will merge your PR once approved
   - PRs are typically squash-merged to keep history clean

### PR Requirements

- [ ] Tests pass in CI
- [ ] Code follows style guidelines (linting and formatting pass)
- [ ] New code has appropriate test coverage
- [ ] Documentation updated as needed
- [ ] No merge conflicts with base branch
- [ ] Reviewed and approved by at least one maintainer

## Database Migrations

When making changes to the database schema:

1. **Modify Schema Files**

   - Update or create `.sql.ts` files in `src/modules/**/infrastructure/persistence/`

2. **Generate Migrations**

   ```bash
   npm run db:generate
   ```

   This creates migration files in `src/shared/infrastructure/database/migrations/`

3. **Migrations Run Automatically**

   - Migrations are applied during app initialization
   - For production, ensure migrations are tested thoroughly

4. **Connecting to Production Database** (for maintainers)

   ```bash
   fly mpg connect
   ```

For more details, see [DEVELOPERS.md](DEVELOPERS.md) and [docs/deployment.md](docs/deployment.md).

## Commit Message Guidelines

Write clear, descriptive commit messages:

### Format

```
type(scope): brief description

Longer explanation if needed, wrapping at 72 characters.
Include motivation for the change and contrast with previous behavior.

Refs: #123
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring without changing functionality
- `test`: Adding or updating tests
- `chore`: Maintenance tasks, dependency updates

### Examples

```
feat(collections): add collaborative collection support

Implement the ability for users to collaborate on collections
with granular permission controls.

Refs: #45
```

```
fix(auth): resolve token refresh race condition

Fixed an issue where concurrent requests could cause token
refresh to fail intermittently.

Refs: #123
```

## Additional Resources

### Documentation

- [README.md](README.md) - Project overview
- [DEVELOPERS.md](DEVELOPERS.md) - Developer notes
- [docs/](docs/) - Detailed documentation on architecture, domains, and features

### Key Documentation Files

- [docs/directory-structure.md](docs/directory-structure.md) - Project organization
- [docs/testing-strategy.md](docs/testing-strategy.md) - Testing approach
- [docs/deployment.md](docs/deployment.md) - Deployment guide
- [docs/auth.md](docs/auth.md) - Authentication system
- [docs/domain-layer.md](docs/domain-layer.md) - Domain-driven design principles

### Getting Help

- **Issues**: Check [existing issues](https://github.com/cosmik-network/semble/issues) or create a new one
- **Discussions**: Use GitHub Discussions for questions and ideas
- **Cosmik Network**: Join the community at [cosmik.network](https://cosmik.network/#connect)
- **Blog**: Learn more at [blog.cosmik.network](https://blog.cosmik.network/)

### External Resources

- [AT Protocol Documentation](https://atproto.com/)
- [Domain-Driven Design](https://martinfowler.com/tags/domain%20driven%20design.html)
- [Next.js Documentation](https://nextjs.org/docs) - For webapp development

## License

By contributing to Semble, you agree that your contributions will be licensed under the same license as the project.

---

Thank you for contributing to Semble and helping build a better social knowledge network!
