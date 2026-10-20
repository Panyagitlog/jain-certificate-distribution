/**
 * Utility functions for DMCFS Bulk Distribution System
 */

/**
 * Parse CSV text into structured data
 */
export function parseCSV(text: string): string[][] {
  const lines = text.trim().split('\n');
  return lines.map(line => {
    // Handle quoted fields with commas
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    fields.push(current.trim());
    return fields;
  });
}

/**
 * Validate email address format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.toLowerCase());
}

/**
 * Validate enrollment number format (flexible)
 */
export function isValidEnrollmentNo(enrollmentNo: string): boolean {
  return enrollmentNo && enrollmentNo.trim().length > 0;
}

/**
 * Extract enrollment number from PDF filename
 */
export function extractEnrollmentFromFileName(fileName: string): string {
  // Remove .pdf extension
  return fileName.replace(/\.pdf$/i, '').trim();
}

/**
 * Compare two enrollment numbers for exact match
 */
export function enrollmentNumbersMatch(a: string, b: string): boolean {
  return a.trim().toUpperCase() === b.trim().toUpperCase();
}

/**
 * Detect duplicate enrollment numbers in array
 */
export function findDuplicates(items: Array<{ enrollmentNo: string }>): Set<string> {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  items.forEach(item => {
    const normalized = item.enrollmentNo.toUpperCase().trim();
    if (seen.has(normalized)) {
      duplicates.add(normalized);
    } else {
      seen.add(normalized);
    }
  });

  return duplicates;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(date: Date): string {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Calculate success rate percentage
 */
export function calculateSuccessRate(sent: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((sent / total) * 100);
}

/**
 * Generate CSV content from array of objects
 */
export function generateCSV(data: Array<Record<string, any>>, columns: string[]): string {
  if (data.length === 0) return '';

  // Header row
  const header = columns.join(',');

  // Data rows
  const rows = data.map(item => {
    return columns.map(col => {
      const value = item[col];
      // Escape quotes and wrap in quotes if contains comma
      if (value === null || value === undefined) {
        return '';
      }
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',');
  });

  return [header, ...rows].join('\n');
}

/**
 * Export CSV file
 */
export function downloadCSV(csv: string, fileName: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Validate PDF file
 */
export function isValidPDF(file: File): boolean {
  // Check file extension
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    return false;
  }

  // Check MIME type
  if (file.type && file.type !== 'application/pdf') {
    return false;
  }

  // Check minimum file size (PDFs should be at least 100 bytes)
  if (file.size < 100) {
    return false;
  }

  // Check maximum file size (50MB)
  if (file.size > 50 * 1024 * 1024) {
    return false;
  }

  return true;
}

/**
 * Parse ZIP file contents (basic check)
 */
export function isZIPFile(file: File): boolean {
  return file.type === 'application/zip' || 
         file.name.toLowerCase().endsWith('.zip');
}

/**
 * Generate job report summary
 */
export interface JobSummary {
  totalRecords: number;
  matched: number;
  missingPDF: number;
  invalidEmail: number;
  duplicates: number;
  successRate: number;
}

export function generateJobSummary(results: Array<{
  status: 'matched' | 'missing_pdf' | 'invalid_email' | 'duplicate';
}>): JobSummary {
  const matched = results.filter(r => r.status === 'matched').length;
  const missingPDF = results.filter(r => r.status === 'missing_pdf').length;
  const invalidEmail = results.filter(r => r.status === 'invalid_email').length;
  const duplicates = results.filter(r => r.status === 'duplicate').length;
  const total = results.length;

  return {
    totalRecords: total,
    matched,
    missingPDF,
    invalidEmail,
    duplicates,
    successRate: calculateSuccessRate(matched, total),
  };
}

/**
 * Retry failed records (mock)
 */
export function getRetriableRecords(results: Array<{
  status: string;
  enrollmentNo: string;
}>): string[] {
  return results
    .filter(r => r.status === 'failed')
    .map(r => r.enrollmentNo);
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

/**
 * Sanitize filename for storage
 */
export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .toLowerCase()
    .slice(0, 255);
}

/**
 * Validate job name
 */
export function isValidJobName(name: string): boolean {
  return name && name.trim().length > 0 && name.trim().length <= 255;
}

/**
 * Generate unique job ID
 */
export function generateJobId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Parse JSON with error handling
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

/**
 * Deep clone object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Chunk array into smaller arrays
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
