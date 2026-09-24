import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email: string | undefined;
};

/**
 * ログイン中のユーザーを返す。未ログインなら null。
 * cookie を読むので、呼び出すコンポーネントは <Suspense> の内側に置くこと。
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return null;

  return { id: claims.sub, email: claims.email };
}
