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

export class DefaultSharedUnlockFollowerService implements SharedUnlockFollowerService {
  constructor(
    private ipcService: IpcService,
    private accountService: AccountService,
    private lockService: LockService,
    private keyService: KeyService,
  ) {}

  async start(): Promise<void> {
    const unlockManagementDriver = createUnlockManagementDriver(
      this.accountService,
      this.lockService,
      this.keyService,
    );

    const follower = await SharedUnlockFollower.try_new(this.ipcService.client, unlockManagementDriver);
    follower.start();

    setInterval(async () => {
      await follower.handle_device_event("Timer", this.ipcService.client);
    }, 10_000);

    this.lockService.registerOnLockAction(async (userId) => {
      await follower.handle_device_event(
        {
          ManualLock: {
            user_id: asUuid(userId),
          },
        },
        this.ipcService.client,
      );
    });

    const previousUserKey: SymmetricCryptoKey | null = null;
    setInterval(async () => {
      await firstValueFrom(this.accountService.accounts$);
      const activeAccount = await firstValueFrom(this.accountService.activeAccount$);
      if (activeAccount == null) {
        return;
      }

      const activeUserId = activeAccount.id;
      const activeUserKey = await this.keyService.getUserKey(activeUserId);
      if (previousUserKey == null || activeUserKey != null) {
        if (activeUserKey == null) {
          return;
        }

        await follower.handle_device_event(
          {
            ManualUnlock: {
              user_id: asUuid(activeUserId),
              user_key: Array.from(new Uint8Array(activeUserKey.toEncoded().buffer.slice(0))),
            },
          },
          this.ipcService.client,
        );
      }
    }, 10_000);
  }
}
