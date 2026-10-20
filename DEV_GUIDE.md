# DMCFS Bulk Distribution - Development Guide

## Table of Contents

1. [Getting Started](#getting-started)
2. [Project Structure](#project-structure)
3. [Development Workflow](#development-workflow)
4. [Code Standards](#code-standards)
5. [Testing](#testing)
6. [Debugging](#debugging)
7. [Performance](#performance)
8. [Security](#security)

---

## Getting Started

### Initial Setup

```bash
# Clone repository
git clone <repository-url>
cd dmcfs-bulk-distribution

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Edit with your credentials
nano .env.local

# Start development server
npm run dev
```

### Required Environment Variables

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SENDER_EMAIL=noreply@yourdomain.com
```

---

## Project Structure

```
dmcfs-bulk-distribution/
├── src/
│   ├── App.tsx                 # Main app component
│   ├── main.tsx               # React entry point
│   ├── index.css              # Global styles
│   ├── components.tsx         # Reusable UI components
│   ├── hooks.ts               # Custom React hooks
│   ├── constants.ts           # App constants
│   ├── lib/
│   │   ├── supabase.ts       # Supabase client
│   │   ├── utils.ts          # Utility functions
│   │   └── errors.ts         # Error handling
│
├── supabase/
│   └── functions/
│       └── send-jain-certificates.ts    # Edge Function
│
├── public/                    # Static assets
├── dist/                      # Build output (generated)
│
├── vite.config.ts            # Vite config
├── tsconfig.json             # TypeScript config
├── tailwind.config.js        # Tailwind config
├── package.json              # Dependencies
│
├── README.md                 # User guide
├── DEPLOYMENT.md             # Deployment guide
└── DEV_GUIDE.md             # This file
```

---

## Development Workflow

### 1. Starting Development

```bash
# Start dev server with hot reload
npm run dev

# Server runs on http://localhost:5173
```

### 2. Creating Features

#### Add a new page:

```typescript
// src/pages/NewPage.tsx
export function NewPage() {
  return (
    <div className="space-y-6">
      {/* Content here */}
    </div>
  );
}
```

#### Add a new component:

```typescript
// src/components.tsx
export function MyComponent() {
  return <div>{/* Component JSX */}</div>;
}
```

#### Add a custom hook:

```typescript
// src/hooks.ts
export function useMyHook() {
  const [state, setState] = useState(null);
  // Hook logic
  return { state, setState };
}
```

### 3. Database Operations

#### Read from Supabase:

```typescript
import { supabase } from './lib/supabase';

async function fetchStudents() {
  const { data, error } = await supabase
    .from('students')
    .select('*');
  
  if (error) console.error(error);
  return data;
}
```

#### Write to Supabase:

```typescript
const { error } = await supabase
  .from('students')
  .insert([{ enrollment_no: 'ABC123', ... }]);
```

### 4. Calling Edge Functions

```typescript
async function sendEmails(jobId: string, records: any[]) {
  const { data, error } = await supabase.functions.invoke('send-emails', {
    body: { job_id: jobId, records },
  });
  
  if (error) console.error(error);
  return data;
}
```

---

## Code Standards

### TypeScript

- ✅ Use strict mode (`"strict": true` in tsconfig.json)
- ✅ Define interfaces for data structures
- ✅ Avoid `any` type—use generics or union types
- ✅ Export types alongside implementations

```typescript
// Good
interface Student {
  enrollmentNo: string;
  name: string;
  email: string;
}

function processStudents(students: Student[]): void {
  // Implementation
}

// Bad
function processStudents(students: any[]): void {
  // Missing type info
}
```

### React Components

- ✅ Functional components with hooks
- ✅ Use `React.FC` for typed components
- ✅ Memoize expensive computations with `useMemo`
- ✅ Use `useCallback` for event handlers

```typescript
import { FC, useMemo, useCallback } from 'react';

interface Props {
  items: Item[];
}

export const MyComponent: FC<Props> = ({ items }) => {
  const processed = useMemo(
    () => items.map(transform),
    [items]
  );

  const handleClick = useCallback(() => {
    // Handle click
  }, []);

  return <div>{/* JSX */}</div>;
};
```

### Styling

- ✅ Use Tailwind CSS classes exclusively
- ✅ Follow responsive design (mobile-first)
- ✅ Use consistent spacing (gap, px, py classes)
- ✅ Implement dark mode support

```typescript
// Good
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <Card className="bg-white dark:bg-slate-800" />
</div>

// Bad
<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
  <Card style={{ backgroundColor: 'white' }} />
</div>
```

### Error Handling

- ✅ Use custom error classes
- ✅ Log errors with context
- ✅ Show user-friendly error messages

```typescript
import { AppError, logger } from './lib/errors';

try {
  await fetchData();
} catch (error) {
  logger.error('Failed to fetch data', error);
  showUserMessage('Unable to load data. Please try again.');
}
```

---

## Testing

### Unit Tests

```bash
# Run tests
npm test

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage
```

### Example Test

```typescript
// example.test.ts
import { describe, it, expect } from 'vitest';
import { parseCSV } from './lib/utils';

describe('CSV Parser', () => {
  it('should parse valid CSV', () => {
    const csv = 'name,email\nJohn,john@example.com';
    const result = parseCSV(csv);
    
    expect(result).toHaveLength(2);
    expect(result[1][0]).toBe('John');
  });

  it('should handle quoted fields', () => {
    const csv = '"John Doe","john@example.com"';
    const result = parseCSV(csv);
    
    expect(result[0][0]).toBe('John Doe');
  });
});
```

### Integration Tests

```typescript
// supabase.integration.test.ts
import { supabase } from './lib/supabase';

describe('Supabase Integration', () => {
  it('should fetch students', async () => {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .limit(1);

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });
});
```

---

## Debugging

### VS Code Extensions

Install these for better development:

- **ES7+ React/Redux/React-Native snippets**
- **Tailwind CSS IntelliSense**
- **TypeScript Vue Plugin**
- **ESLint**
- **Prettier**

### Browser DevTools

```javascript
// Log state changes
console.log('State:', state);

// Profile performance
console.time('operation');
// ... code ...
console.timeEnd('operation');

// Debug async operations
await promise.then(
  data => console.log('Success:', data),
  error => console.error('Error:', error)
);
```

### React DevTools

- Install React DevTools browser extension
- Inspect component hierarchy
- Track state changes
- Profile rendering performance

---

## Performance

### Best Practices

1. **Code Splitting**
   ```typescript
   const LazyComponent = lazy(() => import('./Component'));
   ```

2. **Image Optimization**
   ```typescript
   <img src="image.webp" srcSet="image@2x.webp 2x" />
   ```

3. **Memoization**
   ```typescript
   export const MemoComponent = memo(MyComponent);
   ```

4. **Virtualization (for large lists)**
   ```typescript
   // Use react-window for large lists
   import { FixedSizeList } from 'react-window';
   ```

### Performance Monitoring

```typescript
import { logger } from './lib/errors';

// Log performance metrics
const startTime = performance.now();
// ... operation ...
const duration = performance.now() - startTime;
logger.debug(`Operation took ${duration}ms`);

// Monitor long tasks
PerformanceObserver.supportedEntryTypes.includes('longtask') &&
  new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      logger.warn(`Long task detected: ${entry.duration}ms`);
    });
  }).observe({ entryTypes: ['longtask'] });
```

---

## Security

### OWASP Top 10

#### 1. Injection Prevention
- ✅ Use parameterized queries (Supabase handles this)
- ✅ Sanitize user input

```typescript
// Bad
const query = `SELECT * FROM users WHERE id = ${userId}`;

// Good
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId);
```

#### 2. Broken Authentication
- ✅ Use Supabase Auth
- ✅ Never hardcode credentials
- ✅ Use HTTPS only in production

#### 3. Sensitive Data Exposure
- ✅ Never log sensitive data
- ✅ Use environment variables for secrets
- ✅ Enable encryption in Supabase

#### 4. XML External Entities (XXE)
- ✅ Validate file uploads
- ✅ Limit file size

```typescript
function validatePDF(file: File): boolean {
  if (file.type !== 'application/pdf') return false;
  if (file.size > 50 * 1024 * 1024) return false; // 50MB
  return true;
}
```

#### 5. Broken Access Control
- ✅ Use Row-Level Security
- ✅ Verify user permissions before operations

```typescript
// Supabase RLS policy
SELECT * FROM documents
WHERE auth.uid() = user_id;
```

#### 6. Security Misconfiguration
- ✅ Set secure headers
- ✅ Disable debug mode in production
- ✅ Update dependencies regularly

```bash
npm audit fix
npm update
```

#### 7. Cross-Site Scripting (XSS)
- ✅ React automatically escapes content
- ✅ Use `dangerouslySetInnerHTML` only for trusted content

```typescript
// Good - React escapes this
<div>{userInput}</div>

// Dangerous - Only if absolutely necessary
<div dangerouslySetInnerHTML={{ __html: trustedHTML }} />
```

#### 8. Insecure Deserialization
- ✅ Validate JSON before parsing
- ✅ Use TypeScript to enforce types

```typescript
const data = safeJsonParse(json, fallback);
```

#### 9. Using Components with Known Vulnerabilities
- ✅ Run `npm audit` regularly
- ✅ Keep dependencies updated

```bash
npm audit
npm audit fix --audit-level=moderate
```

#### 10. Insufficient Logging & Monitoring
- ✅ Log all important events
- ✅ Monitor for suspicious activity

```typescript
logger.info('Email sent', { jobId, recipientCount });
logger.error('Failed to send email', error, { jobId });
```

### Secrets Management

```bash
# Never commit .env.local
echo ".env.local" >> .gitignore

# Use environment variables in CI/CD
export SUPABASE_URL=$(echo $SUPABASE_URL_SECRET)
```

---

## Common Issues & Solutions

### Issue: Hot reload not working

**Solution:**
```bash
npm run dev -- --host
```

### Issue: TypeScript errors

**Solution:**
```bash
npx tsc --noEmit
# Fix errors shown
```

### Issue: Build size too large

**Solution:**
```bash
# Analyze bundle
npm run build -- --analyze

# Remove unused packages
npm prune --production
```

### Issue: Slow queries

**Solution:**
```typescript
// Use indexes
// In Supabase SQL: CREATE INDEX idx_students_email ON students(email);

// Limit results
.limit(100)

// Select only needed columns
.select('enrollment_no, email')
```

---

## Resources

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Vite Documentation](https://vitejs.dev)

---

## Getting Help

- Check existing issues on GitHub
- Review documentation in README.md
- Contact development team
- Check Slack channel #dmcfs-dev

---

**Last Updated**: September 2024  
**Version**: 1.0.0
