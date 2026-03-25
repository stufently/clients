export const AUTOTYPE_IPC_CHANNELS = {
  INIT: "autofill.initAutotype",
  INITIALIZED: "autofill.autotypeIsInitialized",
  TOGGLE: "autofill.toggleAutotype",
  CONFIGURE: "autofill.configureAutotype",
  LISTEN: "autofill.listenAutotypeRequest",
  EXECUTION_ERROR: "autofill.autotypeExecutionError",
  EXECUTE: "autofill.executeAutotype",
} as const;

export const MAGNIFY_IPC_CHANNELS = {
  TOGGLE: "autofill.toggleMagnify",
  /** Magnify renderer → Main process (invoke/handle) */
  COMMAND: "autofill.magnifyCommand",
  /** Main process → Bitwarden renderer (send) */
  COMMAND_REQUEST: "autofill.magnifyCommandRequest",
  /** Bitwarden renderer → Main process (send, with correlationId suffix) */
  COMMAND_RESPONSE: "autofill.magnifyCommandResponse",
} as const;
