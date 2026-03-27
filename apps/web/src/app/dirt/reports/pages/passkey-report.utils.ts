import { WritableSignal } from "@angular/core";

import { PasskeyDirectoryApiServiceAbstraction } from "@bitwarden/common/dirt/services/abstractions/passkey-directory-api.service.abstraction";
import { Utils } from "@bitwarden/common/platform/misc/utils";
import { UserId } from "@bitwarden/common/types/guid";
import { CipherType } from "@bitwarden/common/vault/enums";
import { CipherView } from "@bitwarden/common/vault/models/view/cipher.view";

export interface PasskeyServiceEntry {
  instructions: string;
  supportsPasskeyLogin: boolean;
  supportsPasskeyMfa: boolean;
}

export interface PasskeyTypeInfo {
  supportsPasskeyLogin: boolean;
  supportsPasskeyMfa: boolean;
}

export interface ProcessedPasskeyCiphers {
  ciphers: CipherView[];
  docs: Map<string, string>;
  passkeyTypes: Map<string, PasskeyTypeInfo>;
}

/**
 * Loads passkey directory entries and builds a domain-to-entry lookup map.
 */
export async function loadPasskeyServices(
  passkeyDirectoryApiService: PasskeyDirectoryApiServiceAbstraction,
  userId: UserId,
): Promise<Map<string, PasskeyServiceEntry>> {
  const entries = await passkeyDirectoryApiService.getPasskeyDirectory(userId);

  return entries
    .filter((x) => x.domainName != null)
    .reduce(
      (services, entry) => services.set(entry.domainName, entry),
      new Map<string, PasskeyServiceEntry>(),
    );
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
 * Processes a list of ciphers against the passkey directory, returning the filtered ciphers
 * along with their instruction docs and passkey type info.
 */
export function processPasskeyCiphers(
  allCiphers: CipherView[],
  passkeyServices: Map<string, PasskeyServiceEntry>,
): ProcessedPasskeyCiphers {
  const ciphers: CipherView[] = [];
  const docs = new Map<string, string>();
  const passkeyTypes = new Map<string, PasskeyTypeInfo>();

  for (const cipher of allCiphers) {
    const match = getPasskeyServiceMatch(cipher, passkeyServices);

    if (match != null) {
      ciphers.push(cipher);
      if (match.instructions !== "") {
        docs.set(cipher.id, match.instructions);
      }
      passkeyTypes.set(cipher.id, {
        supportsPasskeyLogin: match.supportsPasskeyLogin,
        supportsPasskeyMfa: match.supportsPasskeyMfa,
      });
    }
  }

  return { ciphers, docs, passkeyTypes };
}

/**
 * Updates the cipherDocs and cipherPasskeyTypes signals for a cipher that matched a passkey service.
 */
export function updateCipherMatchSignals(
  cipherId: string,
  match: PasskeyServiceEntry,
  cipherDocs: WritableSignal<Map<string, string>>,
  cipherPasskeyTypes: WritableSignal<Map<string, PasskeyTypeInfo>>,
): void {
  cipherDocs.update((docs) => {
    const updated = new Map(docs);
    updated.set(cipherId, match.instructions);
    return updated;
  });
  cipherPasskeyTypes.update((types) => {
    const updated = new Map(types);
    updated.set(cipherId, {
      supportsPasskeyLogin: match.supportsPasskeyLogin,
      supportsPasskeyMfa: match.supportsPasskeyMfa,
    });
    return updated;
  });
}
