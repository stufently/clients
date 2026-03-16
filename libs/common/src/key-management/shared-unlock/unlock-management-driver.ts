import { LockService } from "@bitwarden/auth/common";
import { UserId } from "@bitwarden/sdk-internal";
import { KeyService } from "@bitwarden/key-management";
import { UserId as TSUserId } from "@bitwarden/common/types/guid";
import { firstValueFrom } from "rxjs";

import { AccountService } from "../../auth/abstractions/account.service";
import { uuidAsString } from "../../platform/abstractions/sdk/sdk.service";
import { SymmetricCryptoKey } from "../../platform/models/domain/symmetric-crypto-key";
import { UserKey } from "../../types/key";

export type UnlockManagementDriver = {
  lock_user(user_id: UserId): Promise<void>;
  unlock_user(user_id: UserId, key: number[]): Promise<void>;
  get_user_key(user_id: UserId): Promise<string>;
  list_users(): Promise<string[]>;
};

export function createUnlockManagementDriver(
  accountService: AccountService,
  lockService: LockService,
  keyService: KeyService,
): UnlockManagementDriver {
  return {
    async lock_user(user_id: UserId): Promise<void> {
      await lockService.lock(uuidAsString(user_id) as TSUserId);
    },
    async unlock_user(user_id: UserId, key: number[]): Promise<void> {
      await keyService.setUserKey(
        new SymmetricCryptoKey(new Uint8Array(key)) as UserKey,
        uuidAsString(user_id) as TSUserId,
      );
    },
    async get_user_key(user_id: UserId): Promise<string> {
      const typedUserId = uuidAsString(user_id) as TSUserId;
      return (await firstValueFrom(keyService.userKey$(typedUserId))).toBase64();
    },
    async list_users(): Promise<string[]> {
      const accounts = await firstValueFrom(accountService.accounts$);
      return Object.keys(accounts);
    },
  };
}
