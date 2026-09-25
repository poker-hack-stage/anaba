import { z } from "zod";
import { COMPANIONS, DURATIONS, INTERESTS, TRANSPORTS } from "./options";

// /api/plan の入力の検証と、Gemini に返させる JSON の形（#18）

/** リクエストの本文の上限（文字数）。正しい条件なら数百文字に収まる */
export const MAX_REQUEST_LENGTH = 2_000;

/**
 * 「絞る」で送られてくる条件（PlanConditions）。選択肢にない値や、余計な項目は受け付けない。
 * 地域名は、ここでは長さだけを確かめる（知らない地域名は toPlanRequest() で「おまかせ」になる）
 */
export const planConditionsSchema = z.strictObject({
  area: z.string().trim().min(1).max(40),
  duration: z.enum(DURATIONS),
  interests: z
    .array(z.enum(INTERESTS))
    .max(INTERESTS.length)
    .transform((interests) => [...new Set(interests)]),
  companion: z.enum(COMPANIONS),
  transport: z.enum(TRANSPORTS),
});

/**
 * Gemini の出力。地域とスポットは、プロンプトで渡した短い記号（A1・S1 など）で返させる。
 * 中身の正しさ（存在するか・その日の地域のスポットか・重なりがないか）は ai-candidates.ts で確かめる
 */
export const aiPlanSchema = z.object({
  candidates: z.array(
    z.object({
      title: z.string(),
      summary: z.string(),
      reason: z.string(),
      days: z.array(
        z.object({
          areaId: z.string(),
          spotIds: z.array(z.string()),
        }),
      ),
    }),
  ),
});

export type AiPlan = z.infer<typeof aiPlanSchema>;

/** aiPlanSchema と同じ形を、Gemini の構造化出力（responseJsonSchema）に渡す JSON Schema で書いたもの */
export const AI_PLAN_JSON_SCHEMA = {
  type: "object",
  properties: {
    candidates: {
      type: "array",
      description: "旅の候補。1件目から順に並べる",
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "候補のタイトル（20字前後）" },
          summary: { type: "string", description: "候補の説明（1〜2文）" },
          reason: {
            type: "string",
            description: "選んだ理由。旅の条件のどれにどう合うか（1〜2文）",
          },
          days: {
            type: "array",
            description: "日ごとの経路。日程の日数と同じ数",
            items: {
              type: "object",
              properties: {
                areaId: {
                  type: "string",
                  description: "その日にめぐる地域の記号（A1 など）",
                },
                spotIds: {
                  type: "array",
                  description:
                    "その日にめぐるスポットの記号（S1 など）。めぐる順",
                  items: { type: "string" },
                },
              },
              required: ["areaId", "spotIds"],
            },
          },
        },
        required: ["title", "summary", "reason", "days"],
      },
    },
  },
  required: ["candidates"],
} as const;
