import { firstValueFrom } from "rxjs";

import { LockService } from "@bitwarden/auth/common";
import { ClientType } from "@bitwarden/client-type";
import { PlatformUtilsService } from "@bitwarden/common/platform/abstractions/platform-utils.service";
import { UserId as TSUserId } from "@bitwarden/common/types/guid";
import { KeyService } from "@bitwarden/key-management";
import { UserId, UserLockManagement } from "@bitwarden/sdk-internal";

import { AccountService } from "../../auth/abstractions/account.service";
import { EnvironmentService } from "../../platform/abstractions/environment.service";
import { asUuid, uuidAsString } from "../../platform/abstractions/sdk/sdk.service";
import { SymmetricCryptoKey } from "../../platform/models/domain/symmetric-crypto-key";
import { UserKey } from "../../types/key";
import { VaultTimeoutSettingsService } from "../vault-timeout/abstractions/vault-timeout-settings.service";
import { SharedUnlockSettingsService } from "./shared-unlock-settings.service";

export function createUserLockManagement(
  accountService: AccountService,
  lockService: LockService,
  keyService: KeyService,
  platformUtilsService: PlatformUtilsService,
  vaultTimeoutSettingsService: VaultTimeoutSettingsService,
  environmentService: EnvironmentService,
  sharedUnlockSettingsService: SharedUnlockSettingsService,
  isFollower: boolean,
): UserLockManagement {
  return {
    async lock_user(user_id: UserId): Promise<void> {
      if (!(await enabled(sharedUnlockSettingsService, platformUtilsService, isFollower, uuidAsString(user_id) as TSUserId))) {
        return;
      }

      await lockService.lock(uuidAsString(user_id) as TSUserId);
    },
    async unlock_user(user_id: UserId, key: Uint8Array): Promise<void> {
      if (!(await enabled(sharedUnlockSettingsService, platformUtilsService, isFollower, uuidAsString(user_id) as TSUserId))) {
        return;
      }

      await keyService.setUserKey(
        new SymmetricCryptoKey(new Uint8Array(key)) as UserKey,
        uuidAsString(user_id) as TSUserId,
      );
    },
    async get_user_key(user_id: UserId): Promise<string | undefined> {
      const typedUserId = uuidAsString(user_id) as TSUserId;
      return (await firstValueFrom(keyService.userKey$(typedUserId)))?.toBase64();
    },
    async list_users(): Promise<UserId[]> {
      const accounts = await firstValueFrom(accountService.accounts$);
      return Object.keys(accounts).map(asUuid<UserId>);
    },
    async suppress_vault_timeout(until: number): Promise<void> {
      vaultTimeoutSettingsService.suppressVaultTimeout(until);
    },
    async get_client_name(): Promise<ClientType> {
      return platformUtilsService.getClientType();
    },
    async get_vault_url(user_id) {
      const environment = await firstValueFrom(
        environmentService.getEnvironment$(uuidAsString(user_id) as TSUserId),
      );
      return environment.getWebVaultUrl();
    },
  };
}

async function enabled(sharedUnlockSettingsService: SharedUnlockSettingsService, platformUtilsService: PlatformUtilsService, isFollower: boolean, userId: TSUserId): Promise<boolean> {
  if (platformUtilsService.getClientType() === ClientType.Browser) {
    if (isFollower) {
      return await sharedUnlockSettingsService.allowIntegrateWithDesktopApp(userId);
    } else {
      return await sharedUnlockSettingsService.allowIntegrateWithWebApp(userId);
    }
  } else if (platformUtilsService.getClientType() === ClientType.Desktop) {
    if (isFollower) {
      return await sharedUnlockSettingsService.allowIntegrateWithBrowserExtension(userId);
    } else {
      return false;
    }
  } else {
    return true;
  }
}
