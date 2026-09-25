"use client";

import {
  Suspense,
  createContext,
  use,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { CircleCheckBig, Loader2, MapPinPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  SpotSubmissionForm,
  type SubmittableArea,
} from "./spot-submission-form";

/*
  「穴場を教える」（#54）。入口のボタンは PC のヒーローとスマホのページの下の2か所にあるので、
  ダイアログは SpotSubmissionProvider に1つだけ置き、ボタン（SpotSubmissionTrigger）から開く。
  地域の一覧（境界を含む）はサーバーから Promise で受け取り、ダイアログを開いたときに読む（ページの表示を待たせない）。
  読めなかったときは null（ページごとエラーにせず、ダイアログの中で知らせる）
*/

const OpenContext = createContext<(() => void) | null>(null);

export function SpotSubmissionProvider({
  areas,
  children,
}: {
  areas: Promise<SubmittableArea[] | null>;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  // Trigger を使わずに開くので、閉じたら開く前にフォーカスがあった場所（押したボタン）へ自分で戻す
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const openDialog = () => {
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setOpen(true);
  };

  return (
    <OpenContext value={openDialog}>
      {children}
      <SpotSubmissionDialog
        areas={areas}
        open={open}
        onOpenChange={setOpen}
        returnFocusRef={returnFocusRef}
      />
    </OpenContext>
  );
}

/** 「穴場を教える」のボタン。見た目は置く場所に合わせて className で決める */
export function SpotSubmissionTrigger({ className }: { className?: string }) {
  const open = use(OpenContext);
  return (
    <button
      type="button"
      onClick={() => open?.()}
      aria-haspopup="dialog"
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
    >
      <MapPinPlus aria-hidden className="h-4 w-4" />
      穴場を教える
    </button>
  );
}

/**
 * 投稿フォームのダイアログ。形はスポット詳細（spot-detail-dialog.tsx）と同じで、スマホでは下から 92dvh で出す。
 * 入力の途中で外側を押して消えないよう、閉じるのは「×」「やめる」と Esc だけにする。
 * 投稿できたら、次の読み込み（router.refresh()）で「穴場を探す」の地図に出す
 */
function SpotSubmissionDialog({
  areas,
  open,
  onOpenChange,
  returnFocusRef,
}: {
  areas: Promise<SubmittableArea[] | null>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocusRef: React.RefObject<HTMLElement | null>;
}) {
  const router = useRouter();
  const [done, setDone] = useState(false);
  // 開き直したら、新しい投稿のフォームから始める
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) setDone(false);
  }

  const submitted = () => {
    setDone(true);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-stone-900/50 backdrop-blur-sm" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onInteractOutside={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => {
            const el = returnFocusRef.current;
            if (el?.isConnected) {
              e.preventDefault();
              el.focus();
            }
          }}
          className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[92dvh] max-w-2xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl duration-200 focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 max-sm:h-[92dvh] max-sm:data-[state=closed]:slide-out-to-bottom max-sm:data-[state=open]:slide-in-from-bottom sm:inset-x-auto sm:bottom-auto sm:left-[50%] sm:top-[50%] sm:w-[calc(100%-2rem)] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-3xl sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:slide-out-to-left-1/2 sm:data-[state=closed]:slide-out-to-top-[48%] sm:data-[state=open]:slide-in-from-left-1/2 sm:data-[state=open]:slide-in-from-top-[48%]"
        >
          {/* スクロールしても閉じるボタンが見えるよう、見出しの行は上に貼り付ける */}
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-stone-100 bg-white px-5 py-4 sm:px-6">
            <DialogPrimitive.Title className="font-brand text-lg font-bold text-ink">
              穴場を教える
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="閉じる"
              className="flex h-9 w-9 items-center justify-center rounded-full text-stone-700 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          </div>

          <div className="p-5 sm:p-6">
            {done ? (
              <SubmittedMessage />
            ) : (
              <Suspense fallback={<FormLoading />}>
                <FormWithAreas
                  areas={areas}
                  onSubmitted={submitted}
                  onCancel={() => onOpenChange(false)}
                />
              </Suspense>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

function FormWithAreas({
  areas,
  ...props
}: {
  areas: Promise<SubmittableArea[] | null>;
  onSubmitted: () => void;
  onCancel: () => void;
}) {
  const loaded = use(areas);
  if (!loaded) {
    return (
      <p
        role="alert"
        className="rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700"
      >
        地域を読み込めませんでした。時間をおいて、ページを読み込み直してください
      </p>
    );
  }
  return <SpotSubmissionForm areas={loaded} {...props} />;
}

function FormLoading() {
  return (
    <p
      role="status"
      className="flex items-center justify-center gap-2 py-10 text-sm text-stone-500"
    >
      <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
      読み込み中…
    </p>
  );
}

function SubmittedMessage() {
  return (
    <div
      role="status"
      className="flex flex-col items-center gap-3 py-10 text-center"
    >
      <CircleCheckBig aria-hidden className="h-10 w-10 text-ink" />
      <p className="text-base font-bold text-stone-900">
        ありがとうございます。公開しました
      </p>
      <p className="text-sm text-stone-600">
        「穴場を探す」の地図と AI旅プランに出ます。
      </p>
      <DialogPrimitive.Close asChild>
        <Button className="mt-2">閉じる</Button>
      </DialogPrimitive.Close>
    </div>
  );
}
