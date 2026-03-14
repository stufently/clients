import { LockService } from "@bitwarden/auth/common";import { AuthService } from "../auth/abstractions/auth.service";import { IpcService } from "../platform/ipc";
import { SharedUnlockFollower,
SharedUnlockLeader,UserId } from "@bitwarden/sdk-internal";
import { KeyService } from "@bitwarden/key-management";
import { asUuid,
uuidAsString } from "../platform/abstractions/sdk/sdk.service";
import { UserId as TSUserId } from "@bitwarden/common/types/guid";
import { SymmetricCryptoKey } from "../platform/models/domain/symmetric-crypto-key";
import { UserKey } from "../types/key";
import { firstValueFrom } from "rxjs";
import { AccountService } from "../auth/abstractions/account.service";

export async function setup_shared_unlock_leader(ipcService: IpcService, accountService: AccountService, lockService: LockService, keyService: KeyService) {
    let unlock = {
      async lock_user(user_id: UserId): Promise<void> {
        await lockService.lock(uuidAsString(user_id) as TSUserId);
      },
      async unlock_user(user_id: UserId, key: number[]): Promise<void> {
        console.log("leader unlocking user", user_id);
        const key0 = new Uint8Array(key);
        const key1 = new SymmetricCryptoKey(key0);
        await keyService.setUserKey(key1 as UserKey, uuidAsString(user_id) as TSUserId);
      },
      async get_user_key(user_id: UserId): Promise<string> {
        return (await keyService.getUserKey(uuidAsString(user_id) as TSUserId)).toBase64();
      },
      async list_users(): Promise<string[]> {
        const accounts = await firstValueFrom(accountService.accounts$);
        return Object.keys(accounts);
      }
    };
    const leader = await SharedUnlockLeader.try_new(ipcService.client, unlock);
    console.log("shared unlock leader initialized");
    leader.start();
}

export async function setup_shared_unlock_follower(ipcService: IpcService, accountService: AccountService, lockService: LockService, keyService: KeyService) {
    let unlock = {
      async lock_user(user_id: UserId): Promise<void> {
        await lockService.lock(uuidAsString(user_id) as TSUserId);
      },
      async unlock_user(user_id: UserId, key: number[]): Promise<void> {
        await keyService.setUserKey(new SymmetricCryptoKey(new Uint8Array(key)) as UserKey, uuidAsString(user_id) as TSUserId);
      },
      async get_user_key(user_id: UserId): Promise<string> {
        return (await firstValueFrom(keyService.userKey$(uuidAsString(user_id) as TSUserId))).toBase64();
      },
      async list_users(): Promise<string[]> {
        const accounts = await firstValueFrom(accountService.accounts$);
        return Object.keys(accounts);
      }
    };
    const follower = await SharedUnlockFollower.try_new(ipcService.client, unlock);
    console.log("shared unlock follower initialized");
    follower.start();
    setInterval(async () => {
        console.log("follower sending timer event");
        await follower.handle_device_event("Timer", ipcService.client);
    }, 10_000);

    lockService.registerOnLockAction(async (userId) => {
        console.log("leader locking, sending lock event to follower");
        await follower.handle_device_event({
          ManualLock: {
            user_id: asUuid(userId)
          }
        }, ipcService.client);
    });

    const previousUserKey: SymmetricCryptoKey | null = null;
    setInterval(async () => {
        const accounts = await firstValueFrom(accountService.accounts$);
        const activeAccount = await firstValueFrom(accountService.activeAccount$);
        if (activeAccount == null) {
          return;
        }
        const activeUserId = activeAccount.id;
        const activeUserKey = await keyService.getUserKey(activeUserId);
        console.log("previousUserKey", previousUserKey, "activeUserKey", activeUserKey);
        if (previousUserKey == null || activeUserKey != null) {
          console.log("user key changed, sending unlock event to follower");
          await follower.handle_device_event({
            ManualUnlock: {
              user_id: asUuid(activeUserId),
              user_key: Array.from(new Uint8Array(activeUserKey!.toEncoded().buffer.slice(0)))
            }
          }, ipcService.client);
        }
    }, 10_000);
}