import { Observable } from "rxjs";

import { UserId } from "@bitwarden/common/types/guid";

export abstract class SharedUnlockSettingsService {
  abstract allowIntegrateWithWebApp$(userId: UserId): Observable<boolean>;
  abstract allowIntegrateWithDesktopApp$(userId: UserId): Observable<boolean>;
  abstract allowIntegrateWithBrowserExtension$(userId: UserId): Observable<boolean>;

  abstract setAllowIntegrateWithWebApp(value: boolean, userId: UserId): Promise<void>;
  abstract setAllowIntegrateWithDesktopApp(value: boolean, userId: UserId): Promise<void>;
  abstract setAllowIntegrateWithBrowserExtension(value: boolean, userId: UserId): Promise<void>;

  abstract allowIntegrateWithWebApp(userId: UserId): Promise<boolean>;
  abstract allowIntegrateWithDesktopApp(userId: UserId): Promise<boolean>;
  abstract allowIntegrateWithBrowserExtension(userId: UserId): Promise<boolean>;
}
