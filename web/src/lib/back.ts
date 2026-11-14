/**
 * Where to go after an action on a lead. The same lead panel is shown on its own page and as a
 * pop-up over the board, so each form says where it was pressed (a hidden "back" field) and the
 * person lands back in the same place. Only addresses inside the same brand are accepted.
 */
export function backWith(form: FormData, slug: string, fallback: string, param: string): string {
  const back = String(form.get("back") ?? "");
  const safe = back.startsWith(`/b/${slug}/`) && !back.includes("//") && !back.includes("\\") && !/[\r\n]/.test(back);
  const base = safe ? back : fallback;
  return `${base}${base.includes("?") ? "&" : "?"}${param}`;
}
