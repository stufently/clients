import { CipherType } from "@bitwarden/common/vault/enums";

/**
 * Supported Magnify commands. Uses const object pattern per ADR-0025 (no enums).
 */
export const MagnifyCommand = Object.freeze({
  VaultSearch: "vaultSearch",
  CopyVaultItemField: "copyVaultItemField",
} as const);
export type MagnifyCommand = (typeof MagnifyCommand)[keyof typeof MagnifyCommand];

/**
 * Fields that can be copied from a vault item via the CopyVaultItemField command.
 * CRITICAL: The resolved field value is copied to clipboard inside the Bitwarden
 * renderer — decrypted values never cross IPC to the Magnify window.
 */
export const VaultItemField = Object.freeze({
  Password: "password",
  Username: "username",
  Totp: "totp",
  CardNumber: "cardNumber",
  CardCode: "cardCode",
} as const);
export type VaultItemField = (typeof VaultItemField)[keyof typeof VaultItemField];

/**
 * A slim, display-only representation of a vault item for the Magnify UI.
 * CRITICAL: Never include decrypted passwords, notes, or encryption keys.
 */
export type MagnifyVaultItemResult = {
  id: string;
  name: string;
  username?: string;
  uri?: string;
};

/**
 * Input payload for the VaultSearch command.
 */
export type VaultSearchInput = {
  query: string;
  cipherTypes?: CipherType[];
};

/**
 * Input payload for the CopyVaultItemField command.
 */
export type CopyVaultItemFieldInput = {
  vaultItemId: string;
  field: VaultItemField;
};

export type MagnifyCommandInput = VaultSearchInput | CopyVaultItemFieldInput;

/**
 * External request sent from the Magnify preload (no correlationId — that's added by the relay).
 */
export type MagnifyExternalRequest = {
  command: MagnifyCommand;
  input: MagnifyCommandInput;
};

/**
 * Internal request forwarded from Main process to the Bitwarden renderer.
 * Includes a correlationId for matching responses.
 */
export type MagnifyRequest = {
  command: MagnifyCommand;
  input: MagnifyCommandInput;
  correlationId: string;
};

/**
 * Response sent from the Bitwarden renderer back through the Main process to Magnify.
 */
export type MagnifyResponse = {
  command: MagnifyCommand;
  correlationId: string;
  results: MagnifyVaultItemResult[];
  error?: string;
};
