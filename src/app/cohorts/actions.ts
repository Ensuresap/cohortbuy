"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createCohort,
  requestToJoin,
  reviewJoinRequest,
  updateCohortProfile,
  setMemberTitle,
  setComanager,
} from "@/core/cohorts/services/cohortService";
import { createServerClient } from "@/core/db/serverClient";
import { notifyActionDue } from "@/core/services/notificationService";
import { createPost } from "@/core/posts/services/postService";

async function getCtx() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { db: supabase, actor: { id: user.id } };
}

export async function createCohortAction(formData: FormData) {
  const ctx = await getCtx();
  const handle = String(formData.get("handle") ?? "").toLowerCase();
  const res = await createCohort(ctx, {
    name: String(formData.get("name") ?? ""),
    handle,
    description: String(formData.get("description") ?? "") || undefined,
    visibility: String(formData.get("visibility") ?? "public"),
    category: String(formData.get("category") ?? "") || undefined,
    country: String(formData.get("country") ?? "US"),
  });
  if (!res.ok) {
    redirect(`/cohorts/new?error=${encodeURIComponent(res.error.message)}`);
  }
  redirect(`/${handle}`);
}

export async function requestJoinAction(formData: FormData) {
  const ctx = await getCtx();
  const handle = String(formData.get("handle") ?? "");
  await requestToJoin(ctx, {
    cohortId: String(formData.get("cohortId") ?? ""),
    note: String(formData.get("note") ?? "") || undefined,
  });
  revalidatePath(`/${handle}`);
}

export async function updateCohortProfileAction(formData: FormData) {
  const ctx = await getCtx();
  const handle = String(formData.get("handle") ?? "");
  await updateCohortProfile(ctx, {
    cohortId: String(formData.get("cohortId") ?? ""),
    name: String(formData.get("name") ?? "").trim() || undefined,
    tagline: String(formData.get("tagline") ?? ""),
    description: String(formData.get("description") ?? ""),
    avatarUrl: String(formData.get("avatarUrl") ?? "").trim(),
  });
  redirect(`/${handle}`);
}

export async function setTitleAction(formData: FormData) {
  const ctx = await getCtx();
  const handle = String(formData.get("handle") ?? "");
  await setMemberTitle(ctx, {
    cohortId: String(formData.get("cohortId") ?? ""),
    userId: String(formData.get("userId") ?? ""),
    title: String(formData.get("title") ?? ""),
  });
  revalidatePath(`/${handle}`);
}

export async function createPostAction(formData: FormData) {
  const ctx = await getCtx();
  const handle = String(formData.get("handle") ?? "");
  const res = await createPost(ctx, {
    cohortId: String(formData.get("cohortId") ?? ""),
    body: String(formData.get("body") ?? ""),
    imageUrl: String(formData.get("imageUrl") ?? "").trim(),
  });
  if (!res.ok) {
    redirect(`/${handle}?perror=${encodeURIComponent(res.error.message)}`);
  }
  revalidatePath(`/${handle}`);
}

export async function setComanagerAction(formData: FormData) {
  const ctx = await getCtx();
  const handle = String(formData.get("handle") ?? "");
  await setComanager(ctx, {
    cohortId: String(formData.get("cohortId") ?? ""),
    userId: String(formData.get("userId") ?? ""),
    make: String(formData.get("make") ?? "") === "true",
  });
  revalidatePath(`/${handle}`);
}

export async function reviewAction(formData: FormData) {
  const ctx = await getCtx();
  const handle = String(formData.get("handle") ?? "");
  const cohortId = String(formData.get("cohortId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  const decision = String(formData.get("decision") ?? "approve") as
    | "approve"
    | "reject"
    | "needs_info";

  const res = await reviewJoinRequest(ctx, { cohortId, userId, decision });

  // Notify the member of the decision (service-role: system-generated).
  if (res.ok) {
    const adminDb = createServerClient();
    if (adminDb) {
      const message =
        decision === "approve"
          ? `You're approved to join /${handle}.`
          : decision === "needs_info"
            ? `A manager asked for more info on your request to join /${handle}.`
            : `Your request to join /${handle} was declined.`;
      await notifyActionDue(
        { db: adminDb, actor: { role: "agent" } },
        { userId, event: "generic_action", message, link: `/${handle}` }
      );
    }
  }
  revalidatePath(`/${handle}`);
}
