import { Injectable, NgZone, OnDestroy } from "@angular/core";
import { Router } from "@angular/router";

@Injectable({
  providedIn: "root",
})
export class QuickSearchService implements OnDestroy {
  constructor(
    private router: Router,
    private ngZone: NgZone,
  ) {}

  init() {
    ipc.vault.onQuickSearchOpen(() => {
      this.ngZone.run(() => {
        void this.router.navigate(["/quick-search"]);
      });
    });
  }

  ngOnDestroy() {
    // ipcRenderer listeners attached via `ipc.vault.onQuickSearchOpen` live for the
    // lifetime of the renderer process, so no explicit cleanup is needed here.
  }
}
