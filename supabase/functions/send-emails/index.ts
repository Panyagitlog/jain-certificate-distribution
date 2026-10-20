import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface EmailRecord {
  enrollment_no: string
  student_name: string
  email: string
  document_path: string
}

interface ProviderResult {
  id?: string
  message?: string
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

function normalizeStoragePath(path: string) {
  return path
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/^documents\//i, "")
    .trim()
}

async function pdfToBase64(pdfData: Blob) {
  const bytes = new Uint8Array(await pdfData.arrayBuffer())
  let binary = ""
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000))
  }
  return btoa(binary)
}

serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405)

  // Read secrets per-request so a secrets update takes effect without waiting on isolate reuse.
  const resendApiKey = Deno.env.get("RESEND_API_KEY")?.trim()
  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim()
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim()
  const senderEmail = Deno.env.get("SENDER_EMAIL")?.trim()
  const senderName = Deno.env.get("SENDER_NAME")?.trim()
  const storageBucket = Deno.env.get("STORAGE_BUCKET")?.trim()

  try {
    if (!resendApiKey) {
      console.error("send-emails: RESEND_API_KEY secret is not set")
      return jsonResponse({ success: false, error: "Email service is not configured" }, 500)
    }
    if (!resendApiKey.startsWith("re_")) {
      console.error("send-emails: RESEND_API_KEY secret has an unexpected format")
      return jsonResponse({ success: false, error: "Email service is not configured" }, 500)
    }
    if (!senderEmail || !senderName) {
      console.error("send-emails: SENDER_EMAIL or SENDER_NAME secret is not set")
      return jsonResponse({ success: false, error: "Email service is not configured" }, 500)
    }
    if (!storageBucket) {
      console.error("send-emails: STORAGE_BUCKET secret is not set")
      return jsonResponse({ success: false, error: "Email service is not configured" }, 500)
    }
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("send-emails: Supabase service configuration is missing")
      return jsonResponse({ success: false, error: "Email service is not configured" }, 500)
    }

    const payload = await request.json() as { records?: EmailRecord[] }
    if (!payload.records?.length) return jsonResponse({ success: false, error: "Missing records" }, 400)

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
    const { data: job, error: jobError } = await supabase
      .from("email_jobs")
      .insert({
        job_name: `JAIN University Certificate Batch ${new Date().toISOString()}`,
        subject: "JAIN University Certificate",
        status: "processing",
        total_count: payload.records.length,
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single()

    if (jobError || !job) {
      console.error("send-emails: database job creation failed", jobError?.message)
      return jsonResponse({ success: false, error: "Database job creation failed" }, 500)
    }

    const enrollmentNumbers = payload.records.map(record => record.enrollment_no)
    const { data: students, error: studentsError } = await supabase
      .from("students")
      .select("id, enrollment_no")
      .in("enrollment_no", enrollmentNumbers)

    if (studentsError) {
      console.error("send-emails: failed to look up students", studentsError.message)
      return jsonResponse({ success: false, error: "Failed to look up students" }, 500)
    }
    const studentIdByEnrollment = new Map((students || []).map(student => [student.enrollment_no, student.id]))

    // Students uploaded in this batch may not exist yet — create them so items can link via student_id.
    const missingRecords = payload.records.filter(record => !studentIdByEnrollment.has(record.enrollment_no))
    if (missingRecords.length > 0) {
      const { data: createdStudents, error: createStudentsError } = await supabase
        .from("students")
        .insert(missingRecords.map(record => ({
          enrollment_no: record.enrollment_no,
          student_name: record.student_name,
          email: record.email,
        })))
        .select("id, enrollment_no")

      if (createStudentsError) {
        console.error("send-emails: failed to create missing students", createStudentsError.message)
      } else {
        for (const student of createdStudents || []) {
          studentIdByEnrollment.set(student.enrollment_no, student.id)
        }
      }
    }

    const results: Array<{ enrollment_no: string; status: "sent" | "failed"; provider_message_id?: string; error?: string }> = []

    for (const record of payload.records) {
      let status: "sent" | "failed" = "failed"
      let providerMessageId: string | undefined
      let errorMessage: string | undefined
      const studentId = studentIdByEnrollment.get(record.enrollment_no)

      try {
        if (!studentId) throw new Error("Student record not found")
        if (!record.email) throw new Error("Student email is missing")
        const documentPath = normalizeStoragePath(record.document_path)
        if (!documentPath) throw new Error("PDF storage path is missing")
        const { data: pdfData, error: storageError } = await supabase.storage.from(storageBucket).download(documentPath)
        if (storageError || !pdfData) throw new Error(`PDF not found or Storage error: ${storageError?.message || "file is unavailable"}`)

        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: `${senderName} <${senderEmail}>`,
            to: record.email,
            subject: `JAIN University Certificate - ${record.student_name}`,
            html: `<div style="font-family:Arial,sans-serif;color:#252b35;line-height:1.7;max-width:650px;margin:0 auto;">
              <p>Dear ${escapeHtml(record.student_name)},</p>
              <p>We are pleased to share your JAIN University certificate with you. Please find your certificate attached to this email.</p>
              <p><strong>JAIN Certificate Number:</strong> ${escapeHtml(record.enrollment_no)}</p>
              <p>Kindly download and save the attached certificate for your future reference.</p>
              <p>If you have any questions or require assistance, please contact the authorized certificate distribution team.</p>
              <p>Best regards,<br><strong>${escapeHtml(senderName)}</strong></p>
            </div>`,
            attachments: [{ filename: `JAIN-University-Certificate-${record.enrollment_no}.pdf`, content: await pdfToBase64(pdfData), encoding: "base64" }],
          }),
        })

        const providerResult = await response.json() as ProviderResult
        if (response.status === 401 || response.status === 403) {
          console.error("send-emails: Resend rejected the configured API key")
          throw new Error("Email service is not configured")
        }
        if (!response.ok || !providerResult.id) throw new Error(providerResult.message || "Resend API rejected the email")
        status = "sent"
        providerMessageId = providerResult.id
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : "Unknown email error"
      }

      const { error: itemError } = await supabase.from("email_job_items").insert({
        job_id: job.id,
        student_id: studentId || null,
        email: record.email,
        subject: `JAIN University Certificate - ${record.student_name}`,
        document_path: normalizeStoragePath(record.document_path),
        status,
        attempts: 1,
        resend_id: providerMessageId || null,
        error_message: errorMessage || null,
        sent_at: status === "sent" ? new Date().toISOString() : null,
      })

      if (itemError) {
        status = "failed"
        errorMessage = `Database update error: ${itemError.message}`
      }
      results.push({ enrollment_no: record.enrollment_no, status, provider_message_id: providerMessageId, error: errorMessage })
    }

    const sent = results.filter(result => result.status === "sent").length
    const failed = results.length - sent
    const { error: updateError } = await supabase.from("email_jobs").update({
      status: "completed",
      sent_count: sent,
      failed_count: failed,
      pending_count: 0,
      completed_at: new Date().toISOString(),
    }).eq("id", job.id)

    if (updateError) {
      console.error("send-emails: database update failed", updateError.message)
      return jsonResponse({ success: false, error: "Database update failed", job_id: job.id, sent, failed, results }, 500)
    }
    return jsonResponse({ success: failed === 0, job_id: job.id, sent, failed, results })
  } catch (error) {
    console.error("send-emails: unhandled error", error instanceof Error ? error.message : error)
    return jsonResponse({ success: false, error: error instanceof Error ? error.message : "Unknown server error" }, 500)
  }
})
