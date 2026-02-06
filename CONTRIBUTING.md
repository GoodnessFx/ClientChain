# Contributing to ClientChain

Thank you for your interest in contributing to ClientChain! This document provides guidelines for development and contributions.

## Development Setup

### Prerequisites
- Node.js 18+
- pnpm (recommended) or npm
- Git
- Supabase account

### Initial Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/clientchain.git
   cd clientchain
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Configure environment**
   - Copy `.env.example` to `.env.local`
   - Fill in your Supabase credentials

4. **Start development**
   The app runs in Figma Make environment - changes are auto-reflected

## Code Style

### TypeScript
- Use TypeScript for all new code
- Enable strict mode
- Provide proper type definitions

### React
- Use functional components with hooks
- Follow React best practices
- Keep components focused and reusable

### Naming Conventions
- Components: PascalCase (`UserProfile.tsx`)
- Utilities: camelCase (`formatDate.ts`)
- Constants: UPPER_SNAKE_CASE (`API_BASE_URL`)
- CSS classes: Tailwind utilities

### File Organization
```
src/
├── app/
│   ├── components/     # React components
│   │   ├── ui/        # Reusable UI components
│   │   └── *.tsx      # Feature components
│   ├── lib/           # Utilities and helpers
│   └── types.ts       # Type definitions
```

## Component Guidelines

### Create New Components
```typescript
import { FC } from 'react';

interface MyComponentProps {
  title: string;
  onAction?: () => void;
}

export const MyComponent: FC<MyComponentProps> = ({ title, onAction }) => {
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold">{title}</h2>
      {onAction && (
        <button onClick={onAction}>Action</button>
      )}
    </div>
  );
};
```

### Props
- Always define prop interfaces
- Use optional props with `?`
- Provide default values when appropriate
- Document complex props

### State Management
- Use `useState` for local state
- Use Context for shared state
- Keep state as local as possible

## API Integration

### Adding New Endpoints

1. **Backend** (`/supabase/functions/server/index.tsx`)
   ```typescript
   app.post("/make-server-0491752a/new-endpoint", requireAuth, async (c) => {
     try {
       const data = await c.req.json();
       // Implementation
       return c.json({ success: true });
     } catch (error) {
       console.error('Error:', error);
       return c.json({ error: error.message }, 500);
     }
   });
   ```

2. **API Client** (`/src/app/lib/api.ts`)
   ```typescript
   async newEndpoint(data: any) {
     const response = await fetch(`${API_BASE_URL}/new-endpoint`, {
       method: 'POST',
       headers: this.getHeaders(),
       body: JSON.stringify(data),
     });
     return this.handleResponse(response);
   }
   ```

3. **TypeScript Types** (`/src/app/types.ts`)
   ```typescript
   export interface NewType {
     id: string;
     name: string;
     // ...
   }
   ```

## Testing

### Manual Testing
Before submitting:
- [ ] Test with demo accounts
- [ ] Verify responsive design
- [ ] Check error handling
- [ ] Test all user flows

### Unit Testing (Future)
```bash
pnpm test
```

## Git Workflow

### Branching Strategy
- `main` - Production-ready code
- `develop` - Development branch
- `feature/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `hotfix/critical-fix` - Critical production fixes

### Commit Messages
Follow conventional commits:
```
type(scope): subject

body

footer
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `test`: Tests
- `chore`: Maintenance

Examples:
```
feat(referrals): add Instagram story integration

- Implement story posting API
- Add story templates
- Update analytics tracking

Closes #123
```

### Pull Request Process

1. **Create feature branch**
   ```bash
   git checkout -b feature/new-feature
   ```

2. **Make changes**
   - Write clean, documented code
   - Follow style guidelines
   - Test thoroughly

3. **Commit changes**
   ```bash
   git add .
   git commit -m "feat(scope): description"
   ```

4. **Push branch**
   ```bash
   git push origin feature/new-feature
   ```

5. **Create Pull Request**
   - Provide clear description
   - Reference related issues
   - Add screenshots if UI changes
   - Request review

6. **Code Review**
   - Address feedback
   - Make requested changes
   - Keep PR updated

7. **Merge**
   - Squash and merge
   - Delete branch after merge

## Code Review Guidelines

### For Reviewers
- Be constructive and respectful
- Explain the "why" behind suggestions
- Approve when ready
- Request changes if needed

### For Authors
- Respond to all comments
- Don't take feedback personally
- Ask for clarification if needed
- Update code based on feedback

## Styling Guidelines

### Tailwind CSS
- Use utility classes
- Follow design system tokens
- Keep responsive design in mind
- Use theme variables from `theme.css`

### Design System
```typescript
// Colors
bg-slate-900   // Primary dark
bg-sky-600     // Primary accent
bg-slate-50    // Background

// Typography
font-space-grotesk  // Headings
font-inter         // Body text

// Spacing
p-4, p-6, p-8     // Padding scale
gap-4, gap-6      // Gap scale
```

## Database Guidelines

### KV Store Usage
```typescript
// Store data
await kv.set(`entity:${id}`, data);

// Get data
const entity = await kv.get(`entity:${id}`);

// Get multiple
const entities = await kv.getByPrefix('entity:');

// Delete
await kv.del(`entity:${id}`);
```

### Key Naming
- Use prefixes: `user:`, `referral:`, `booking:`, etc.
- Be consistent
- Make keys searchable

## Performance Guidelines

### Frontend
- Lazy load routes and components
- Optimize images
- Minimize bundle size
- Use React.memo for expensive components
- Debounce user inputs

### Backend
- Minimize database queries
- Cache when appropriate
- Use async/await properly
- Handle errors gracefully

## Security Guidelines

### Frontend
- Never expose service role key
- Validate user input
- Sanitize data before rendering
- Use environment variables

### Backend
- Validate all inputs
- Use requireAuth middleware
- Check user permissions
- Log security events
- Rate limit endpoints

## Documentation

### Code Comments
```typescript
/**
 * Calculates the discount for group bookings
 * @param groupSize - Number of people in the group
 * @returns Discount percentage (0-1)
 */
function calculateDiscount(groupSize: number): number {
  if (groupSize === 2) return 0.25;
  if (groupSize >= 3 && groupSize <= 4) return 0.30;
  if (groupSize >= 5) return 0.35;
  return 0;
}
```

### Component Documentation
- Document props with JSDoc
- Explain complex logic
- Add usage examples

## Release Process

1. **Version Bump**
   ```bash
   npm version patch|minor|major
   ```

2. **Update Changelog**
   - List new features
   - List bug fixes
   - Note breaking changes

3. **Create Release**
   - Tag in Git
   - Create GitHub release
   - Deploy to production

4. **Post-Release**
   - Monitor logs
   - Check error rates
   - Verify key features

## Getting Help

- **Documentation**: Check README.md and API.md
- **Issues**: Search existing issues first
- **Questions**: Open a discussion
- **Bugs**: File an issue with reproduction steps

## Community Guidelines

- Be respectful and inclusive
- Help others learn
- Share knowledge
- Give credit where due
- Follow Code of Conduct

## Resources

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [Tailwind CSS](https://tailwindcss.com)
- [Supabase Docs](https://supabase.com/docs)
- [Hono Documentation](https://hono.dev)

---

Thank you for contributing to ClientChain! 🎉
