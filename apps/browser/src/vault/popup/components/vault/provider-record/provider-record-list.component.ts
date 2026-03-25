import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { Router } from "@angular/router";
import { filter, map, Observable, switchMap } from "rxjs";

import { JslibModule } from "@bitwarden/angular/jslib.module";
import { AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { UserId } from "@bitwarden/common/types/guid";
import { CipherService } from "@bitwarden/common/vault/abstractions/cipher.service";
import { CipherView } from "@bitwarden/common/vault/models/view/cipher.view";
import { ButtonModule, IconButtonModule, ItemModule, NoItemsModule } from "@bitwarden/components";

import { PopOutComponent } from "../../../../../platform/popup/components/pop-out.component";
import { PopupHeaderComponent } from "../../../../../platform/popup/layout/popup-header.component";
import { PopupPageComponent } from "../../../../../platform/popup/layout/popup-page.component";

import { PROVIDER_RECORD_MARKER } from "./provider-record-add-edit.component";

// FIXME(https://bitwarden.atlassian.net/browse/CL-764): Migrate to OnPush
// eslint-disable-next-line @angular-eslint/prefer-on-push-component-change-detection
@Component({
  templateUrl: "./provider-record-list.component.html",
  imports: [
    CommonModule,
    JslibModule,
    PopupPageComponent,
    PopupHeaderComponent,
    PopOutComponent,
    ItemModule,
    NoItemsModule,
    ButtonModule,
    IconButtonModule,
  ],
})
export class ProviderRecordListComponent {
  protected providerRecords$: Observable<CipherView[]>;

  constructor(
    private cipherService: CipherService,
    private accountService: AccountService,
    private router: Router,
  ) {
    this.providerRecords$ = this.accountService.activeAccount$.pipe(
      map((a) => a?.id),
      filter((userId): userId is UserId => userId != null),
      switchMap((userId) => this.cipherService.cipherViews$(userId)),
      map((ciphers) =>
        ciphers.filter((c) =>
          c.fields?.some((f) => f.name === PROVIDER_RECORD_MARKER && f.value === "true"),
        ),
      ),
    );
  }

  protected navigateToAdd() {
    void this.router.navigate(["/provider-record-add-edit"]);
  }

  protected navigateToEdit(cipher: CipherView) {
    void this.router.navigate(["/provider-record-add-edit"], {
      queryParams: { cipherId: cipher.id },
    });
  }

  protected getSiteName(cipher: CipherView): string {
    return cipher.fields?.find((f) => f.name === "siteName")?.value ?? "";
  }
}
