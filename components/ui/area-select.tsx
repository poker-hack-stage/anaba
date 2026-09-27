import { useId, useMemo } from "react";

import { groupAreasByPrefecture } from "@/lib/planner/area-groups";
import { cn } from "@/lib/utils";
import { Select, type SelectProps } from "./select";

type AreaOption = { id: string; name: string; prefecture: string };

export interface AreaSelectProps {
  /** 選べる地域（display_order の順）。県の一覧・市区町村の一覧はここから作る（登録済みの地域がある県・市区町村だけ、#147） */
  areas: readonly AreaOption[];
  /** 選んでいる都道府県名。選んでいなければ "" */
  prefecture: string;
  /** 選んでいる地域の id。選んでいなければ "" */
  areaId: string;
  onPrefectureChange: (prefecture: string) => void;
  onAreaChange: (areaId: string) => void;
  /**
   * 県の select に出す都道府県（並びもこの順）。渡すと、地域がまだない県も選べるようにし、名前に「（準備中）」を付ける
   * （「穴場を教える」の全国対応）。渡さなければ、地域がある県だけを出す（旅プラン）
   */
  prefectures?: readonly string[];
  shape?: SelectProps["shape"];
  /** 市区町村の select に渡す属性（id・aria-required・aria-invalid・aria-describedby など） */
  areaSelectProps?: Pick<
    SelectProps,
    "id" | "aria-required" | "aria-invalid" | "aria-describedby"
  >;
  /** 値を選んでいる select に付けるクラス（旅プランでは、選択中の Chip と同じ濃い枠にする） */
  selectedClassName?: string;
  /** 値を選んでいない select に付けるクラス */
  unselectedClassName?: string;
  labelClassName?: string;
  className?: string;
}

/**
 * 地域を「都道府県 → 市区町村」の2段で選ぶ部品（#147）。どちらもブラウザ標準の select なので、
 * キーボード操作・読み上げはブラウザに任せる（select.tsx と同じ）。
 * 市区町村の select は、県を選ぶまで押せない。県を変えたときに市区町村の選択を外すのは、使う側（onPrefectureChange）で行う
 */
export function AreaSelect({
  areas,
  prefecture,
  areaId,
  onPrefectureChange,
  onAreaChange,
  prefectures,
  shape,
  areaSelectProps,
  selectedClassName,
  unselectedClassName,
  labelClassName,
  className,
}: AreaSelectProps) {
  const prefectureSelectId = useId();
  const fallbackAreaSelectId = useId();
  const areaSelectId = areaSelectProps?.id ?? fallbackAreaSelectId;
  const groups = useMemo(() => groupAreasByPrefecture(areas), [areas]);
  const municipalities =
    groups.find((group) => group.prefecture === prefecture)?.areas ?? [];
  const prefectureOptions = useMemo(
    () => toPrefectureOptions(groups, prefectures),
    [groups, prefectures],
  );
  // 地域がまだない県を選んでいる（prefectures を渡したときだけ起きる）
  const noMunicipality = prefecture !== "" && municipalities.length === 0;
  const stateClass = (selected: boolean) =>
    selected ? selectedClassName : unselectedClassName;
  const labelClass = cn(
    "block text-xs font-bold text-stone-700",
    labelClassName,
  );

  return (
    <div className={cn("grid grid-cols-2 gap-2", className)}>
      <div className="flex min-w-0 flex-col gap-1">
        <label htmlFor={prefectureSelectId} className={labelClass}>
          都道府県
        </label>
        <Select
          id={prefectureSelectId}
          shape={shape}
          value={prefecture}
          onChange={(e) => onPrefectureChange(e.target.value)}
          className={stateClass(prefecture !== "")}
        >
          {/* 375px では select の幅が 150px ほどなので、切れない短い文にする（何を選ぶかは label に書いてある） */}
          <option value="">選ぶ</option>
          {prefectureOptions.map((option) => (
            <option key={option.prefecture} value={option.prefecture}>
              {option.hasAreas
                ? option.prefecture
                : `${option.prefecture}（準備中）`}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <label htmlFor={areaSelectId} className={labelClass}>
          市区町村
        </label>
        <Select
          {...areaSelectProps}
          id={areaSelectId}
          shape={shape}
          value={areaId}
          onChange={(e) => onAreaChange(e.target.value)}
          disabled={prefecture === "" || noMunicipality}
          className={stateClass(areaId !== "")}
        >
          <option value="">
            {prefecture === ""
              ? "先に県を選ぶ"
              : noMunicipality
                ? "まだありません"
                : "選ぶ"}
          </option>
          {municipalities.map((area) => (
            <option key={area.id} value={area.id}>
              {area.name}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}

/**
 * 県の select の選択肢。prefectures を渡さなければ地域がある県だけ（display_order の順）。
 * 渡したらその順で全部を出し、一覧にない県の地域があれば（名前の書き方の違いなど）選べなくならないよう後ろに足す
 */
function toPrefectureOptions(
  groups: readonly { prefecture: string }[],
  prefectures: readonly string[] | undefined,
): { prefecture: string; hasAreas: boolean }[] {
  if (!prefectures) {
    return groups.map((group) => ({
      prefecture: group.prefecture,
      hasAreas: true,
    }));
  }
  const withAreas = new Set(groups.map((group) => group.prefecture));
  const listed = new Set(prefectures);
  return [
    ...prefectures.map((prefecture) => ({
      prefecture,
      hasAreas: withAreas.has(prefecture),
    })),
    ...groups
      .filter((group) => !listed.has(group.prefecture))
      .map((group) => ({ prefecture: group.prefecture, hasAreas: true })),
  ];
}
