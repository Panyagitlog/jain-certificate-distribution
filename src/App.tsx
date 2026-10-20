import React, { useCallback, useEffect, useState } from 'react';
import { getDocument } from 'pdfjs-dist';
import * as XLSX from 'xlsx';
import { AlertCircle, CheckCheck, CheckCircle, Clock, Download, FileText, Send, Upload, XCircle } from 'lucide-react';
import { getSupabaseConfigError, normalizeStoragePath, storageBucket, supabase } from './lib/supabase';

interface Student { enrollmentNo: string; name: string; email: string; whatsappMobile: string }
interface DocumentRecord { enrollmentNo: string; fileName: string; storagePath: string }
type MatchStatus = 'matched' | 'missing_pdf' | 'invalid_email' | 'duplicate';
interface MatchResult extends Student { document: string; status: MatchStatus; error?: string }
interface EmailResult { enrollmentNo: string; name: string; email: string; status: 'sent' | 'failed'; providerMessageId?: string; error?: string; timestamp: string }
interface Job { id: string; name: string; createdAt: string; totalRecords: number; sent: number; failed: number }

const defaultStudentText = 'JAIN Certificate Number,Student Name,Email ID,WhatsApp Mobile\nJAIN-CERT-001,Rahul Sharma,rahul@example.com,\nJAIN-CERT-002,Priya Patil,priya@example.com,';

