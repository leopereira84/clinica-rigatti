/**
 * Describes the seed target for logs with only the connection scheme and the
 * database name: credentials, host and query string are never shown.
 * Example: "mongodb+srv://<hidden host>/clinica_rigatti".
 */
export function describeTarget(uri: string): string {
  const match = /^([a-z][a-z0-9+.-]*):\/\/[^/?]*(?:\/([^?]*))?/i.exec(uri.trim());
  const scheme = match?.[1] ?? 'unknown';
  const database = match?.[2] ? decodeURIComponent(match[2]) : '(default database)';
  return `${scheme}://<hidden host>/${database}`;
}
