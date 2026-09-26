import { z } from "zod";
import { DAY_COUNTS } from "./duration";
import { MAX_CANDIDATES, MAX_DAY_SPOTS, MIN_DAY_SPOTS } from "./generate";
import { MAX_NOTE_LENGTH, normalizeNote, noteLength } from "./note";
import { COMPANIONS, DURATIONS, INTERESTS, TRANSPORTS } from "./options";

// /api/plan の入力の検証と、Gemini に返させる JSON の形（#18）

/** リクエストの本文の上限（バイト数）。正しい条件なら数百バイトに収まる（日本語は1文字3バイト） */
export const MAX_REQUEST_BYTES = 8_000;

/**
 * 「旅プランをつくる」で送られてくる条件（PlanConditions）。選択肢にない値や、余計な項目は受け付けない。
 * 地域とスポットの id は、ここでは長さだけを確かめる（知らない地域の id は「おまかせ」として扱う、generate.ts・ai-prompt.ts。
 * 知らないスポットの id は、どの候補にも入れられないので候補を0件にする、include-spot.ts）
 */
export const planConditionsSchema = z.strictObject({
  areaId: z.string().trim().min(1).max(64).nullable(),
  duration: z.enum(DURATIONS),
  interests: z
    .array(z.enum(INTERESTS))
    .max(INTERESTS.length)
    .transform((interests) => [...new Set(interests)]),
  companion: z.enum(COMPANIONS),
  transport: z.enum(TRANSPORTS),
  // 「このスポットを経路に加えて作り直す」（#32）で、どの候補にも必ず入れるスポットの id。知らない id なら候補は0件になる
  includeSpotId: z.string().trim().min(1).max(64).optional(),
  // 自由記述の希望（#114）。改行・制御文字を空白にしてから、100字（見た目の1文字）まで。空なら書かなかったことにする
  note: z
    .string()
    .transform(normalizeNote)
    .refine((note) => noteLength(note) <= MAX_NOTE_LENGTH)
    .transform((note) => note || undefined)
    .optional(),
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

/** 日程の日数の上限（2泊3日） */
const MAX_DAYS = Math.max(...Object.values(DAY_COUNTS));

/**
 * aiPlanSchema と同じ形を、Gemini の構造化出力（responseJsonSchema）に渡す JSON Schema で書いたもの。
 * 件数の上限と下限（minItems・maxItems、#113）は、決まり（docs/spec.md のデータ-4）の範囲を伝えるだけ。
 * ちょうどの件数はプロンプトで伝え、守られなかったときは ai-candidates.ts で直すか捨てる
 */
export const AI_PLAN_JSON_SCHEMA = {
  type: "object",
  properties: {
    candidates: {
      type: "array",
      description: "旅の候補。1件目から順に並べる",
      minItems: 1,
      maxItems: MAX_CANDIDATES,
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
            minItems: 1,
            maxItems: MAX_DAYS,
            items: {
              type: "object",
              properties: {
                areaId: {
                  type: "string",
                  description: "その日にめぐる地域の記号（A1 など）",
                },
                spotIds: {
                  type: "array",
                  description: "その日にめぐるスポットの記号（S1 など）",
                  minItems: MIN_DAY_SPOTS,
                  maxItems: MAX_DAY_SPOTS,
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
