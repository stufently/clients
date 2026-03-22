import { LockService } from "@bitwarden/auth/common";
import { SharedUnlockFollower } from "@bitwarden/sdk-internal";
import { KeyService } from "@bitwarden/key-management";
import { firstValueFrom } from "rxjs";

import { AccountService } from "../../auth/abstractions/account.service";
import { asUuid } from "../../platform/abstractions/sdk/sdk.service";
import { IpcService } from "../../platform/ipc";
import { SymmetricCryptoKey } from "../../platform/models/domain/symmetric-crypto-key";
import { SharedUnlockFollowerService } from "./shared-unlock-follower.service";
import { createUnlockManagementDriver } from "./unlock-management-driver";
import { PlatformUtilsService } from "@bitwarden/common/platform/abstractions/platform-utils.service";

export class DefaultSharedUnlockFollowerService implements SharedUnlockFollowerService {
  constructor(
    private ipcService: IpcService,
    private accountService: AccountService,
    private lockService: LockService,
    private keyService: KeyService,
    private platformUtilsService: PlatformUtilsService,
  ) {}

  async start(): Promise<void> {
    const unlockManagementDriver = createUnlockManagementDriver(
      this.accountService,
      this.lockService,
      this.keyService,
      this.platformUtilsService,
    );

    const follower = await SharedUnlockFollower.try_new(this.ipcService.client, unlockManagementDriver);
    follower.start();

    this.lockService.registerOnLockAction(async (userId) => {
      await follower.handle_device_event(
        {
          ManualLock: {
            user_id: asUuid(userId),
          },
        },
      );
    });

    let previousUserKey: SymmetricCryptoKey | null = null;

    // This is a temporary solution until unlock-service is used for all unlock flows.
    // At that point, this should be replaced with a hook into unlock service, that
    // is similar to the hook on lock service
    setInterval(async () => {
      await firstValueFrom(this.accountService.accounts$);
      const activeAccount = await firstValueFrom(this.accountService.activeAccount$);
      if (activeAccount == null) {
        return;
      }

      const activeUserId = activeAccount.id;
      const activeUserKey = await this.keyService.getUserKey(activeUserId);
      if (previousUserKey == null && activeUserKey != null) {
        await follower.handle_device_event(
          {
            ManualUnlock: {
              user_id: asUuid(activeUserId),
              user_key: Array.from(new Uint8Array(activeUserKey.toEncoded().buffer.slice(0))),
            },
          },
        );
      }

      previousUserKey = activeUserKey;
    }, 1_000);
  }
}
