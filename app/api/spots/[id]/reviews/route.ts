import type { NextRequest } from "next/server";
import {
  INVALID_REQUEST,
  errorResponse,
  toApiError,
  toReadApiError,
} from "@/lib/community/errors";
import { getSpotReviews } from "@/lib/community/reviews";
import {
  isHoneypotFilled,
  reviewInputSchema,
  spotIdSchema,
  type ReviewInput,
} from "@/lib/community/schema";
import {
  checkClientRateLimit,
  dbErrorResponse,
  parseBody,
} from "@/lib/community/write";
import { createClient } from "@/lib/supabase/server";

// スポットの口コミの API（#52）。画面は #53

/** 口コミの一覧（新しい順に20件）と、件数・平均 */
export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/spots/[id]/reviews">,
) {
  const spotId = spotIdSchema.safeParse((await ctx.params).id);
  if (!spotId.success) return errorResponse(INVALID_REQUEST);

  const supabase = await createClient();
  const { data, error } = await getSpotReviews(supabase, spotId.data);
  if (error) return dbErrorResponse(toReadApiError(error), error, "read");
  return Response.json(data);
}

/** 口コミを書く。書いたらすぐ公開する（管理者があとから非表示にできる、#55） */
export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/spots/[id]/reviews">,
) {
  const spotId = spotIdSchema.safeParse((await ctx.params).id);
  if (!spotId.success) return errorResponse(INVALID_REQUEST);

  const input = await parseBody(request, reviewInputSchema);
  if (!input.ok) return input.response;

  const supabase = await createClient();
  const rateLimit = await checkClientRateLimit(request, supabase, "review");
  if (!rateLimit.ok) return rateLimit.response;

  const review = toSavedReview(spotId.data, input.value);
  // おとりの欄に値があればボットとみなし、保存せずに同じ応答を返す（気づかせない）
  if (isHoneypotFilled(input.value)) {
    return Response.json({ review }, { status: 201 });
  }

  // anon は reviews を読めない（#51）ので、.select() を付けずに insert だけする
  const { error } = await supabase
    .from("reviews")
    .insert({ ...review, client_hash: rateLimit.value });
  if (error)
    return dbErrorResponse(toApiError(error, "review"), error, "review");

  return Response.json({ review }, { status: 201 });
}

/**
 * 保存した口コミ（正規化したあとの値）。id・created_at は DB が決め、anon は読み返せないので含めない。
 * 一覧に出すときは GET で読み直す
 */
function toSavedReview(spotId: string, input: ReviewInput) {
  return {
    spot_id: spotId,
    nickname: input.nickname,
    rating: input.rating,
    body: input.body,
  };
}
