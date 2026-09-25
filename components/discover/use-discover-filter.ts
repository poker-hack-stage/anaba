import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { SpotCategory } from "@/lib/spots/categories";
import {
  EMPTY_FILTER,
  fromFilterQuery,
  getLastFilter,
  hasFilterQuery,
  isSameFilter,
  setLastFilter,
  toFilterQuery,
  type DiscoverFilter,
} from "./filter-query";

/** 検索欄の入力を条件に反映するまで待つ時間 */
const INPUT_DEBOUNCE_MS = 300;

/**
 * 画面を再読み込みせずに URL のクエリの条件のキーだけ書き換える（useSearchParams にも反映される）。
 * #8（planner-form.tsx）と同じやり方。書いた条件を「最後の条件」として覚える
 * （条件を空にしたときに、URL にクエリがないのを見て前の条件を戻してしまわないように）
 */
function replaceFilterQuery(filter: DiscoverFilter) {
  const query = toFilterQuery(
    new URLSearchParams(window.location.search),
    filter,
  );
  setLastFilter(fromFilterQuery(new URLSearchParams(query)));
  window.history.replaceState(
    null,
    "",
    query === "" ? window.location.pathname : `?${query}`,
  );
}

/**
 * 「穴場を探す」の絞り込み条件（docs/spec.md 画面-3）。条件は URL のクエリ（`/?q=…&cat=onsen,view`）に持つ。
 * 検索欄の入力は 300ms 待ってから URL に書く（IME の変換中は書かず、確定してから待つ）。カテゴリは押したらすぐ書く。
 * 「AI旅プラン」タブから戻ってきて URL にクエリがないときは、最後の条件を URL に戻す
 */
export function useDiscoverFilter() {
  const searchParams = useSearchParams();
  const filter = useMemo(() => fromFilterQuery(searchParams), [searchParams]);

  const [text, setText] = useState(filter.q);
  const [focused, setFocused] = useState(false);
  // IME の変換中か（変換中の読みを URL に書いて、件数や空状態がちらつかないように）
  const [composing, setComposing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // URL のキーワードが外から変わったとき（最後の条件を戻した、など）は検索欄に写す。
  // 入力中は写さない（300ms 前の入力で、打っている途中の文字を上書きしないように）
  const [syncedQ, setSyncedQ] = useState(filter.q);
  if (syncedQ !== filter.q) {
    setSyncedQ(filter.q);
    if (!focused) setText(filter.q);
  }

  // タブで戻ってきて URL にクエリがないときは、最後の条件を URL に戻す。
  // Next.js は離れた画面を消さずに隠して残す（戻ってきたときに作り直さない）ので、初回だけでなく毎回見る
  useEffect(() => {
    const last = getLastFilter();
    if (!hasFilterQuery(searchParams) && !isSameFilter(last, EMPTY_FILTER)) {
      replaceFilterQuery(last);
    } else {
      setLastFilter(filter);
    }
  }, [searchParams, filter]);

  useEffect(() => {
    if (composing || text === filter.q) return;
    const id = setTimeout(
      () => replaceFilterQuery({ ...filter, q: text }),
      INPUT_DEBOUNCE_MS,
    );
    return () => clearTimeout(id);
  }, [composing, text, filter]);

  /** 待たずにすぐ反映する（Enter を押したとき） */
  const flush = useCallback(() => {
    if (text !== filter.q) replaceFilterQuery({ ...filter, q: text });
  }, [text, filter]);

  const toggleCategory = (category: SpotCategory) => {
    const categories = filter.categories.includes(category)
      ? filter.categories.filter((c) => c !== category)
      : [...filter.categories, category];
    // 入力待ちのキーワードも一緒に反映する
    replaceFilterQuery({ q: text, categories });
  };

  // 押したボタン（件数の横・空状態）は消えるので、フォーカスを検索欄に戻す（body に落ちないように）
  const clear = () => {
    setText("");
    replaceFilterQuery(EMPTY_FILTER);
    inputRef.current?.focus();
  };

  return {
    filter,
    text,
    setText,
    flush,
    toggleCategory,
    clear,
    /** 検索欄にフォーカスがあるか（ある間は自動巡回を止める） */
    focused,
    /** 検索欄に渡す ref とイベント */
    inputProps: {
      ref: inputRef,
      onFocus: () => setFocused(true),
      onBlur: () => setFocused(false),
      onCompositionStart: () => setComposing(true),
      onCompositionEnd: () => setComposing(false),
    },
  };
}
