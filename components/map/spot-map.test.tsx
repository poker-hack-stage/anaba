import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import type { Polygon } from "geojson";
import type { Spot } from "@/lib/data/spots";
import { SpotMap } from "./spot-map";

// MapLibre は jsdom では描けないので、表示範囲を動かす呼び出しと、イベントの受け渡しだけを持つ偽物にする
const maps = vi.hoisted(
  () =>
    [] as {
      easeTo: ReturnType<typeof vi.fn>;
      fitBounds: ReturnType<typeof vi.fn>;
      fire: (type: string, event?: object) => void;
    }[],
);

vi.mock("maplibre-gl", () => {
  class FakeMap {
    private listeners = new Map<string, Set<(event: object) => void>>();
    easeTo = vi.fn();
    fitBounds = vi.fn();
    touchZoomRotate = { disableRotation: () => {} };
    keyboard = { disableRotation: () => {} };
    constructor() {
      maps.push(this);
    }
    addControl() {}
    once() {}
    on(type: string, listener: (event: object) => void) {
      if (!this.listeners.has(type)) this.listeners.set(type, new Set());
      this.listeners.get(type)!.add(listener);
    }
    off(type: string, listener: (event: object) => void) {
      this.listeners.get(type)?.delete(listener);
    }
    fire(type: string, event: object = {}) {
      this.listeners.get(type)?.forEach((listener) => listener(event));
    }
    getContainer() {
      return { clientWidth: 1000 };
    }
    project() {
      return { x: 0, y: 0 };
    }
    remove() {}
  }
  class FakeMarker {
    setLngLat() {
      return this;
    }
    addTo() {
      return this;
    }
    setOffset() {
      return this;
    }
    remove() {}
  }
  return {
    Map: FakeMap,
    Marker: FakeMarker,
    NavigationControl: class {},
    setWorkerUrl: () => {},
  };
});

function spot(id: string, lng: number, lat: number): Spot {
  return {
    id,
    area_id: "hakuba",
    name: id,
    category: "onsen",
    lat,
    lng,
    rating: 4.0,
    hidden_gem_score: null,
    stay_minutes: 60,
    catchphrase: null,
    description: null,
    local_tip: null,
    best_time: null,
    image_path: null,
    tags: [],
    source: "seed",
    status: "published",
    nickname: null,
    created_at: "2026-09-25T00:00:00Z",
    updated_at: "2026-09-25T00:00:00Z",
  };
}

/** 地域の境界。呼ぶたびに別のオブジェクトを作る（DB から読み直したときと同じ） */
function boundary(): Polygon {
  return {
    type: "Polygon",
    coordinates: [
      [
        [137.7, 36.6],
        [137.9, 36.6],
        [137.9, 36.8],
        [137.7, 36.8],
        [137.7, 36.6],
      ],
    ],
  };
}

const spots = [spot("a", 137.8, 36.7), spot("b", 137.85, 36.72)];

afterEach(() => {
  maps.length = 0;
});

describe("SpotMap の表示範囲（#151）", () => {
  test("描き直しで同じ中身の境界・スポットを渡し直しても、表示範囲を合わせ直さない", () => {
    const { rerender } = render(
      <SpotMap highlighted={[...spots]} boundary={boundary()} />,
    );
    const map = maps[0];
    expect(map.fitBounds).toHaveBeenCalledTimes(1);

    // 詳細を開くなどで親が描き直す。配列も境界も別のオブジェクトになる
    rerender(<SpotMap highlighted={[...spots]} boundary={boundary()} />);
    rerender(<SpotMap highlighted={[...spots]} boundary={boundary()} />);
    expect(map.fitBounds).toHaveBeenCalledTimes(1);
    expect(map.easeTo).not.toHaveBeenCalled();
  });

  test("見る対象（スポット・境界）が変わったら、表示範囲を合わせる", () => {
    const { rerender } = render(
      <SpotMap highlighted={spots} boundary={boundary()} />,
    );
    const map = maps[0];
    expect(map.fitBounds).toHaveBeenCalledTimes(1);

    rerender(
      <SpotMap highlighted={[spot("c", 138.0, 36.5)]} boundary={boundary()} />,
    );
    expect(map.fitBounds).toHaveBeenCalledTimes(2);

    const wider = boundary();
    wider.coordinates[0][1] = [138.2, 36.6];
    rerender(
      <SpotMap highlighted={[spot("c", 138.0, 36.5)]} boundary={wider} />,
    );
    expect(map.fitBounds).toHaveBeenCalledTimes(3);
    expect(map.fitBounds.mock.calls[2][0]).toEqual([
      [137.7, 36.5],
      [138.2, 36.8],
    ]);
  });
});

describe("SpotMap の onUserMove（#151）", () => {
  test("利用者の操作による移動（originalEvent がある）だけを知らせる", () => {
    const onUserMove = vi.fn();
    render(<SpotMap highlighted={spots} onUserMove={onUserMove} />);
    const map = maps[0];

    // fitBounds・easeTo による移動には originalEvent が付かない
    act(() => map.fire("movestart", {}));
    expect(onUserMove).not.toHaveBeenCalled();

    act(() => map.fire("movestart", { originalEvent: new Event("wheel") }));
    expect(onUserMove).toHaveBeenCalledTimes(1);
  });
});
