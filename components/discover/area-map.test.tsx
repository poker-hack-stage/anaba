import { render } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import type { SpotMapProps } from "@/components/map/spot-map";
import type { AreaWithSpots } from "@/lib/data/areas";
import type { Spot } from "@/lib/data/spots";
import { AreaMap } from "./area-map";

// 地図（MapLibre）は jsdom では描けないので、next/dynamic が返す部品の代わりに、渡された props と作り直しの回数を記録する
const map = vi.hoisted(() => ({
  props: [] as SpotMapProps[],
  mounts: 0,
}));

vi.mock("next/dynamic", async () => {
  const { useEffect } = await import("react");
  return {
    default: () =>
      function FakeSpotMap(props: SpotMapProps) {
        map.props.push(props);
        useEffect(() => {
          map.mounts += 1;
        }, []);
        return null;
      },
  };
});

const polygon = {
  type: "Polygon",
  coordinates: [
    [
      [137.8, 36.6],
      [137.9, 36.6],
      [137.9, 36.7],
      [137.8, 36.6],
    ],
  ],
};

function spot(id: string): Spot {
  return { id, name: id, lat: 36.65, lng: 137.85 } as Spot;
}

function area(id: string, boundary: unknown): AreaWithSpots {
  const spots = [spot(`${id}-1`), spot(`${id}-2`), spot(`${id}-3`)];
  return {
    id,
    name: id,
    boundary,
    spots: [...spots, spot(`${id}-other`)],
    recommended: spots,
  } as AreaWithSpots;
}

function lastProps() {
  return map.props[map.props.length - 1];
}

beforeEach(() => {
  map.props = [];
  map.mounts = 0;
});

describe("AreaMap（#14）", () => {
  test("境界を渡し、おすすめに番号を付け、なめらかに移動させる", () => {
    const hakuba = area("hakuba", polygon);
    render(<AreaMap area={hakuba} onSpotClick={() => {}} />);

    const props = lastProps();
    expect(props.boundary).toBe(polygon);
    expect(props.highlighted).toBe(hakuba.recommended);
    expect(props.numberHighlighted).toBe(true);
    expect(props.animateMove).toBe(true);
    expect(props.others?.map((s) => s.id)).toEqual(["hakuba-other"]);
  });

  test("地域が変わっても地図を作り直さない", () => {
    const { rerender } = render(
      <AreaMap area={area("hakuba", polygon)} onSpotClick={() => {}} />,
    );
    rerender(<AreaMap area={area("omachi", polygon)} onSpotClick={() => {}} />);

    expect(map.mounts).toBe(1);
    expect(lastProps().areaName).toBe("omachi");
  });

  test("読めない境界は渡さない", () => {
    render(
      <AreaMap
        area={area("hakuba", { type: "Polygon", coordinates: "broken" })}
        onSpotClick={() => {}}
      />,
    );
    expect(lastProps().boundary).toBeNull();
  });

  test("地域がない（絞り込みで0件）ときは境界もピンも渡さない", () => {
    render(<AreaMap onSpotClick={() => {}} />);
    const props = lastProps();
    expect(props.boundary).toBeNull();
    expect(props.highlighted).toBeUndefined();
    expect(props.emptyPlaceholder).toBe(false);
  });
});
