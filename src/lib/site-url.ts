/** Basis-URL voor links in e-mails: SITE_URL (productie) of anders de origin van het verzoek. */
export function getSiteUrl(request: Request): string {
  const configured = process.env.SITE_URL?.trim();
  return (configured || new URL(request.url).origin).replace(/\/+$/, "");
}
