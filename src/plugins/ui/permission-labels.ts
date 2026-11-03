import type { Permission } from '@pd2-trader/plugin-sdk';

/** i18n key (namespace `plugins`) of a permission's plain-language label/description. ':' would split the namespace. */
export const permissionKey = (permission: Permission, part: 'label' | 'description') =>
  `permissions.${permission.replace(':', '_')}.${part}`;
