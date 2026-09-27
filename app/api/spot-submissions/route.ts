import { randomUUID } from "node:crypto";
import {
  INVALID_REQUEST,
  errorResponse,
  toApiError,
} from "@/lib/community/errors";
import {
  SUBMISSION_MESSAGES,
  isHoneypotFilled,
  spotSubmissionInputSchema,
  toSubmissionResult,
  type SubmissionStatus,
} from "@/lib/community/schema";
import {
  checkClientRateLimit,
  dbErrorResponse,
  parseBody,
} from "@/lib/community/write";
import {
  findMunicipality,
  toMunicipalityIndex,
  type RawMunicipalities,
} from "@/lib/geo/municipalities";
import municipalitiesJson from "@/lib/geo/municipalities.json";
import { createClient } from "@/lib/supabase/server";

// スポットの投稿（穴場を教える）の API（#52）。画面は #54。
// 全国（47都道府県）から受け付ける。ピンが anaba の地域（areas）の中なら承認を待たずにすぐ公開し
// （spots に source = 'user' で入る。管理者があとから非表示にできる、#55）、外なら公開待ちの候補（spot_candidates）にする。
// どちらにするかは DB の submit_spot_anywhere() が決める

const MUNICIPALITIES = toMunicipalityIndex(
  municipalitiesJson as unknown as RawMunicipalities,
);

export async function POST(request: Request) {
  const input = await parseBody(request, spotSubmissionInputSchema);
  if (!input.ok) return input.response;

  // 市区町村は候補の名前だけを受け付ける（候補にない名前の候補が DB にたまらないように）
  if (
    !findMunicipality(
      MUNICIPALITIES,
      input.value.prefecture,
      input.value.municipality,
    )
  ) {
    return errorResponse({
      status: INVALID_REQUEST.status,
      body: {
        ...INVALID_REQUEST.body,
        fields: { municipality: "市区町村は候補から選んでください" },
      },
    });
  }

  const supabase = await createClient();
  const rateLimit = await checkClientRateLimit(request, supabase, "submission");
  if (!rateLimit.ok) return rateLimit.response;

  // おとりの欄に値があればボットとみなし、保存せずに同じ形の応答を返す（気づかせない）
  if (isHoneypotFilled(input.value)) {
    return created(randomUUID(), "published");
  }

  // anon は spots・spot_candidates に直接 insert できない。submit_spot_anywhere() が検査して入れる（#51）
  const { data, error } = await supabase.rpc("submit_spot_anywhere", {
    p_prefecture: input.value.prefecture,
    p_municipality: input.value.municipality,
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

  const result = toSubmissionResult(data);
  if (!result) {
    return dbErrorResponse(
      toApiError({ code: null }, "submission"),
      { code: null, message: "submit_spot_anywhere() の戻り値の形が違います" },
      "submission",
    );
  }
  return created(result.id, result.status);
}

function created(id: string, status: SubmissionStatus) {
  return Response.json(
    { id, status, message: SUBMISSION_MESSAGES[status] },
    { status: 201 },
  );
}