export default function DMCFSBulkApp() {
  const [studentText, setStudentText] = useState(defaultStudentText);
  const [studentFile, setStudentFile] = useState<File | null>(null);
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [emailResults, setEmailResults] = useState<EmailResult[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isStarting, setIsStarting] = useState(false);
  const [progress, setProgress] = useState(0);

  const parseCsv = useCallback((text: string): Student[] => {
    const rows = text.trim().split(/\r?\n/).map(line => {
      const cells: string[] = []; let cell = ''; let quoted = false;
      for (let index = 0; index < line.length; index++) {
        const character = line[index];
        if (character === '"') { if (quoted && line[index + 1] === '"') { cell += '"'; index++; } else quoted = !quoted; }
        else if (character === ',' && !quoted) { cells.push(cell.trim()); cell = ''; } else cell += character;
      }
      cells.push(cell.trim()); return cells;
    });
    if (rows.length < 2) return [];
    const headers = rows[0].map(header => header.replace(/^\uFEFF/, '').toLowerCase());
    const enrollmentIndex = headers.findIndex(header => header.includes('certificate') || header.includes('enrollment'));
    const nameIndex = headers.findIndex(header => header.includes('name'));
    const emailIndex = headers.findIndex(header => header.includes('email'));
    const whatsappIndex = headers.findIndex(header => header.includes('whatsapp'));
    const mobileIndex = whatsappIndex >= 0 ? whatsappIndex : headers.findIndex(header => header.includes('mobile') || header.includes('phone'));
    if (enrollmentIndex < 0 || nameIndex < 0 || emailIndex < 0) return [];
    return rows.slice(1).filter(row => row.length > Math.max(enrollmentIndex, nameIndex, emailIndex) && row[enrollmentIndex]).map(row => ({ enrollmentNo: row[enrollmentIndex], name: row[nameIndex], email: row[emailIndex], whatsappMobile: mobileIndex >= 0 ? row[mobileIndex] || '' : '' }));
  }, []);

  const parseStudentFile = useCallback(async (file: File) => {
    const extension = file.name.toLowerCase().split('.').pop();
    if (extension === 'xlsx' || extension === 'xls' || extension === 'xlsb' || extension === 'ods') {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      return parseCsv(XLSX.utils.sheet_to_csv(workbook.Sheets[workbook.SheetNames[0]]));
    }
    return parseCsv(await file.text());
  }, [parseCsv]);

  const parseDocuments = useCallback(async (files: File[]) => Promise.all(files.map(async file => {
    let enrollmentNo = file.name.replace(/\.pdf$/i, '').toUpperCase();
    try {
      const pdf = await getDocument({ data: await file.arrayBuffer(), disableWorker: true } as Parameters<typeof getDocument>[0]).promise;
      let text = '';
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber); const content = await page.getTextContent();
        text += ` ${content.items.map(item => ('str' in item ? item.str : '')).join(' ')}`;
      }
      const match = text.match(/\b(?:JAIN[\s-]*(?:CERT(?:IFICATE)?[\s-]*)?(?:NO\.?[\s:-]*)?[A-Z0-9/-]{3,}|CERTIFICATE[\s-]*(?:NO\.?[\s:-]*)?[A-Z0-9/-]{3,})\b/i); if (match) enrollmentNo = match[0].replace(/\s+/g, '-').toUpperCase();
    } catch { /* image-only PDF: use filename */ }
    return { enrollmentNo, fileName: file.name, storagePath: `/documents/${file.name}` };
  })), []);

  const matchStudents = useCallback((studentList: Student[], documentList: DocumentRecord[]) => {
    const documentMap = new Map(documentList.map(document => [document.enrollmentNo, document.fileName]));
    const seen = new Set<string>();
    return studentList.map(student => {
      if (seen.has(student.enrollmentNo)) return { ...student, document: '', status: 'duplicate' as const, error: 'Duplicate JAIN certificate number' };
      seen.add(student.enrollmentNo);
      const document = documentMap.get(student.enrollmentNo) || '';
      if (!document) return { ...student, document: '', status: 'missing_pdf' as const, error: `No JAIN certificate PDF found for: ${student.enrollmentNo}` };
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(student.email)) return { ...student, document, status: 'invalid_email' as const, error: 'Invalid email format' };
      return { ...student, document, status: 'matched' as const };
    });
  }, []);

  const sendMatches = useCallback(async (results: MatchResult[], files: File[], totalRecords: number) => {
    const matched = results.filter(result => result.status === 'matched');
    const filesByName = new Map(files.map(file => [file.name, file]));
    const uploadedRecords: Array<{ enrollment_no: string; student_name: string; email: string; document_path: string }> = [];
    const failedResults: EmailResult[] = [];

    for (let index = 0; index < matched.length; index++) {
      const result = matched[index];
      const file = filesByName.get(result.document);
      const storagePath = normalizeStoragePath(`${result.enrollmentNo}/${result.document}`);

      if (!file) {
        failedResults.push({ ...result, status: 'failed', error: 'The matched PDF file is no longer available.', timestamp: new Date().toISOString() });
        continue;
      }

      const configError = getSupabaseConfigError();
      if (configError) {
        failedResults.push({ ...result, status: 'failed', error: `PDF upload failed: ${configError}`, timestamp: new Date().toISOString() });
        continue;
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      console.info('[Storage upload]', {
        bucket: storageBucket,
        fileName: file.name,
        hasSession: Boolean(sessionData.session),
        userId: sessionData.session?.user.id || null,
        sessionError: sessionError?.message || null,
      });

      const { error: uploadError } = await supabase.storage.from(storageBucket).upload(storagePath, file, { upsert: true, contentType: 'application/pdf' });
      if (uploadError) {
        console.error('[Storage upload failed]', {
          bucket: storageBucket,
          fileName: file.name,
          hasSession: Boolean(sessionData.session),
          userId: sessionData.session?.user.id || null,
          message: uploadError.message,
          code: uploadError.name || null,
        });
        const bucketMessage = /bucket not found|failed to find the bucket|HTTP 400/i.test(uploadError.message)
          ? `PDF upload failed: Storage bucket "${storageBucket}" is missing or unavailable. Run database-schema.sql in the connected Supabase project.`
          : `PDF upload failed: ${uploadError.message}`;
        failedResults.push({ ...result, status: 'failed', error: bucketMessage, timestamp: new Date().toISOString() });
      } else {
        uploadedRecords.push({ enrollment_no: result.enrollmentNo, student_name: result.name, email: result.email, document_path: storagePath });
      }
      setProgress(Math.round(((index + 1) / matched.length) * 50));
    }

    let sentResults: EmailResult[] = [...failedResults];
    if (uploadedRecords.length > 0) {
      const { data, error } = await supabase.functions.invoke('send-jain-certificates', { body: { records: uploadedRecords } });
      if (error) {
        let functionError = '';
        const response = (error as { context?: Response }).context;
        if (response) {
          try {
            const responseBody = await response.clone().json() as { error?: string };
            functionError = responseBody.error || '';
          } catch {
            // Keep the SDK error when the function response is not JSON.
          }
        }
        const functionMessage = /not found|404|failed to send a request/i.test(error.message)
          ? 'Email service is not deployed. Deploy the send-emails Edge Function to the connected Supabase project.'
          : functionError || `Email service failed: ${error.message}`;
        sentResults = sentResults.concat(uploadedRecords.map(record => ({ enrollmentNo: record.enrollment_no, name: record.student_name, email: record.email, status: 'failed' as const, error: functionMessage, timestamp: new Date().toISOString() })));
      } else {
        const functionResults = (data?.results || []) as Array<{ enrollment_no: string; status: 'sent' | 'failed'; provider_message_id?: string; error?: string }>;
        sentResults = sentResults.concat(uploadedRecords.map(record => {
          const result = functionResults.find(item => item.enrollment_no === record.enrollment_no);
          return { enrollmentNo: record.enrollment_no, name: record.student_name, email: record.email, status: result?.status || 'failed', providerMessageId: result?.provider_message_id, error: result?.error, timestamp: new Date().toISOString() };
        }));
      }
    }
    setProgress(100);
    setEmailResults(sentResults);
    setJobs(current => [{ id: Date.now().toString(), name: `Batch ${new Date().toLocaleDateString()}`, createdAt: new Date().toISOString(), totalRecords, sent: sentResults.filter(result => result.status === 'sent').length, failed: sentResults.filter(result => result.status === 'failed').length }, ...current]);
  }, []);

  const startProcessing = useCallback(async () => {
    if (isStarting || documentFiles.length === 0 || (!studentFile && !studentText.trim())) return;
    setIsStarting(true); setEmailResults([]); setProgress(0);
    try {
      const nextStudents = studentFile ? await parseStudentFile(studentFile) : parseCsv(studentText);
      const nextDocuments = await parseDocuments(documentFiles); const nextMatches = matchStudents(nextStudents, nextDocuments);
      setStudents(nextStudents); setDocuments(nextDocuments); setMatchResults(nextMatches);
      if (nextMatches.some(result => result.status === 'matched')) await sendMatches(nextMatches, documentFiles, nextStudents.length);
    } finally { setIsStarting(false); }
  }, [documentFiles, isStarting, matchStudents, parseDocuments, parseCsv, parseStudentFile, sendMatches, studentFile, studentText]);

  useEffect(() => { if (!isStarting && students.length && documents.length) setMatchResults(matchStudents(students, documents)); }, [documents, isStarting, matchStudents, students]);

  const matchedCount = matchResults.filter(result => result.status === 'matched').length;
  return <div className="min-h-screen bg-slate-50 text-slate-900">
    <header className="bg-white border-b border-slate-200"><div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between gap-6"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center"><Send className="w-5 h-5 text-white" /></div><div><h1 className="text-2xl font-semibold">JAIN Certificate Distribution</h1><p className="text-sm text-slate-600">All-in-one document distribution workspace</p></div></div><button onClick={startProcessing} disabled={isStarting || documentFiles.length === 0 || (!studentFile && !studentText.trim())} className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed"><Send className="w-4 h-4" />{isStarting ? `Processing... ${progress}%` : 'Start Processing'}</button></div></header>
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-40"><div className="max-w-7xl mx-auto px-6 flex gap-1 overflow-x-auto">{[['dashboard', '📊 Dashboard'], ['import', '⬆️ Import'], ['match', '✓ Match & Validate'], ['send', '📧 Send'], ['reports', '📋 Reports']].map(([id, label]) => <a key={id} href={`#${id}`} className="px-4 py-3 text-sm font-medium text-slate-600 hover:text-blue-600 whitespace-nowrap">{label}</a>)}</div></nav>
    <main className="max-w-7xl mx-auto px-6 py-8 space-y-12">
      <section id="dashboard" className="scroll-mt-24"><DashboardView jobs={jobs} /></section>
      <section id="import" className="scroll-mt-24"><ImportView studentFile={studentFile} studentText={studentText} documentFiles={documentFiles} students={students} documents={documents} onStudentFileChange={setStudentFile} onStudentTextChange={setStudentText} onDocumentFilesChange={setDocumentFiles} /></section>
      <section id="match" className="scroll-mt-24"><MatchView results={matchResults} studentCount={students.length} documentCount={documents.length} /></section>
      <section id="send" className="scroll-mt-24"><SendView results={emailResults} matchCount={matchedCount} isSending={isStarting && matchedCount > 0} progress={progress} /></section>
      <section id="reports" className="scroll-mt-24"><ReportsView jobs={jobs} emailResults={emailResults} /></section>
    </main>
  </div>;
}

