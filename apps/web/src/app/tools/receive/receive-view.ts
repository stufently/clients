import { AuthType } from "@bitwarden/common/tools/send/types/auth-type";

export const ReceiveListState = Object.freeze({
  Empty: "Empty",
  NoResults: "NoResults",
} as const);
export type ReceiveListState = (typeof ReceiveListState)[keyof typeof ReceiveListState];

export interface ReceiveView {
  id: string;
  name: string;
  deletionDate: Date | null;
  disabled: boolean;
  authType: AuthType;
  maxAccessCountReached: boolean;
  expired: boolean;
  pendingDelete: boolean;
  password: string | null;
}
