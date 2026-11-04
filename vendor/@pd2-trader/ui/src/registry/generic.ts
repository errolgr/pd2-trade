import { dataDocs } from './generic/data';
import { feedbackDocs } from './generic/feedback';
import { formsDocs } from './generic/forms';
import { layoutDocs } from './generic/layout';
import { navigationDocs } from './generic/navigation';
import { overlayDocs } from './generic/overlay';
import { primitivesDocs } from './generic/primitives';
import { slotsDocs } from './generic/slots';
import type { ComponentDoc } from './types';

/** Every generic (non-D2) component, one file per category under `generic/`. */
export const genericDocs: ComponentDoc[] = [
  ...primitivesDocs,
  ...formsDocs,
  ...overlayDocs,
  ...navigationDocs,
  ...dataDocs,
  ...feedbackDocs,
  ...layoutDocs,
  ...slotsDocs,
];
