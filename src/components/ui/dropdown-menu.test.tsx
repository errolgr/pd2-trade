// @vitest-environment happy-dom
import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DropdownMenu, DropdownMenuTrigger } from './dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';

afterEach(cleanup);

describe('DropdownMenuTrigger', () => {
  it('forwards its ref so a TooltipTrigger asChild around it gets positioned', async () => {
    render(
      <TooltipProvider>
        <DropdownMenu>
          <Tooltip open>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger>more</DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>More actions</TooltipContent>
          </Tooltip>
        </DropdownMenu>
      </TooltipProvider>,
    );

    // Radix parks unanchored popper content at translate(0, -200%) until floating-ui positions it.
    const wrapper = (await screen.findByRole('tooltip')).closest('[data-radix-popper-content-wrapper]') as HTMLElement;
    await waitFor(() => expect(wrapper.style.transform).not.toBe('translate(0, -200%)'));
  });
});
