// @vitest-environment happy-dom
import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ScrollArea } from './scroll-area';

afterEach(cleanup);

describe('ScrollArea', () => {
  it('forwards its ref to the root so callers can reach the viewport', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<ScrollArea ref={ref}>content</ScrollArea>);

    expect(ref.current?.dataset.slot).toBe('scroll-area');
    expect(ref.current?.querySelector('[data-radix-scroll-area-viewport]')?.textContent).toBe('content');
  });
});
