-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Students table
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enrollment_no VARCHAR(255) NOT NULL UNIQUE,
  student_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_students_enrollment_no ON students(enrollment_no);
CREATE INDEX idx_students_email ON students(email);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enrollment_no VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  storage_path VARCHAR(500) NOT NULL,
  file_size BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (enrollment_no) REFERENCES students(enrollment_no)
);

CREATE INDEX idx_documents_enrollment_no ON documents(enrollment_no);
CREATE INDEX idx_documents_file_name ON documents(file_name);

-- Email Jobs table
CREATE TABLE IF NOT EXISTS email_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'processing',
  total_records INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_by UUID
);

CREATE INDEX idx_email_jobs_status ON email_jobs(status);
CREATE INDEX idx_email_jobs_created_at ON email_jobs(created_at DESC);

-- Email Job Items table (individual delivery records)
CREATE TABLE IF NOT EXISTS email_job_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL,
  enrollment_no VARCHAR(255) NOT NULL,
  student_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  document_path VARCHAR(500),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  provider_message_id VARCHAR(255),
  error_message TEXT,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES email_jobs(id) ON DELETE CASCADE
);

CREATE INDEX idx_email_job_items_job_id ON email_job_items(job_id);
CREATE INDEX idx_email_job_items_enrollment_no ON email_job_items(enrollment_no);
CREATE INDEX idx_email_job_items_status ON email_job_items(status);

-- Audit Log table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID,
  action VARCHAR(100) NOT NULL,
  details JSONB,
  created_by UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES email_jobs(id) ON DELETE CASCADE
);

CREATE INDEX idx_audit_logs_job_id ON audit_logs(job_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- RLS Policies (adjust based on your auth setup)
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_job_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all
CREATE POLICY "Allow read for authenticated users" ON students
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow read for authenticated users" ON documents
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow read for authenticated users" ON email_jobs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow read for authenticated users" ON email_job_items
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow read for authenticated users" ON audit_logs
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow insert/update/delete for authenticated users (adjust as needed)
CREATE POLICY "Allow insert for authenticated users" ON email_jobs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow insert for authenticated users" ON email_job_items
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Storage bucket policies
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Allow authenticated users to upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to read documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow public users to upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow public users to read documents" ON storage.objects;

CREATE POLICY "Allow public users to upload documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents'
  );

CREATE POLICY "Allow public users to read documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents'
  );
