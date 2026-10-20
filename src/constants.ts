/**
 * DMCFS Bulk Distribution - Application Constants
 */

// Environment
export const ENV = import.meta.env.MODE;
export const IS_DEV = ENV === 'development';
export const IS_PROD = ENV === 'production';

// API Configuration
export const API = {
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  SUPABASE_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  SENDER_EMAIL: import.meta.env.VITE_SENDER_EMAIL,
  SENDER_NAME: import.meta.env.VITE_SENDER_NAME || 'DMCFS Distribution',
};

// Table Names
export const TABLES = {
  STUDENTS: 'students',
  DOCUMENTS: 'documents',
  EMAIL_JOBS: 'email_jobs',
  EMAIL_JOB_ITEMS: 'email_job_items',
  AUDIT_LOGS: 'audit_logs',
} as const;

// Storage Buckets
export const STORAGE = {
  DOCUMENTS_BUCKET: 'documents',
} as const;

// Edge Functions
export const EDGE_FUNCTIONS = {
  SEND_EMAILS: 'send-emails',
} as const;

// Job Status
export const JOB_STATUS = {
  PROCESSING: 'processing',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export type JobStatus = typeof JOB_STATUS[keyof typeof JOB_STATUS];

// Email Status
export const EMAIL_STATUS = {
  PENDING: 'pending',
  SENT: 'sent',
  FAILED: 'failed',
  MISSING_PDF: 'missing_pdf',
  INVALID_EMAIL: 'invalid_email',
  DUPLICATE: 'duplicate',
  SKIPPED: 'skipped',
} as const;

export type EmailStatus = typeof EMAIL_STATUS[keyof typeof EMAIL_STATUS];

// Match Status
export const MATCH_STATUS = {
  MATCHED: 'matched',
  MISSING_PDF: 'missing_pdf',
  INVALID_EMAIL: 'invalid_email',
  DUPLICATE: 'duplicate',
} as const;

export type MatchStatus = typeof MATCH_STATUS[keyof typeof MATCH_STATUS];

// File Validation
export const FILE_VALIDATION = {
  PDF: {
    mimeType: 'application/pdf',
    extension: '.pdf',
    maxSize: 50 * 1024 * 1024, // 50MB
    minSize: 100, // 100 bytes
  },
  CSV: {
    mimeType: 'text/csv',
    extension: '.csv',
    maxSize: 10 * 1024 * 1024, // 10MB
  },
  XLSX: {
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    extension: '.xlsx',
    maxSize: 10 * 1024 * 1024, // 10MB
  },
  ZIP: {
    mimeType: 'application/zip',
    extension: '.zip',
    maxSize: 500 * 1024 * 1024, // 500MB
  },
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
  DEFAULT_PAGE: 1,
} as const;

// Toast Messages
export const TOAST_MESSAGES = {
  // Success
  STUDENTS_IMPORTED: 'Student data imported successfully',
  DOCUMENTS_INDEXED: 'PDF documents indexed successfully',
  MATCHING_COMPLETE: 'Matching process completed',
  JOB_CREATED: 'Distribution job created',
  EMAIL_SENT: 'Email sent successfully',
  EXPORT_SUCCESS: 'Results exported successfully',

  // Error
  IMPORT_FAILED: 'Failed to import data',
  VALIDATION_FAILED: 'Validation failed. Please check your data',
  UPLOAD_FAILED: 'File upload failed',
  EMAIL_SEND_FAILED: 'Failed to send email',
  NETWORK_ERROR: 'Network error. Please check your connection',
  INVALID_DATA: 'Invalid data format',
  FILE_TOO_LARGE: 'File size exceeds maximum limit',
  INVALID_FILE_TYPE: 'Invalid file type',

  // Info
  NO_DATA: 'No data available',
  PROCESSING: 'Processing...',
  LOADING: 'Loading...',
} as const;

// Validation Rules
export const VALIDATION = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  ENROLLMENT_MIN_LENGTH: 1,
  ENROLLMENT_MAX_LENGTH: 255,
  NAME_MIN_LENGTH: 1,
  NAME_MAX_LENGTH: 255,
  JOB_NAME_MIN_LENGTH: 1,
  JOB_NAME_MAX_LENGTH: 255,
} as const;

// UI Constants
export const UI = {
  MODAL_ANIMATION_DURATION: 200,
  TOAST_AUTO_CLOSE_DURATION: 5000,
  DEBOUNCE_DELAY: 300,
  THROTTLE_DELAY: 100,
  MIN_SEARCH_DELAY: 500,
} as const;

