/** Replaces every anchor with its text so the article reads as plain prose. */
export function stripLinks(html: string): string {
  return html.replace(/<a[^>]*>([\s\S]*?)<\/a>/g, '$1');
}
