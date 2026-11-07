# InstagramMoney — Manual Setup Guide

Everything you need to do once before the automation runs.

---

## A. Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Wait for it to initialize (~2 minutes).
3. Go to **SQL Editor** → **New query**.
4. Paste the entire contents of `supabase/schema.sql` and run it.
5. Verify all three tables were created: `video_ideas`, `pipeline_logs`, `model_profile`.
6. Create the three storage buckets:
   - Go to **Storage** → **New bucket**
   - Create `model-assets` (private)
   - Create `generated-clips` (private)
   - Create `final-videos` (**public** — required for Meta Graph API to access the video URL)
7. Copy your credentials:
   - **Project URL**: Settings → API → Project URL
   - **Service Role Key**: Settings → API → service_role key (secret)

Add to `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

---

## B. fal.ai Setup

1. Go to [fal.ai](https://fal.ai) and create an account.
2. Navigate to **API Keys** → **Add key**.
3. Add a payment method in **Billing** (required for generation).
4. Test the Pika endpoint once manually:
   - Go to [fal.ai/models/fal-ai/pika](https://fal.ai/models/fal-ai/pika)
   - Run a test generation to confirm your key and billing work.
5. The pipeline uses these endpoints automatically:
   - `fal-ai/pika/v2.2/text-to-video` when the model profile has no reference image
   - `fal-ai/pika/v2.2/image-to-video` when a public reference image URL is set

Add to `.env.local` and GitHub Secrets:
```
FAL_KEY=your-fal-api-key
```

**Cost estimate**: $0.20 per 5-second 720p clip. Seven scenes is about $1.40 per reel, or about $11/month at two reels a week. Stay on 720p.

---

## C. Meta / Instagram Graph API Setup

> This is the most involved step. Take your time.

### Step 1 — Instagram Professional Account
- Open Instagram → Settings → Account → **Switch to Professional Account**
- Choose **Creator** or **Business**

### Step 2 — Link to a Facebook Page
- You must have a Facebook Page connected to the Instagram account.
- Go to Instagram Settings → Linked accounts → Link your Facebook Page.

### Step 3 — Meta Developer App
1. Go to [developers.facebook.com](https://developers.facebook.com).
2. Click **My Apps** → **Create App**.
3. Choose **Business** type.
4. Add **Instagram Graph API** product.

### Step 4 — Request Permissions
In your app, under **Instagram Graph API**, configure:
- `instagram_basic`
- `instagram_content_publish`
- `pages_read_engagement`
- `pages_show_list`

For personal testing (non-public app), add your Instagram account as a tester:
- App Roles → Roles → Add Instagram Tester → Accept from Instagram app.

### Step 5 — Generate Long-Lived Access Token

**Short-lived token** (expires in 1 hour):
- Use Graph API Explorer: graph.facebook.com/explorer
- Select your app, grant the permissions above
- Copy the token

**Exchange for long-lived token** (60-day expiry):
```
GET https://graph.facebook.com/oauth/access_token
  ?grant_type=fb_exchange_token
  &client_id={APP_ID}
  &client_secret={APP_SECRET}
  &fb_exchange_token={SHORT_LIVED_TOKEN}
