import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";

/**
 * POST /api/run/manual
 *
 * Triggers the pipeline by dispatching a GitHub Actions workflow_dispatch event.
 * This is the correct architecture because:
 *  - The pipeline needs FFmpeg (not available on Vercel)
 *  - The pipeline can take >60s (Vercel serverless timeout)
 *  - GitHub Actions has all the required tools and no timeout issues
 *
 * Required env variables:
 *  - GITHUB_TOKEN: Personal access token with `repo` and `workflow` scopes
 *  - GITHUB_REPO: "owner/repo-name" (e.g., "myuser/instagram-money")
 *
 * Alternative: if you don't want to configure GitHub token,
 * run the pipeline directly from the Actions tab.
 */

export const runtime = "nodejs";

export async function POST() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (!token || !repo) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "GITHUB_TOKEN and GITHUB_REPO env variables are required to trigger the pipeline from the dashboard. " +
          "Alternatively, run the workflow manually from the GitHub Actions tab."
      },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(
      `https://api.github.com/repos/${repo}/actions/workflows/generate-reel.yml/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ ref: "main" })
      }
    );

    if (res.status === 204) {
      return NextResponse.json({
        ok: true,
        message: "Pipeline triggered via GitHub Actions. Check the Actions tab for progress."
      });
    }

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(
      {
        ok: false,
        error: (data as { message?: string }).message ?? `GitHub API returned ${res.status}`
      },
      { status: 500 }
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
