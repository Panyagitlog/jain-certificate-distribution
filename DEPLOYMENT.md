# DMCFS Bulk Distribution - Deployment Checklist

## Pre-Launch Tasks

### 1. Supabase Setup ✓
- [ ] Create Supabase project at [supabase.com](https://supabase.com)
- [ ] Note project URL: `https://[project-id].supabase.co`
- [ ] Copy anon key from **Settings → API**
- [ ] Create service role key (for Edge Functions)
- [ ] Run `database-schema.sql` in SQL Editor
- [ ] Create `documents` storage bucket (private)
- [ ] Enable Row-Level Security on all tables

### 2. Resend Configuration ✓
- [ ] Create account at [resend.com](https://resend.com)
- [ ] Create API key from dashboard
- [ ] Add and verify sender domain
- [ ] Test email sending with `curl`:
  ```bash
  curl -X POST "https://api.resend.com/emails" \
    -H "Authorization: Bearer re_xxx" \
    -H "Content-Type: application/json" \
    -d '{
      "from": "noreply@yourdomain.com",
      "to": "test@example.com",
      "subject": "Test",
      "html": "<p>Test email</p>"
    }'
  ```
- [ ] Note sender email (e.g., `noreply@dmcfs.example.com`)

### 3. Edge Function Deployment ✓
- [ ] Install Supabase CLI: `npm install -g supabase`
- [ ] Authenticate: `supabase login`
- [ ] Link project: `supabase link --project-ref YOUR-PROJECT-REF`
- [ ] Set secrets:
  ```bash
  supabase secrets set RESEND_API_KEY=re_xxx
  ```
- [ ] Deploy function:
  ```bash
  supabase functions deploy send-emails --no-verify-jwt
  ```
- [ ] Test function via Supabase dashboard

### 4. Frontend Setup ✓
- [ ] Copy `.env.example` to `.env.local`
- [ ] Fill in all environment variables:
  ```
  VITE_SUPABASE_URL=https://abc123.supabase.co
  VITE_SUPABASE_ANON_KEY=eyJhbGc...
  VITE_SENDER_EMAIL=noreply@dmcfs.example.com
  ```
- [ ] Run `npm install`
- [ ] Test locally: `npm run dev`
- [ ] Verify all pages load and are responsive

### 5. Testing ✓
- [ ] Test student data import (CSV parsing)
- [ ] Test PDF upload and indexing
- [ ] Test matching algorithm:
  - [ ] Valid matches
  - [ ] Missing PDF detection
  - [ ] Invalid email detection
  - [ ] Duplicate detection
- [ ] Test sending:
  - [ ] Send to test email address
  - [ ] Verify PDF attachment
  - [ ] Check delivery status in Resend dashboard
- [ ] Test progress tracking
- [ ] Test report export

### 6. Security Review ✓
- [ ] Verify Resend API key is NOT in `.env.local`
- [ ] Confirm `.env.local` is in `.gitignore`
- [ ] Enable Supabase authentication (OAuth if possible)
- [ ] Review RLS policies on all tables
- [ ] Test that unauthenticated users cannot access data
- [ ] Enable HTTPS in production
- [ ] Set up SSL certificate (auto with Vercel/Netlify)

### 7. Production Deployment ✓

#### Option A: Vercel (Recommended)
```bash
npm install -g vercel
vercel
```
- [ ] Select "Other" for project type
- [ ] Set environment variables in Vercel dashboard
- [ ] Verify deployment at `your-domain.vercel.app`

#### Option B: Netlify
```bash
npm install -g netlify-cli
npm run build
netlify deploy --prod --dir=dist
```
- [ ] Set environment variables in Netlify dashboard
- [ ] Verify deployment

#### Option C: Self-Hosted (Docker)
```bash
# Create Dockerfile
docker build -t dmcfs-bulk .
docker run -p 3000:3000 dmcfs-bulk
```

### 8. Post-Launch ✓
- [ ] Monitor Supabase logs for errors
- [ ] Monitor Resend dashboard for bounces
- [ ] Set up error tracking (Sentry recommended)
- [ ] Configure analytics (Google Analytics)
- [ ] Set up email alerts for failed jobs
- [ ] Create runbook for common issues
- [ ] Schedule regular database backups
- [ ] Test disaster recovery plan

---

## Environment Variables Reference

### Frontend (Client-Side, Safe to Expose)
```
VITE_SUPABASE_URL                - Your Supabase project URL
VITE_SUPABASE_ANON_KEY           - Public anon key for read/write
VITE_SENDER_EMAIL                - Verified sender email address
VITE_SENDER_NAME                 - Display name for emails
VITE_APP_ENV                     - Environment (development/production)
```

### Backend (Server-Side, Keep Secret)
```
RESEND_API_KEY                   - Resend API key (Edge Function secret)
SUPABASE_SERVICE_ROLE_KEY        - Service role key for Edge Functions
```

---

## Common Issues & Solutions

### Issue: "Invalid Supabase credentials"
**Solution**: 
- Verify URL doesn't have trailing slash
- Check anon key is correct (not service role key)
- Ensure .env.local is properly formatted

### Issue: "Permission denied" when uploading documents
**Solution**:
- Confirm `documents` bucket exists in Supabase Storage
- Check bucket is private (not public)
- Verify RLS policies allow authenticated users to upload

### Issue: "Email failed to send"
**Solution**:
- Verify Resend API key in Edge Function secrets
- Check sender domain is verified in Resend
- Confirm email addresses are valid format
- Look at Resend dashboard for bounce reasons

### Issue: "Build fails with TypeScript errors"
**Solution**:
- Run `npm install` to install all dependencies
- Delete `node_modules` and reinstall if needed
- Check that TypeScript config matches project structure

### Issue: "PDF attachment not showing in email"
**Solution**:
- Verify PDF exists in Supabase Storage
- Check file naming matches enrollment number
- Ensure PDF file size is reasonable (<10MB)
- Test with small PDF first

---

## Monitoring & Maintenance

### Daily Checks
- Review email job status in dashboard
- Check for failed deliveries
- Monitor Resend API usage

### Weekly Checks
- Review audit logs for anomalies
- Check database size and growth rate
- Verify email deliverability rates

### Monthly Tasks
- Database optimization (VACUUM, ANALYZE)
- Review and update documentation
- Audit user access and permissions
- Test disaster recovery procedures

---

## Scaling Considerations

- **Current capacity**: Handles 10,000+ emails per batch
- **Concurrent sends**: Limited by Resend rate limits (see their docs)
- **Database queries**: Indexed for fast searches
- **Storage**: Supabase handles file scaling automatically

If you need higher throughput:
- Contact Resend for higher rate limits
- Consider database replication for read-heavy workloads
- Use CDN for static assets (automatic on Vercel/Netlify)

---

## Support Resources

- **Supabase Docs**: https://supabase.com/docs
- **Resend Docs**: https://resend.com/docs
- **React Docs**: https://react.dev
- **Vite Docs**: https://vitejs.dev
- **Tailwind CSS**: https://tailwindcss.com/docs

---

Last Updated: September 2024