function ImportView({ studentFile, studentText, documentFiles, students, documents, onStudentFileChange, onStudentTextChange, onDocumentFilesChange }: { studentFile: File | null; studentText: string; documentFiles: File[]; students: Student[]; documents: DocumentRecord[]; onStudentFileChange: (file: File | null) => void; onStudentTextChange: (text: string) => void; onDocumentFilesChange: (files: File[]) => void }) {
  const handleDocuments = (files: FileList | null) => { if (files) onDocumentFilesChange(Array.from(files).filter(file => file.name.toLowerCase().endsWith('.pdf'))); };
  return <div className="grid grid-cols-1 lg:grid-cols-2 gap-8"><div className="bg-white rounded-lg border border-slate-200 p-6"><div className="flex items-start gap-3 mb-4"><Upload className="w-5 h-5 text-blue-600" /><div><h2 className="font-semibold">Import Student Data</h2><p className="text-sm text-slate-600 mt-1">CSV or Excel with JAIN certificate number, student name, email, and optional WhatsApp mobile number</p></div></div><input id="student-file" type="file" accept=".csv,.xlsx,.xls,.xlsb,.ods,text/csv" className="hidden" onChange={event => onStudentFileChange(event.target.files?.[0] || null)} /><label htmlFor="student-file" className="block p-4 mb-4 text-center border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50">{studentFile ? studentFile.name : 'Choose CSV or Excel file'}</label><textarea value={studentText} onChange={event => onStudentTextChange(event.target.value)} className="w-full h-32 p-3 border border-slate-300 rounded-lg font-mono text-sm" placeholder="JAIN Certificate Number,Student Name,Email ID,WhatsApp Mobile" />{students.length > 0 && <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-900">Loaded {students.length} students</div>}</div><div className="bg-white rounded-lg border border-slate-200 p-6"><div className="flex items-start gap-3 mb-4"><FileText className="w-5 h-5 text-blue-600" /><div><h2 className="font-semibold">Upload PDF Documents</h2><p className="text-sm text-slate-600 mt-1">Select PDF files or an entire folder. JAIN certificate numbers are read from PDF text or the PDF filename.</p></div></div><input id="pdf-files" type="file" accept=".pdf,application/pdf" multiple className="hidden" onChange={event => handleDocuments(event.target.files)} /><input id="pdf-folder" type="file" accept=".pdf,application/pdf" multiple className="hidden" {...({ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>)} onChange={event => handleDocuments(event.target.files)} /><div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center"><Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" /><p className="text-sm text-slate-600">Choose PDF files or a folder</p><div className="flex justify-center gap-3 mt-3"><label htmlFor="pdf-files" className="px-3 py-2 bg-blue-50 text-blue-700 rounded cursor-pointer text-sm font-medium">Browse PDFs</label><label htmlFor="pdf-folder" className="px-3 py-2 bg-slate-100 rounded cursor-pointer text-sm font-medium">Choose Folder</label></div></div><div className="mt-4 space-y-2">{documentFiles.map((file, index) => <div key={`${file.name}-${index}`} className="flex items-center gap-2 p-2 bg-slate-50 rounded text-sm"><FileText className="w-4 h-4" /><span className="flex-1">{file.name}</span><button type="button" onClick={() => onDocumentFilesChange(documentFiles.filter((_, fileIndex) => fileIndex !== index))} className="text-slate-500 hover:text-red-600">Remove</button></div>)}{documentFiles.length === 0 && <p className="text-sm text-slate-500">No PDF files selected</p>}</div>{documents.length > 0 && <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200 text-sm text-green-900">Indexed {documents.length} documents</div>}</div></div>;
}

