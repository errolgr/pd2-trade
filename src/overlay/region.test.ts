// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { buildRegion, collectRegion, regionsEqual, toRegionRect } from './region';

const rect = (left: number, top: number, width: number, height: number) => ({
  left,
  top,
  width,
  height,
  right: left + width,
  bottom: top + height,
});

describe('toRegionRect', () => {
  it('pads by 4 physical px at dpr 1', () => {
    expect(toRegionRect(rect(100, 50, 200, 100), 1)).toEqual({ x: 96, y: 46, width: 208, height: 108 });
  });

  it('scales by dpr, flooring the top-left and ceiling the bottom-right before padding', () => {
    // 10.3*1.5 = 15.45 -> 15 - 4 = 11; right (10.3+20.1)*1.5 = 45.6 -> 46 + 4 = 50
    expect(toRegionRect(rect(10.3, 10.3, 20.1, 20.1), 1.5)).toEqual({ x: 11, y: 11, width: 39, height: 39 });
    expect(toRegionRect(rect(100, 100, 50, 25), 2)).toEqual({ x: 196, y: 196, width: 108, height: 58 });
  });

  it('clamps at the overlay origin', () => {
    expect(toRegionRect(rect(1, 0, 10, 10), 1)).toEqual({ x: 0, y: 0, width: 15, height: 14 });
    // fully off-screen to the top-left: nothing left after clamping
    expect(toRegionRect(rect(-50, -50, 20, 20), 1)).toBeNull();
  });

  it('skips zero-size rects (display:none panels)', () => {
    expect(toRegionRect(rect(10, 10, 0, 0), 1)).toBeNull();
    expect(toRegionRect(rect(10, 10, 5, 0), 2)).toBeNull();
  });
});

describe('buildRegion', () => {
  it('drops empty rects and collapses identical ones, keeping order', () => {
    const region = buildRegion([rect(0, 0, 10, 10), rect(50, 50, 0, 0), rect(20, 20, 10, 10), rect(0, 0, 10, 10)], 1);
    expect(region).toEqual([
      { x: 0, y: 0, width: 14, height: 14 },
      { x: 16, y: 16, width: 18, height: 18 },
    ]);
  });

  it('dedupes rects that only become identical after rounding', () => {
    expect(buildRegion([rect(10.1, 10.1, 9.8, 9.8), rect(10.4, 10.4, 9.5, 9.5)], 1)).toHaveLength(1);
  });
});

describe('regionsEqual', () => {
  const a = [{ x: 1, y: 2, width: 3, height: 4 }];
  it('compares element-wise and treats "never sent" as different', () => {
    expect(regionsEqual(null, a)).toBe(false);
    expect(regionsEqual(a, [{ x: 1, y: 2, width: 3, height: 4 }])).toBe(true);
    expect(regionsEqual(a, [{ x: 1, y: 2, width: 3, height: 5 }])).toBe(false);
    expect(regionsEqual(a, [])).toBe(false);
    expect(regionsEqual([], [])).toBe(true);
  });
});

describe('collectRegion', () => {
  it('collects every interactive selector and ignores the rest', () => {
    document.body.innerHTML = `
      <div data-interactive="true" id="panel"></div>
      <div role="dialog" id="dialog"></div>
      <div data-sonner-toast id="toast"></div>
      <div id="plain"></div>`;
    const boxes: Record<string, ReturnType<typeof rect>> = {
      panel: rect(0, 0, 100, 100),
      dialog: rect(200, 200, 50, 50),
      toast: rect(300, 300, 0, 0), // hidden
      plain: rect(400, 400, 10, 10),
    };
    for (const el of Array.from(document.body.children)) {
      (el as HTMLElement).getBoundingClientRect = () => boxes[el.id] as DOMRect;
    }
    expect(collectRegion(document, 1)).toEqual([
      { x: 0, y: 0, width: 104, height: 104 },
      { x: 196, y: 196, width: 58, height: 58 },
    ]);
  });
});
