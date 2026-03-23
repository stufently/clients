import { map } from "rxjs";

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
  private readonly allowIntegrateWithWebAppState = this.stateProvider.getActive(
    ALLOW_INTEGRATE_WITH_WEB_APP,
  );
  readonly allowIntegrateWithWebApp$ = this.allowIntegrateWithWebAppState.state$.pipe(
    map(Boolean),
  );

  private readonly allowIntegrateWithDesktopAppState = this.stateProvider.getActive(
    ALLOW_INTEGRATE_WITH_DESKTOP_APP,
  );
  readonly allowIntegrateWithDesktopApp$ = this.allowIntegrateWithDesktopAppState.state$.pipe(
    map(Boolean),
  );

  private readonly allowIntegrateWithBrowserExtensionState = this.stateProvider.getActive(
    ALLOW_INTEGRATE_WITH_BROWSER_EXTENSION,
  );
  readonly allowIntegrateWithBrowserExtension$ =
    this.allowIntegrateWithBrowserExtensionState.state$.pipe(map(Boolean));

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
}