// Colors
export const COLORS = {
  PRIMARY: '#2563EB', // blue-600
  SUCCESS: '#16A34A', // green-600
  ERROR: '#DC2626', // red-600
  WARNING: '#EA580C', // orange-600
  INFO: '#0284C7', // blue-600
  NEUTRAL: '#64748B', // slate-500
} as const;

// Date Formats
export const DATE_FORMATS = {
  SHORT: 'MMM dd, yyyy',
  LONG: 'MMMM dd, yyyy',
  TIME_SHORT: 'hh:mm a',
  TIME_LONG: 'hh:mm:ss a',
  DATETIME_SHORT: 'MMM dd, yyyy hh:mm a',
  DATETIME_LONG: 'MMMM dd, yyyy hh:mm:ss a',
} as const;

// API Retry Configuration
export const API_RETRY = {
  MAX_ATTEMPTS: 3,
  INITIAL_DELAY: 1000, // 1 second
  MAX_DELAY: 10000, // 10 seconds
  BACKOFF_MULTIPLIER: 2,
} as const;

// Rate Limiting
export const RATE_LIMIT = {
  REQUESTS_PER_SECOND: 10,
  BULK_EMAIL_BATCH_SIZE: 100,
  MAX_FILE_UPLOADS_PER_MINUTE: 5,
} as const;

// Feature Flags (can be toggled per environment)
export const FEATURES = {
  ENABLE_AUTHENTICATION: false,
  ENABLE_ANALYTICS: false,
  ENABLE_ERROR_TRACKING: false,
  ENABLE_ADVANCED_FILTERING: true,
  ENABLE_BULK_OPERATIONS: true,
  ENABLE_EXPORT: true,
  ENABLE_RETRY: true,
} as const;

// CSV Column Mapping
export const CSV_COLUMNS = {
  STUDENT_DATA: {
    ENROLLMENT_NO: ['enrollment', 'enrollment no', 'enrollment number', 'roll no', 'student id'],
    NAME: ['name', 'student name', 'full name'],
    EMAIL: ['email', 'email id', 'email address'],
  },
} as const;

// Error Codes
export const ERROR_CODES = {
  INVALID_FILE: 'INVALID_FILE',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  MATCHING_FAILED: 'MATCHING_FAILED',
  EMAIL_SEND_FAILED: 'EMAIL_SEND_FAILED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

// Support & Help URLs
export const HELP_URLS = {
  DOCS: 'https://docs.dmcfs.example.com',
  SUPPORT: 'https://support.dmcfs.example.com',
  FAQ: 'https://help.dmcfs.example.com/faq',
  CONTACT: 'support@dmcfs.example.com',
} as const;

// Logging Configuration
export const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
} as const;

export const LOG_LEVEL = IS_DEV ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO;

// Performance Thresholds (in milliseconds)
export const PERFORMANCE = {
  SLOW_REQUEST: 3000,
  SLOW_RENDER: 1000,
} as const;

// Default Limits
export const LIMITS = {
  MAX_STUDENTS_PER_IMPORT: 10000,
  MAX_PDFS_PER_BATCH: 1000,
  MAX_CONCURRENT_EMAILS: 50,
  MAX_RESULTS_PER_PAGE: 100,
  MIN_RESULTS_PER_PAGE: 10,
} as const;

// Email Configuration
export const EMAIL = {
  FROM: API.SENDER_EMAIL || 'noreply@dmcfs.example.com',
  REPLY_TO: 'support@dmcfs.example.com',
  MAX_RECIPIENTS_PER_EMAIL: 1, // One per student
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 5000, // 5 seconds
} as const;

// Validation Error Messages
export const VALIDATION_MESSAGES = {
  REQUIRED_FIELD: 'This field is required',
  INVALID_EMAIL: 'Please enter a valid email address',
  INVALID_ENROLLMENT: 'Please enter a valid enrollment number',
  FILE_REQUIRED: 'Please upload a file',
  INVALID_FILE_TYPE: 'File type is not supported',
  FILE_TOO_LARGE: 'File size exceeds the maximum limit',
  MIN_LENGTH: (length: number) => `Must be at least ${length} characters`,
  MAX_LENGTH: (length: number) => `Must not exceed ${length} characters`,
} as const;
