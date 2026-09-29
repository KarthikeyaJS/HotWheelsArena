/** DOM id of a tab button: `${idPrefix}-tab-${id}`. */
export function tabId(idPrefix: string, id: string): string {
  return `${idPrefix}-tab-${id}`;
}

/** DOM id of a tab panel: `${idPrefix}-panel-${id}`. */
export function tabPanelId(idPrefix: string, id: string): string {
  return `${idPrefix}-panel-${id}`;
}