```

> Automate token refresh before 60 days — add a GitHub Actions workflow or cron job.

### Step 6 — Find Your Instagram User ID

```
GET https://graph.facebook.com/v26.0/me/accounts?access_token={LONG_LIVED_TOKEN}
```
Find the Facebook Page → look for `instagram_business_account.id`.

Or directly:
```
GET https://graph.facebook.com/v26.0/{facebook-page-id}?fields=instagram_business_account&access_token={TOKEN}
```

Add to `.env.local` and GitHub Secrets:
```
META_ACCESS_TOKEN=your-long-lived-token
IG_USER_ID=your-ig-user-id
```

### Scheduling Note
The Meta Graph API does **not** support scheduling Reels for most account types.
The pipeline will publish immediately. If you want scheduled publishing,
use Meta Business Suite or Creator Studio manually after the pipeline completes.

---

## D. GitHub Repository Setup

1. Create a new GitHub repository (can be private).
2. Push your code: `git push origin main`
3. Add repository secrets at: **Settings → Secrets and variables → Actions**

Required secrets:
| Secret | Value |
|--------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |
| `FAL_KEY` | Your fal.ai API key |
| `META_ACCESS_TOKEN` | Your long-lived Instagram access token |
| `IG_USER_ID` | Your Instagram user ID |
| `OPENAI_API_KEY` | (Optional) For AI caption generation |

4. Enable GitHub Actions: **Actions tab → Enable workflows**
5. Test manually: **Actions → Generate Reel → Run workflow → Set mock_mode: true**

---

## E. Vercel Deployment

1. Go to [vercel.com](https://vercel.com) and import your GitHub repository.
2. Framework preset: **Next.js** (auto-detected).
3. Add all environment variables under **Settings → Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_PASSWORD` (choose a strong password)
   - `FAL_KEY`
   - `META_ACCESS_TOKEN`
   - `IG_USER_ID`
   - `OPENAI_API_KEY` (optional)
   - `MOCK_MODE` = `false`
4. Click **Deploy**.
5. After deployment, open your Vercel URL → you should see the login page.
6. Log in with your `ADMIN_PASSWORD`.

> **Note on Vercel timeout**: The "Run Pipeline Manually" button in the dashboard
> calls `/api/run/manual` which runs the pipeline in-process. Vercel Hobby plan has
> a 10-second timeout. Use GitHub Actions (workflow_dispatch) for full pipeline runs.
> The "Run Pipeline" button is useful for quick testing with MOCK_MODE=true.

---

## F. First Full Test Run

1. **Add model profile**: Dashboard → edit the default model profile. Set your base prompt.
2. **Add a test idea**:
   - Click "New Idea"
   - Title: "Test Reel"
   - Script: Any short text
   - Add 5 scenes with simple visual/motion prompts
   - Scheduled at: Any future date
3. **Test with MOCK_MODE first**:
   - GitHub Actions → Generate Reel → Run workflow → mock_mode: true
   - This runs the full pipeline without spending API credits
   - Check the Actions logs — should complete with status `completed`
   - Check Supabase → `video_ideas` table — status should be `completed`
   - Check `pipeline_logs` table for all steps
4. **Test for real**:
   - Reset the idea status back to `pending` in Supabase
   - Run workflow with mock_mode: false
   - Monitor GitHub Actions logs
   - Check Supabase for final_video_url
   - Check Instagram for the published reel

---

## G. Automatic Schedule

The pipeline runs automatically on:
- **Monday** at 10:00 AM IST (04:30 UTC)
- **Thursday** at 10:00 AM IST (04:30 UTC)

To change the schedule, edit `.github/workflows/generate-reel.yml`:
```yaml
- cron: "30 4 * * 1,4"
```
Format: `minute hour day-of-month month day-of-week`

---

## H. Troubleshooting

**Login not working**: Check `ADMIN_PASSWORD` env variable is set in Vercel.

**Supabase connection error**: Verify `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

**fal generation fails**: Check `FAL_KEY`, billing is set up, and endpoint is correct in `lib/fal.ts`.

**FFmpeg not found in Actions**: The workflow installs it automatically via apt-get.

**Meta posting fails**: Most common issues:
  - Token expired (refresh every 60 days)
  - Missing permissions on the app
  - Instagram account not linked to a Facebook Page
  - Video URL not publicly accessible (make sure `final-videos` bucket is public in Supabase)

**Pipeline stuck on "processing"**: Manually update the status in Supabase SQL editor:
```sql
UPDATE video_ideas SET status = 'pending', error_message = NULL WHERE id = 'your-idea-id';
```
