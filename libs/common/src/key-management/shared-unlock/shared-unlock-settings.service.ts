import { Observable } from "rxjs";

import { UserId } from "@bitwarden/common/types/guid";

export abstract class SharedUnlockSettingsService {
  abstract readonly allowIntegrateWithWebApp$: Observable<boolean>;
  abstract readonly allowIntegrateWithDesktopApp$: Observable<boolean>;
  abstract readonly allowIntegrateWithBrowserExtension$: Observable<boolean>;

  abstract setAllowIntegrateWithWebApp(value: boolean, userId: UserId): Promise<void>;
  abstract setAllowIntegrateWithDesktopApp(value: boolean, userId: UserId): Promise<void>;
  abstract setAllowIntegrateWithBrowserExtension(value: boolean, userId: UserId): Promise<void>;
}
