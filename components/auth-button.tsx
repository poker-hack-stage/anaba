import Link from "next/link";
import { LogIn } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { LogoutButton } from "./logout-button";

export async function AuthButton() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <Link
        href="/auth/login"
        className="flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-bold text-stone-700 transition-colors hover:bg-stone-100 sm:text-sm"
      >
        <LogIn className="h-4 w-4" />
        ログイン
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span
        className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold uppercase text-emerald-800"
        title={user.email}
      >
        {user.email?.[0] ?? "?"}
      </span>
      <LogoutButton />
    </div>
  );
}
