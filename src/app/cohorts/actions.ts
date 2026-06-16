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
  leaveCohort,
  respondJoinInfo,
} from "@/core/cohorts/services/cohortService";
import { createServerClient } from "@/core/db/serverClient";
import { notifyActionDue } from "@/core/services/notificationService";
import {
  createPost,
  setPostVisibility,
  updatePost,
  deletePost,
} from "@/core/posts/services/postService";

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

export async function submitJoinRequest(input: {
  cohortId: string;
  handle: string;
  answers: { question: string; answer: string }[];
}) {
  const ctx = await getCtx();
  const res = await requestToJoin(ctx, {
    cohortId: input.cohortId,
    answers: input.answers,
  });
  if (!res.ok) return { ok: false as const, error: res.error.message };
  revalidatePath(`/${input.handle}`);
  return { ok: true as const };
}

export async function respondInfoAction(formData: FormData) {
  const ctx = await getCtx();
  const handle = String(formData.get("handle") ?? "");
  await respondJoinInfo(ctx, {
    cohortId: String(formData.get("cohortId") ?? ""),
    response: String(formData.get("response") ?? ""),
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

export async function saveCohortSettings(input: {
  cohortId: string;
  handle: string;
  name?: string;
  tagline?: string;
  description?: string;
  avatarUrl?: string;
  coverUrl?: string;
  joinQuestions?: { text: string; expected?: string }[];
}) {
  const ctx = await getCtx();
  const res = await updateCohortProfile(ctx, {
    cohortId: input.cohortId,
    name: input.name || undefined,
    tagline: input.tagline ?? "",
    description: input.description ?? "",
    avatarUrl: input.avatarUrl ?? "",
    coverUrl: input.coverUrl ?? "",
    joinQuestions: input.joinQuestions,
  });
  if (!res.ok) return { ok: false as const, error: res.error.message };
  revalidatePath(`/${input.handle}`);
  return { ok: true as const };
}

export async function leaveCohortAction(formData: FormData) {
  const ctx = await getCtx();
  await leaveCohort(ctx, String(formData.get("cohortId") ?? ""));
  redirect("/cohorts");
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

export async function submitPost(input: {
  cohortId: string;
  handle: string;
  body: string;
  imageUrl?: string;
  visibility?: "members" | "public";
}) {
  const ctx = await getCtx();
  const res = await createPost(ctx, {
    cohortId: input.cohortId,
    body: input.body,
    imageUrl: input.imageUrl || undefined,
    visibility: input.visibility ?? "members",
  });
  if (!res.ok) return { ok: false as const, error: res.error.message };
  revalidatePath(`/${input.handle}`);
  return { ok: true as const };
}

export async function editPost(input: {
  postId: string;
  handle: string;
  body: string;
  imageUrl?: string;
  visibility?: "members" | "public";
}) {
  const ctx = await getCtx();
  const res = await updatePost(ctx, {
    postId: input.postId,
    body: input.body,
    imageUrl: input.imageUrl,
    visibility: input.visibility,
  });
  if (!res.ok) return { ok: false as const, error: res.error.message };
  revalidatePath(`/${input.handle}`);
  return { ok: true as const };
}

export async function removePost(input: { postId: string; handle: string }) {
  const ctx = await getCtx();
  const res = await deletePost(ctx, input.postId);
  if (!res.ok) return { ok: false as const, error: res.error.message };
  revalidatePath(`/${input.handle}`);
  return { ok: true as const };
}

export async function changePostVisibility(input: {
  postId: string;
  handle: string;
  visibility: "members" | "public";
}) {
  const ctx = await getCtx();
  const res = await setPostVisibility(ctx, {
    postId: input.postId,
    visibility: input.visibility,
  });
  if (!res.ok) return { ok: false as const, error: res.error.message };
  revalidatePath(`/${input.handle}`);
  return { ok: true as const };
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
  const askMessage = String(formData.get("message") ?? "");

  const res = await reviewJoinRequest(ctx, {
    cohortId,
    userId,
    decision,
    message: askMessage || undefined,
  });

  // Notify the member of the decision (service-role: system-generated).
  if (res.ok) {
    const adminDb = createServerClient();
    if (adminDb) {
      const message =
        decision === "approve"
          ? `You're approved to join /${handle}.`
          : decision === "needs_info"
            ? `A manager needs more info for /${handle}${askMessage ? `: ${askMessage}` : "."}`
            : `Your request to join /${handle} was declined.`;
      await notifyActionDue(
        { db: adminDb, actor: { role: "agent" } },
        { userId, event: "generic_action", message, link: `/${handle}` }
      );
    }
  }
  revalidatePath(`/${handle}`);
}
