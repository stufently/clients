import { LockService } from "@bitwarden/auth/common";
import { SharedUnlockLeader } from "@bitwarden/sdk-internal";
import { KeyService } from "@bitwarden/key-management";

import { AccountService } from "../../auth/abstractions/account.service";
import { IpcService } from "../../platform/ipc";
import { SharedUnlockLeaderService } from "./shared-unlock-leader.service";
import { createUnlockManagementDriver } from "./unlock-management-driver";

export class DefaultSharedUnlockLeaderService implements SharedUnlockLeaderService {
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

    const leader = await SharedUnlockLeader.try_new(this.ipcService.client, unlockManagementDriver);
    leader.start();
    this.lockService.registerOnLockAction(async (userId) => {
      await leader.handle_device_event(
        {
          ManualLock: {
            user_id: asUuid(userId),
          },
        },
        this.ipcService.client,
      );
    });
  }
}
