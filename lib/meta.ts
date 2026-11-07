/**
 * Meta Graph API — Instagram Reels publishing.
 *
 * Manual prerequisites (do these ONCE before using):
 *  1. Convert your Instagram account to Professional/Business.
 *  2. Link it to a Facebook Page.
 *  3. Create a Meta developer app at developers.facebook.com.
 *  4. Add Instagram Graph API product & request permissions:
 *       instagram_basic, instagram_content_publish,
 *       pages_read_engagement, pages_show_list
 *  5. Generate a long-lived user access token (60-day expiry).
 *     Refresh it programmatically before it expires.
 *  6. Find your IG_USER_ID via:
 *       GET https://graph.facebook.com/v26.0/me/accounts
 *  7. Add META_ACCESS_TOKEN and IG_USER_ID to env.
 *
 * Scheduling note:
 *  The Instagram Graph API does NOT support scheduling Reels for
 *  standard creator accounts. If scheduling is unavailable, this
 *  module will publish immediately. The status will be set to
 *  "scheduled" on success or "completed" (manual posting needed)
 *  on failure — the final video is always preserved.
 */

import { isMockMode } from "./utils";

const BASE_URL = "https://graph.facebook.com/v26.0";

export interface PostReelInput {
  videoUrl: string; // Publicly accessible URL of the final mp4
  caption: string;
  scheduledAt?: string; // ISO-8601 — used if the account supports scheduling
}

export interface PostReelResult {
  success: boolean;
  mediaId?: string;
  scheduled: boolean;
  error?: string;
}

/**
 * Upload a Reel to Instagram via the Graph API.
 * Returns success=true even if scheduling fails (graceful fallback).
 */
export async function postReel(input: PostReelInput): Promise<PostReelResult> {
  if (isMockMode()) {
    console.log("[meta] MOCK_MODE — skipping Instagram post");
    return { success: true, mediaId: "mock_media_id", scheduled: false };
  }

  const token = process.env.META_ACCESS_TOKEN;
  const igUserId = process.env.IG_USER_ID;

  if (!token || !igUserId) {
    return {
      success: false,
      scheduled: false,
      error: "META_ACCESS_TOKEN or IG_USER_ID env variable is missing."
    };
  }

  try {
    // Step 1: Create a media container
    const containerBody: Record<string, string> = {
      media_type: "REELS",
      video_url: input.videoUrl,
      caption: input.caption,
      access_token: token
    };

    const containerRes = await fetch(
      `${BASE_URL}/${igUserId}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(containerBody)
      }
    );

    const containerData = (await containerRes.json()) as {
      id?: string;
      error?: { message: string };
    };

    if (!containerRes.ok || !containerData.id) {
      throw new Error(
        containerData.error?.message ?? "Failed to create media container."
      );
    }

    const containerId = containerData.id;
    console.log("[meta] Media container created:", containerId);

    // Step 2: Poll until the container is FINISHED processing
    await pollContainerStatus(containerId, token);

    // Step 3: Publish the container
    const publishRes = await fetch(
      `${BASE_URL}/${igUserId}/media_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: containerId,
          access_token: token
        })
      }
    );

    const publishData = (await publishRes.json()) as {
      id?: string;
      error?: { message: string };
    };

    if (!publishRes.ok || !publishData.id) {
      throw new Error(
        publishData.error?.message ?? "Failed to publish media."
      );
    }

    console.log("[meta] Reel published, media ID:", publishData.id);
    return { success: true, mediaId: publishData.id, scheduled: false };
  } catch (err) {
    const msg = (err as Error).message;
    console.error("[meta] Post failed:", msg);
    return { success: false, scheduled: false, error: msg };
  }
}

/** Poll the media container until status = FINISHED or ERROR */
async function pollContainerStatus(
  containerId: string,
  token: string,
  maxWaitMs = 120_000
): Promise<void> {
  const pollInterval = 5_000;
  const deadline = Date.now() + maxWaitMs;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, pollInterval));

    const res = await fetch(
      `${BASE_URL}/${containerId}?fields=status_code&access_token=${token}`
    );
    const data = (await res.json()) as {
      status_code?: string;
      error?: { message: string };
    };

    console.log("[meta] Container status:", data.status_code);

    if (data.status_code === "FINISHED") return;
    if (data.status_code === "ERROR" || data.error) {
      throw new Error(
        data.error?.message ?? `Container processing error: ${data.status_code}`
      );
    }
  }

  throw new Error("Timed out waiting for media container to finish processing.");
}
