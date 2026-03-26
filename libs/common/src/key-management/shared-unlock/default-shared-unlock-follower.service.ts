import { firstValueFrom } from "rxjs";

import { LockService } from "@bitwarden/auth/common";
import { PlatformUtilsService } from "@bitwarden/common/platform/abstractions/platform-utils.service";
import { KeyService } from "@bitwarden/key-management";
import { SharedUnlockFollower } from "@bitwarden/sdk-internal";

import { AccountService } from "../../auth/abstractions/account.service";
import { asUuid } from "../../platform/abstractions/sdk/sdk.service";
import { IpcService } from "../../platform/ipc";
import { SymmetricCryptoKey } from "../../platform/models/domain/symmetric-crypto-key";
import { UserId } from "../../types/guid";
import { VaultTimeoutSettingsService } from "../vault-timeout/abstractions/vault-timeout-settings.service";

import { SharedUnlockFollowerService } from "./shared-unlock-follower.service";
import { createUserLockManagement } from "./user-lock-management";

export class DefaultSharedUnlockFollowerService implements SharedUnlockFollowerService {
  constructor(
    private ipcService: IpcService,
    private accountService: AccountService,
    private lockService: LockService,
    private keyService: KeyService,
    private platformUtilsService: PlatformUtilsService,
    private vaultTimeoutSettingsService: VaultTimeoutSettingsService,
  ) {}

  async start(): Promise<void> {
    const unlockManagementDriver = createUserLockManagement(
      this.accountService,
      this.lockService,
      this.keyService,
      this.platformUtilsService,
      this.vaultTimeoutSettingsService,
    );

    const follower = await SharedUnlockFollower.try_new(
      this.ipcService.client,
      unlockManagementDriver,
    );
    follower.start();

    this.lockService.registerOnLockAction(async (userId) => {
      await follower.handle_device_event({
        ManualLock: {
          user_id: asUuid(userId),
        },
      });
    });

    const previousUserKeys = new Map<UserId, SymmetricCryptoKey | null>();

    // This is a temporary solution until unlock-service is used for all unlock flows.
    // At that point, this should be replaced with a hook into unlock service, that
    // is similar to the hook on lock service
    setInterval(async () => {
      const accounts = await firstValueFrom(this.accountService.accounts$);
      const accountIds = Object.keys(accounts) as UserId[];

      for (const accountId of accountIds) {
        const accountUserKey = await this.keyService.getUserKey(accountId);
        const previousUserKey = previousUserKeys.get(accountId) ?? null;

        if (previousUserKey == null && accountUserKey != null) {
          await follower.handle_device_event({
            ManualUnlock: {
              user_id: asUuid(accountId),
              user_key: Array.from(new Uint8Array(accountUserKey.toEncoded().buffer.slice(0))),
            },
          });
        }

        previousUserKeys.set(accountId, accountUserKey);
      }

      for (const trackedUserId of previousUserKeys.keys()) {
        if (!accountIds.includes(trackedUserId)) {
          previousUserKeys.delete(trackedUserId);
        }
      }
    }, 100);
  }
}
