/**
 * Fills `{token}` placeholders in a user-editable message template (Options → Chat). Tokens listed in `vars`
 * are replaced everywhere they appear, a missing value with ''; tokens not in `vars` stay as typed.
 */
export function fillTemplate(
  template: string,
  vars: Readonly<Record<string, string | number | null | undefined>>,
): string {
  return template.replace(/\{(\w+)\}/g, (token, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name] ?? '') : token,
  );
}
