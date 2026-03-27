import { Utils } from "@bitwarden/common/platform/misc/utils";
import { CipherType } from "@bitwarden/common/vault/enums";
import { CipherView } from "@bitwarden/common/vault/models/view/cipher.view";

export interface PasskeyServiceEntry {
  instructions: string;
  supportsPasskeyLogin: boolean;
  supportsPasskeyMfa: boolean;
}

export interface PasskeyCipherRow {
  cipher: CipherView;
  instructions: string | null;
  supportsPasskeyLogin: boolean;
  supportsPasskeyMfa: boolean;
}

/**
 * Matches a cipher against the passkey directory to find a supporting service.
 * Returns the matching entry if the cipher is a login with URIs that match a known passkey service
 * and does not already have FIDO2 credentials configured.
 */
export function getPasskeyServiceMatch(
  cipher: CipherView,
  passkeyServices: Map<string, PasskeyServiceEntry>,
): PasskeyServiceEntry | null {
  const { type, login, isDeleted, viewPassword } = cipher;

  if (
    type !== CipherType.Login ||
    !login.hasUris ||
    login.hasFido2Credentials ||
    isDeleted ||
    !viewPassword
  ) {
    return null;
  }

  for (const u of login.uris) {
    if (!u.uri) {
      continue;
    }
    const uri = u.uri.replace("www.", "");
    const key = [Utils.getHost(uri), Utils.getDomain(uri)].find(
      (k) => k != null && passkeyServices.has(k),
    );

    if (key != null) {
      return passkeyServices.get(key) ?? null;
    }
  }
  return null;
}

/**
 * Processes a list of ciphers against the passkey directory, returning matching ciphers
 * as unified row objects with their passkey metadata.
 */
export function processPasskeyCiphers(
  allCiphers: CipherView[],
  passkeyServices: Map<string, PasskeyServiceEntry>,
): PasskeyCipherRow[] {
  const rows: PasskeyCipherRow[] = [];

  for (const cipher of allCiphers) {
    const match = getPasskeyServiceMatch(cipher, passkeyServices);

    if (match != null) {
      rows.push(buildPasskeyCipherRow(cipher, match));
    }
  }

  return rows;
}

/**
 * Builds a PasskeyCipherRow from a cipher and its matching passkey service entry.
 */
export function buildPasskeyCipherRow(
  cipher: CipherView,
  match: PasskeyServiceEntry,
): PasskeyCipherRow {
  return {
    cipher,
    instructions: match.instructions !== "" ? match.instructions : null,
    supportsPasskeyLogin: match.supportsPasskeyLogin,
    supportsPasskeyMfa: match.supportsPasskeyMfa,
  };
}
