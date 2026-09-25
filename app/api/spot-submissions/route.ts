import { randomUUID } from "node:crypto";
import { toApiError } from "@/lib/community/errors";
import {
  isHoneypotFilled,
  spotSubmissionInputSchema,
} from "@/lib/community/schema";
import {
  checkClientRateLimit,
  dbErrorResponse,
  parseBody,
} from "@/lib/community/write";
import { createClient } from "@/lib/supabase/server";

// スポットの投稿（穴場を教える）の API（#52）。画面は #54。
// 承認を待たずにすぐ公開する（spots に source = 'user' で入る。管理者があとから非表示にできる、#55）

const PUBLISHED_MESSAGE = "公開しました";

export async function POST(request: Request) {
  const input = await parseBody(request, spotSubmissionInputSchema);
  if (!input.ok) return input.response;

  const supabase = await createClient();
  const rateLimit = await checkClientRateLimit(request, supabase, "submission");
  if (!rateLimit.ok) return rateLimit.response;

  // おとりの欄に値があればボットとみなし、保存せずに同じ形の応答を返す（気づかせない）
  if (isHoneypotFilled(input.value)) {
    return Response.json(
      { id: randomUUID(), message: PUBLISHED_MESSAGE },
      { status: 201 },
    );
  }

  // anon は spots に直接 insert できない。submit_spot() が検査して入れる（#51）
  const { data: id, error } = await supabase.rpc("submit_spot", {
    p_area_id: input.value.areaId,
    p_name: input.value.name,
    p_category: input.value.category,
    p_description: input.value.description,
    p_lat: input.value.lat,
    p_lng: input.value.lng,
    p_nickname: input.value.nickname,
    p_client_hash: rateLimit.value,
  });
  if (error) {
    return dbErrorResponse(
      toApiError(error, "submission"),
      error,
      "submission",
    );
  }

  return Response.json({ id, message: PUBLISHED_MESSAGE }, { status: 201 });
}
