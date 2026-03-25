/**
 * Supported Magnify commands. Uses const object pattern per ADR-0025 (no enums).
 */
export const MagnifyCommand = Object.freeze({
  CipherSearch: "cipherSearch",
  CipherPasswordCopy: "cipherPasswordCopy",
} as const);
export type MagnifyCommand = (typeof MagnifyCommand)[keyof typeof MagnifyCommand];

/**
 * A slim, display-only representation of a cipher for the Magnify UI.
 * CRITICAL: Never include decrypted passwords, notes, or encryption keys.
 */
export type MagnifyCipherResult = {
  id: string;
  name: string;
  username?: string;
  uri?: string;
};

/**
 * External request sent from the Magnify preload (no correlationId — that's added by the relay).
 */
export type MagnifyExternalRequest = {
  command: MagnifyCommand;
  input: string;
};

/**
 * Internal request forwarded from Main process to the Bitwarden renderer.
 * Includes a correlationId for matching responses.
 */
export type MagnifyRequest = {
  command: MagnifyCommand;
  input: string;
  correlationId: string;
};

/**
 * Response sent from the Bitwarden renderer back through the Main process to Magnify.
 */
export type MagnifyResponse = {
  command: MagnifyCommand;
  correlationId: string;
  results: MagnifyCipherResult[];
  error?: string;
};