function MatchView({ results, studentCount, documentCount }: { results: MatchResult[]; studentCount: number; documentCount: number }) { if (!results.length) return <Panel title="Match & Validate"><div className="p-8 text-center text-slate-600"><Clock className="w-10 h-10 mx-auto mb-3 text-slate-400" /><p>{studentCount} students and {documentCount} documents ready. Click Start Processing.</p></div></Panel>; const counts = { matched: results.filter(r => r.status === 'matched').length, missing: results.filter(r => r.status === 'missing_pdf').length, invalid: results.filter(r => r.status === 'invalid_email').length, duplicate: results.filter(r => r.status === 'duplicate').length }; return <div className="space-y-6"><h2 className="text-xl font-semibold">Match & Validate</h2><div className="grid grid-cols-2 lg:grid-cols-4 gap-4"><StatCard icon={CheckCircle} label="Matched" value={counts.matched} color="green" /><StatCard icon={AlertCircle} label="Missing PDF" value={counts.missing} color="orange" /><StatCard icon={XCircle} label="Invalid Email" value={counts.invalid} color="red" /><StatCard icon={AlertCircle} label="Duplicate" value={counts.duplicate} color="yellow" /></div><div className="bg-white rounded-lg border border-slate-200 overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50"><tr>{['Status', 'JAIN Certificate No.', 'Student Name', 'Email', 'WhatsApp Mobile', 'Certificate PDF', 'Error'].map(header => <th key={header} className="px-4 py-3 text-left font-semibold">{header}</th>)}</tr></thead><tbody>{results.slice(0, 50).map((result, index) => <tr key={`${result.enrollmentNo}-${index}`} className="border-t border-slate-200"><td className="px-4 py-3">{result.status}</td><td className="px-4 py-3 font-medium">{result.enrollmentNo}</td><td className="px-4 py-3">{result.name}</td><td className="px-4 py-3">{result.email}</td><td className="px-4 py-3">{result.whatsappMobile || '-'}</td><td className="px-4 py-3">{result.document || '-'}</td><td className="px-4 py-3 text-red-600">{result.error || '-'}</td></tr>)}</tbody></table></div></div>; }
function SendView({ results, matchCount, isSending, progress }: { results: EmailResult[]; matchCount: number; isSending: boolean; progress: number }) { const sent = results.filter(r => r.status === 'sent').length; const failed = results.filter(r => r.status === 'failed').length; return <Panel title="Send"><p className="text-slate-600">{isSending ? `Sending ${matchCount} matched documents...` : results.length ? `${sent} sent, ${failed} failed` : `${matchCount} matched documents will be processed by Start Processing.`}</p>{isSending && <div className="mt-4 h-2 bg-slate-200 rounded overflow-hidden"><div className="h-full bg-blue-600" style={{ width: `${progress}%` }} /></div>}{results.length > 0 && <div className="mt-4 space-y-2 text-sm">{results.map(result => <div key={result.enrollmentNo} className={`p-3 rounded border ${result.status === 'sent' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}><strong>{result.enrollmentNo}</strong>: {result.status === 'sent' ? 'Email accepted by provider' : result.error || 'Email was not sent'}</div>)}</div>}</Panel>; }
function DashboardView({ jobs }: { jobs: Job[] }) { return <div className="space-y-6"><h2 className="text-xl font-semibold">Dashboard</h2><div className="grid grid-cols-2 lg:grid-cols-4 gap-4"><StatCard icon={FileText} label="Total Records" value={jobs.reduce((sum, job) => sum + job.totalRecords, 0)} color="blue" /><StatCard icon={CheckCircle} label="Delivered" value={jobs.reduce((sum, job) => sum + job.sent, 0)} color="green" /><StatCard icon={AlertCircle} label="Failed" value={jobs.reduce((sum, job) => sum + job.failed, 0)} color="red" /><StatCard icon={CheckCheck} label="Jobs" value={jobs.length} color="emerald" /></div></div>; }
function ReportsView({ jobs, emailResults }: { jobs: Job[]; emailResults: EmailResult[] }) { return <Panel title="Reports"><div className="flex items-center justify-between"><p className="text-slate-600">{emailResults.length ? `${emailResults.length} delivery results available.` : 'Run a batch to generate a report.'}</p>{emailResults.length > 0 && <button className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded text-sm"><Download className="w-4 h-4" />Download CSV</button>}</div>{jobs.length > 0 && <p className="mt-4 text-sm text-slate-600">Latest job: {jobs[0].name}</p>}</Panel>; }
function Panel({ title, children }: { title: string; children: React.ReactNode }) { return <div className="bg-white rounded-lg border border-slate-200 p-6"><h2 className="text-xl font-semibold mb-4">{title}</h2>{children}</div>; }
function StatCard({ icon: Icon, label, value, color }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number; color: string }) { const colors: Record<string, string> = { blue: 'bg-blue-50 text-blue-700', green: 'bg-green-50 text-green-700', red: 'bg-red-50 text-red-700', orange: 'bg-orange-50 text-orange-700', yellow: 'bg-yellow-50 text-yellow-700', emerald: 'bg-emerald-50 text-emerald-700' }; return <div className={`${colors[color]} rounded-lg border border-slate-200 p-5`}><div className="flex justify-between"><div><p className="text-sm font-medium">{label}</p><p className="text-3xl font-semibold text-slate-900 mt-2">{value}</p></div><Icon className="w-7 h-7" /></div></div>; }
