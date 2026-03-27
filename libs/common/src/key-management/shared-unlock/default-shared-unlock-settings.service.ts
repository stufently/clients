import { firstValueFrom, map, Observable } from "rxjs";

import {
  SHARED_UNLOCK_SETTINGS_DISK,
  StateProvider,
  UserKeyDefinition,
} from "@bitwarden/common/platform/state";
import { UserId } from "@bitwarden/common/types/guid";

import { SharedUnlockSettingsService } from "./shared-unlock-settings.service";

const ALLOW_INTEGRATE_WITH_WEB_APP = new UserKeyDefinition<boolean>(
  SHARED_UNLOCK_SETTINGS_DISK,
  "allowIntegrateWithWebApp",
  {
    deserializer: (b) => b,
    clearOn: ["logout"],
  },
);

const ALLOW_INTEGRATE_WITH_DESKTOP_APP = new UserKeyDefinition<boolean>(
  SHARED_UNLOCK_SETTINGS_DISK,
  "allowIntegrateWithDesktopApp",
  {
    deserializer: (b) => b,
    clearOn: ["logout"],
  },
);

const ALLOW_INTEGRATE_WITH_BROWSER_EXTENSION = new UserKeyDefinition<boolean>(
  SHARED_UNLOCK_SETTINGS_DISK,
  "allowIntegrateWithBrowserExtension",
  {
    deserializer: (b) => b,
    clearOn: ["logout"],
  },
);

export class DefaultSharedUnlockSettingsService extends SharedUnlockSettingsService {
  constructor(private stateProvider: StateProvider) {
    super();
  }

  async setAllowIntegrateWithWebApp(value: boolean, userId: UserId) {
    await this.stateProvider.getUser(userId, ALLOW_INTEGRATE_WITH_WEB_APP).update(() => value);
  }

  async setAllowIntegrateWithDesktopApp(value: boolean, userId: UserId) {
    await this.stateProvider.getUser(userId, ALLOW_INTEGRATE_WITH_DESKTOP_APP).update(() => value);
  }

  async setAllowIntegrateWithBrowserExtension(value: boolean, userId: UserId) {
    await this.stateProvider
      .getUser(userId, ALLOW_INTEGRATE_WITH_BROWSER_EXTENSION)
      .update(() => value);
  }

  allowIntegrateWithWebApp$(userId: UserId): Observable<boolean> {
    return this.stateProvider.getUserState$(ALLOW_INTEGRATE_WITH_WEB_APP, userId).pipe(
      map((v) => v ?? false),
    );
  }
  
  allowIntegrateWithDesktopApp$(userId: UserId): Observable<boolean> {
    return this.stateProvider.getUserState$(ALLOW_INTEGRATE_WITH_DESKTOP_APP, userId).pipe(
      map((v) => v ?? false),
    );
  }
  
  allowIntegrateWithBrowserExtension$(userId: UserId): Observable<boolean> {
    return this.stateProvider
      .getUserState$(ALLOW_INTEGRATE_WITH_BROWSER_EXTENSION, userId)
      .pipe(map((v) => v ?? false));
  }

  async allowIntegrateWithWebApp(userId: UserId): Promise<boolean> {
    return (await firstValueFrom(this.stateProvider.getUserState$(ALLOW_INTEGRATE_WITH_WEB_APP, userId))) ?? false;
  }

  async allowIntegrateWithDesktopApp(userId: UserId): Promise<boolean> {
    return (
      (await firstValueFrom(this.stateProvider.getUserState$(ALLOW_INTEGRATE_WITH_DESKTOP_APP, userId))) ?? false
    );
  }

  async allowIntegrateWithBrowserExtension(userId: UserId): Promise<boolean> {
    return (
      (await firstValueFrom(
        this.stateProvider.getUserState$(ALLOW_INTEGRATE_WITH_BROWSER_EXTENSION, userId),
      )) ?? false
    );
  }
}
