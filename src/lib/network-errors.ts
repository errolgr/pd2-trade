// Failures from the Rust HTTP stack (reqwest, behind tauri-plugin-http and tauri-plugin-updater) that mean the remote
// couldn't be reached or the transfer broke off: the user is offline, a proxy/firewall/region blocks GitHub or PD2,
// or the service is down. Nothing in the app can fix them, so they are warnings, not error reports. The plugins reject
// with the Rust error string (not an Error).
// - "error sending request for url (…)": DNS, connect, TLS or timeout failure.
// - "error decoding response body": the body stream broke off mid-transfer (an update download, a JSON response).
// - "Could not fetch a valid release JSON from the remote": the updater endpoint (GitHub) answered with a non-2xx.
// - "Download request failed with status: 403/429/5xx": GitHub refused or failed the installer download. A 404 stays an
//   error: it means the published release is missing an asset.
const NETWORK_ERROR =
  /error sending request|error decoding response body|Could not fetch a valid release JSON|Download request failed with status: (?:403|429|5\d\d)/i;

export function isNetworkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return NETWORK_ERROR.test(message);
}
