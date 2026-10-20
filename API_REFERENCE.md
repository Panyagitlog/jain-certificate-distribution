# DMCFS Bulk Distribution - API & Module Reference

## Table of Contents

1. [Supabase Client](#supabase-client)
2. [Utility Functions](#utility-functions)
3. [Custom Hooks](#custom-hooks)
4. [Components](#components)
5. [Error Handling](#error-handling)
6. [Constants](#constants)
7. [Edge Functions](#edge-functions)

---

## Supabase Client

Located: `src/lib/supabase.ts`

### Setup

```typescript
import { supabase } from './lib/supabase';
```

### Methods

#### `uploadStudents(data)`

Upload student records to database.

**Parameters:**
- `data`: `Array<{ enrollmentNo: string; name: string; email: string }>`

**Returns:** `Promise<{ success: boolean; error?: string }>`

**Example:**
```typescript
const result = await uploadStudents([
  { enrollmentNo: 'ABC001', name: 'John Doe', email: 'john@example.com' }
]);
```

#### `uploadDocument(enrollmentNo, file)`

Upload PDF document to storage.

**Parameters:**
- `enrollmentNo`: `string` - Student enrollment number
- `file`: `File` - PDF file object

**Returns:** `Promise<{ success: boolean; error?: string }>`

**Example:**
```typescript
const file = new File(['content'], 'ABC001.pdf', { type: 'application/pdf' });
const result = await uploadDocument('ABC001', file);
```

#### `createEmailJob(jobName, totalRecords)`

Create a new email distribution job.

**Parameters:**
- `jobName`: `string` - Name of the job
- `totalRecords`: `number` - Total records to process

**Returns:** `Promise<{ jobId: string } | { error: string }>`

**Example:**
```typescript
const { jobId } = await createEmailJob('Batch 001', 1250);
```

#### `getEmailJobResults(jobId)`

Retrieve results for a completed job.

**Parameters:**
- `jobId`: `string` - ID of the email job

**Returns:** `Promise<{ results: EmailResult[] } | { error: string }>`

**Example:**
```typescript
const { results } = await getEmailJobResults(jobId);
results.forEach(r => console.log(r.status, r.email));
```

---

## Utility Functions

Located: `src/lib/utils.ts`

### CSV Parsing

#### `parseCSV(text: string): string[][]`

Parse CSV text with support for quoted fields.

```typescript
const csv = 'name,email\n"Doe, John",john@example.com';
const rows = parseCSV(csv);
// rows = [['name', 'email'], ['Doe, John', 'john@example.com']]
```

### Validation

#### `isValidEmail(email: string): boolean`

Validate email address format.

```typescript
isValidEmail('john@example.com'); // true
isValidEmail('invalid-email'); // false
```

#### `isValidEnrollmentNo(enrollmentNo: string): boolean`

Validate enrollment number (non-empty).

```typescript
isValidEnrollmentNo('ABC001'); // true
isValidEnrollmentNo(''); // false
```

### File Utilities

#### `extractEnrollmentFromFileName(fileName: string): string`

Extract enrollment number from PDF filename.

```typescript
extractEnrollmentFromFileName('ABC001.pdf'); // 'ABC001'
```

#### `isValidPDF(file: File): boolean`

Validate PDF file (type, size, etc).

```typescript
const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
isValidPDF(file); // true
```

#### `isZIPFile(file: File): boolean`

Check if file is ZIP archive.

```typescript
isZIPFile(zipFile); // true
```

### Data Utilities

#### `findDuplicates(items: Array<{enrollmentNo: string}>): Set<string>`

Find duplicate enrollment numbers.

```typescript
const dups = findDuplicates([
  { enrollmentNo: 'ABC001' },
  { enrollmentNo: 'ABC001' }
]);
// dups = Set { 'ABC001' }
```

#### `chunk<T>(array: T[], size: number): T[][]`

Split array into chunks.

```typescript
const chunks = chunk([1, 2, 3, 4, 5], 2);
// chunks = [[1, 2], [3, 4], [5]]
```

### Formatting

#### `formatFileSize(bytes: number): string`

Format bytes to human-readable size.

```typescript
formatFileSize(1024 * 1024); // '1 MB'
formatFileSize(512); // '512 Bytes'
```

#### `formatTimestamp(date: Date): string`

Format date/time for display.

```typescript
formatTimestamp(new Date()); // '09/16/2024 02:30:15 PM'
```

#### `calculateSuccessRate(sent: number, total: number): number`

Calculate percentage success rate.

```typescript
calculateSuccessRate(98, 100); // 98
calculateSuccessRate(0, 0); // 0
```

### Export Utilities

#### `generateCSV(data: Array<Record<string, any>>, columns: string[]): string`

Generate CSV content from data.

```typescript
const csv = generateCSV(
  [{ name: 'John', email: 'john@example.com' }],
  ['name', 'email']
);
// csv = 'name,email\nJohn,john@example.com'
```

#### `downloadCSV(csv: string, fileName: string): void`

Trigger browser download of CSV file.

```typescript
const csv = generateCSV(data, columns);
downloadCSV(csv, 'results.csv');
```

---

## Custom Hooks

Located: `src/hooks.ts`

### `useAsync<T>(asyncFunction, immediate?)`

Manage async operation state.

```typescript
const { execute, status, data, error } = useAsync(async () => {
  return await fetch('/api/data').then(r => r.json());
});

// Use in JSX
{status === 'pending' && <Spinner />}
{status === 'success' && <div>{data}</div>}
{status === 'error' && <Error>{error.message}</Error>}
```

### `useForm<T>(initialValues)`

Manage form state.

```typescript
const { values, errors, handleChange, handleBlur, resetForm } = useForm({
  name: '',
  email: ''
});

return (
  <form>
    <input
      name="name"
      value={values.name}
      onChange={handleChange}
      onBlur={handleBlur}
    />
    {errors.name && <span>{errors.name}</span>}
  </form>
);
```

### `useSupabaseQuery<T>(table, options?)`

Query Supabase data.

```typescript
const { data: students, loading, error } = useSupabaseQuery('students', {
  select: 'enrollment_no, name, email',
  limit: 100,
  order: { column: 'name', ascending: true }
});
```

### `useLocalStorage<T>(key, initialValue)`

Persist state in localStorage.

```typescript
const [theme, setTheme] = useLocalStorage('theme', 'light');
setTheme('dark'); // Persists to localStorage
```

### `useDebounce<T>(value, delay)`

Debounce value changes.

```typescript
const [input, setInput] = useState('');
const debouncedInput = useDebounce(input, 300);

useEffect(() => {
  // Search only after user stops typing
  search(debouncedInput);
}, [debouncedInput]);
```

### `useClickOutside(callback)`

Detect clicks outside element.

```typescript
const ref = useClickOutside(() => setOpen(false));

return (
  <div ref={ref} className="menu">
    {/* Menu content */}
  </div>
);
```

### `usePagination<T>(items, itemsPerPage)`

Manage pagination state.

```typescript
const {
  currentPage,
  totalPages,
  currentItems,
  goToPage,
  goToNextPage
} = usePagination(allItems, 10);
```

### `useCountdown(initialCount)`

Manage countdown timer.

```typescript
const { count, isActive, start, pause, reset } = useCountdown(60);

return (
  <>
    <p>{count}s remaining</p>
    <button onClick={start}>Start</button>
    <button onClick={pause}>Pause</button>
  </>
);
```

---

## Components

Located: `src/components.tsx`

### UI Components

#### `<Modal>`

Display modal dialog.

```typescript
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirm Action"
  size="md"
>
  <p>Are you sure?</p>
</Modal>
```

#### `<Alert>`

Show alert message.

```typescript
<Alert
  type="success"
  title="Success"
  message="Operation completed"
  onClose={() => setAlert(null)}
/>
```

#### `<Button>`

Styled button component.

```typescript
<Button
  variant="primary"
  size="md"
  onClick={handleClick}
  isLoading={loading}
  icon={<SendIcon />}
>
  Send Email
</Button>
```

#### `<Card>`

Card container.

```typescript
<Card
  title="Statistics"
  subtitle="Last 30 days"
  footer={<button>View Details</button>}
>
  <p>Card content</p>
</Card>
```

#### `<ProgressBar>`

Display progress.

```typescript
<ProgressBar value={45} max={100} showLabel color="blue" />
```

#### `<Badge>`

Small label component.

```typescript
<Badge variant="success" label="Sent" icon={<CheckIcon />} />
```

#### `<FormInput>`

Styled input with validation.

```typescript
<FormInput
  label="Email"
  name="email"
  type="email"
  error={errors.email}
  value={values.email}
  onChange={handleChange}
  required
/>
```

#### `<FileUpload>`

File upload component.

```typescript
<FileUpload
  onFiles={(files) => handleUpload(files)}
  accept=".pdf,.zip"
  multiple
  maxSize={100}
/>
```

#### `<LoadingSpinner>`

Loading indicator.

```typescript
<LoadingSpinner size="md" />
```

#### `<Pagination>`

Page navigation.

```typescript
<Pagination
  page={currentPage}
  totalPages={totalPages}
  onPageChange={goToPage}
/>
```

---

## Error Handling

Located: `src/lib/errors.ts`

### Error Classes

#### `AppError`

Base application error.

```typescript
throw new AppError(
  'CUSTOM_ERROR',
  'Something went wrong',
  500,
  { details: 'Additional context' }
);
```

#### `ValidationError`

Data validation error.

```typescript
throw new ValidationError('Invalid email', { field: 'email' });
```

#### `FileError`

File operation error.

```typescript
throw new FileError('File too large');
```

#### `NetworkError`

Network communication error.

```typescript
throw new NetworkError('Failed to connect');
```

### Logger

#### `logger.debug(message, data?)`

Debug log.

```typescript
logger.debug('Starting process', { userId: 123 });
```

#### `logger.info(message, data?)`

Info log.

```typescript
logger.info('Email sent', { jobId, count: 50 });
```

#### `logger.warn(message, data?)`

Warning log.

```typescript
logger.warn('Retry attempt', { attempt: 2 });
```

#### `logger.error(message, error?, data?)`

Error log.

```typescript
logger.error('Failed to fetch', error, { url: '/api/data' });
```

### Utilities

#### `handleError(error): AppError`

Normalize errors to AppError.

```typescript
try {
  await operation();
} catch (error) {
  const appError = handleError(error);
  showUserMessage(appError.message);
}
```

#### `retryAsync<T>(fn, options?)`

Retry failed operations.

```typescript
const result = await retryAsync(
  () => fetchData(),
  {
    maxAttempts: 3,
    initialDelay: 1000,
    onRetry: (attempt, error) => {
      console.log(`Retry ${attempt}: ${error.message}`);
    }
  }
);
```

#### `validate<T>(data, schema): T`

Validate data structure.

```typescript
const schema = {
  email: (value) => ({
    valid: isValidEmail(value),
    error: 'Invalid email'
  })
};

const data = validate({ email: 'test@example.com' }, schema);
```

---

## Constants

Located: `src/constants.ts`

### API Configuration

```typescript
import { API, TABLES, STORAGE, EDGE_FUNCTIONS } from './constants';

console.log(API.SUPABASE_URL);
console.log(TABLES.EMAIL_JOBS);
console.log(STORAGE.DOCUMENTS_BUCKET);
```

### Status Constants

```typescript
import { JOB_STATUS, EMAIL_STATUS, MATCH_STATUS } from './constants';

const status = JOB_STATUS.COMPLETED;
const emailStatus = EMAIL_STATUS.SENT;
```

### Validation Rules

```typescript
import { VALIDATION, FILE_VALIDATION } from './constants';

console.log(VALIDATION.EMAIL_REGEX);
console.log(FILE_VALIDATION.PDF.maxSize);
```

### Messages

```typescript
import { TOAST_MESSAGES } from './constants';

showToast(TOAST_MESSAGES.IMPORT_FAILED);
```

---

## Edge Functions

### `send-emails`

Endpoint for bulk email sending.

**Endpoint:** `https://your-project.supabase.co/functions/v1/send-jain-certificates`

**Method:** `POST`

**Headers:**
```
Authorization: Bearer {ANON_KEY}
Content-Type: application/json
```

**Body:**
```json
{
  "job_id": "uuid-string",
  "records": [
    {
      "enrollment_no": "ABC001",
      "student_name": "John Doe",
      "email": "john@example.com",
      "document_path": "documents/ABC001.pdf"
    }
  ]
}
```

**Response Success:**
```json
{
  "success": true,
  "job_id": "uuid-string",
  "sent": 98,
  "failed": 2,
  "results": [
    {
      "enrollment_no": "ABC001",
      "status": "sent",
      "messageId": "msg-123"
    }
  ]
}
```

**Response Error:**
```json
{
  "error": "Error message"
}
```

**Example Usage:**
```typescript
const { data, error } = await supabase.functions.invoke('send-emails', {
  body: {
    job_id: jobId,
    records: emailRecords
  }
});

if (error) {
  logger.error('Email function failed', error);
} else {
  logger.info('Emails sent', data);
}
```

---

## Database Schema

### Tables

#### `students`
```sql
enrollment_no VARCHAR(255) -- PRIMARY, UNIQUE
name VARCHAR(255)
email VARCHAR(255)
created_at TIMESTAMP
updated_at TIMESTAMP
```

#### `documents`
```sql
enrollment_no VARCHAR(255) -- FOREIGN KEY → students
file_name VARCHAR(255)
storage_path VARCHAR(500)
file_size BIGINT
created_at TIMESTAMP
```

#### `email_jobs`
```sql
id UUID -- PRIMARY
job_name VARCHAR(255)
status VARCHAR(50) -- processing, completed, failed
total_records INTEGER
sent_count INTEGER
failed_count INTEGER
created_at TIMESTAMP
completed_at TIMESTAMP
```

#### `email_job_items`
```sql
id UUID -- PRIMARY
job_id UUID -- FOREIGN KEY → email_jobs
enrollment_no VARCHAR(255)
email VARCHAR(255)
status VARCHAR(50) -- sent, failed, pending
error_message TEXT
sent_at TIMESTAMP
created_at TIMESTAMP
```

---

## Type Definitions

```typescript
interface Student {
  enrollmentNo: string;
  name: string;
  email: string;
}

interface Document {
  enrollmentNo: string;
  fileName: string;
  storagePath: string;
}

interface MatchResult {
  enrollmentNo: string;
  name: string;
  email: string;
  document: string;
  status: 'matched' | 'missing_pdf' | 'invalid_email' | 'duplicate';
  error?: string;
}

interface EmailResult {
  enrollmentNo: string;
  name: string;
  email: string;
  status: 'sent' | 'failed' | 'skipped';
  error?: string;
  timestamp: string;
}

interface Job {
  id: string;
  name: string;
  createdAt: string;
  totalRecords: number;
  sent: number;
  failed: number;
  status: 'processing' | 'completed' | 'in_progress';
}
```

---

## Version History

- **1.0.0** (Sept 2024) - Initial release

---

## Support

For detailed implementation examples and troubleshooting, see:
- `README.md` - User guide
- `DEV_GUIDE.md` - Development guide
- `DEPLOYMENT.md` - Deployment guide
