// FIXME: Update this file to be type safe and remove this and next line
// @ts-strict-ignore
import { Component, OnInit } from "@angular/core";
import { firstValueFrom } from "rxjs";

import { OrganizationService } from "@bitwarden/common/admin-console/abstractions/organization/organization.service.abstraction";
import { AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { getUserId } from "@bitwarden/common/auth/services/account.service";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { uuidAsString } from "@bitwarden/common/platform/abstractions/sdk/sdk.service";
import { CipherRiskService } from "@bitwarden/common/vault/abstractions/cipher-risk.service";
import { CipherService } from "@bitwarden/common/vault/abstractions/cipher.service";
import { SyncService } from "@bitwarden/common/vault/abstractions/sync/sync.service.abstraction";
import { CipherView } from "@bitwarden/common/vault/models/view/cipher.view";
import { DialogService } from "@bitwarden/components";
import { CipherFormConfigService, PasswordRepromptService } from "@bitwarden/vault";
import { VaultItemDialogResult } from "@bitwarden/web-vault/app/vault/components/vault-item-dialog/vault-item-dialog.component";

import { AdminConsoleCipherFormConfigService } from "../../../vault/org-vault/services/admin-console-cipher-form-config.service";

import { CipherReportComponent } from "./cipher-report.component";

// FIXME(https://bitwarden.atlassian.net/browse/CL-764): Migrate to OnPush
// eslint-disable-next-line @angular-eslint/prefer-on-push-component-change-detection
@Component({
  selector: "app-reused-passwords-report",
  templateUrl: "reused-passwords-report.component.html",
  standalone: false,
})
export class ReusedPasswordsReportComponent extends CipherReportComponent implements OnInit {
  ciphersToCheckForReusedPasswords: CipherView[] = [];
  reuseCountMap: Map<string, number> = new Map();
  disabled = true;

  constructor(
    protected cipherService: CipherService,
    protected cipherRiskService: CipherRiskService,
    protected organizationService: OrganizationService,
    dialogService: DialogService,
    accountService: AccountService,
    passwordRepromptService: PasswordRepromptService,
    i18nService: I18nService,
    syncService: SyncService,
    cipherFormConfigService: CipherFormConfigService,
    adminConsoleCipherFormConfigService: AdminConsoleCipherFormConfigService,
  ) {
    super(
      cipherService,
      dialogService,
      passwordRepromptService,
      organizationService,
      accountService,
      i18nService,
      syncService,
      cipherFormConfigService,
      adminConsoleCipherFormConfigService,
    );
  }

  async ngOnInit() {
    await super.load();
  }

  async setCiphers() {
    const allCiphers = await this.getAllCiphers();
    this.ciphersToCheckForReusedPasswords = this.filterCiphersByPermissions(allCiphers);
    this.filterStatus = [0];

    await this.computeReusedPasswords();
  }

  protected canManageCipher(c: CipherView): boolean {
    // this will only ever be false from an organization view
    return true;
  }

  async determinedUpdatedCipherReportStatus(
    result: VaultItemDialogResult,
    updatedCipherView: CipherView,
  ): Promise<CipherView | null> {
    if (result === VaultItemDialogResult.Deleted) {
      this.ciphersToCheckForReusedPasswords = this.ciphersToCheckForReusedPasswords.filter(
        (c) => c.id !== updatedCipherView.id,
      );
      return null;
    }

    // recalculate the reused passwords after an update
    // if a password was changed, it could affect reused counts of other ciphers

    // find the cipher in our list and update it
    const index = this.ciphersToCheckForReusedPasswords.findIndex(
      (c) => c.id === updatedCipherView.id,
    );

    if (index !== -1) {
      this.ciphersToCheckForReusedPasswords[index] = updatedCipherView;
    }

    // Re-check the passwords for reused passwords for all ciphers
    await this.computeReusedPasswords();

    // return the updated cipher view
    return updatedCipherView;
  }

  private async computeReusedPasswords(): Promise<void> {
    const ciphers = this.ciphersToCheckForReusedPasswords;
    const userId = await firstValueFrom(this.accountService.activeAccount$.pipe(getUserId));

    const passwordMap = await this.cipherRiskService.buildPasswordReuseMap(ciphers, userId);
    const results = await this.cipherRiskService.computeRiskForCiphers(ciphers, userId, {
      passwordMap,
    });

    this.reuseCountMap = new Map<string, number>();
    const reusedCipherIds = new Set<string>();

    for (const result of results) {
      if ((result.reuse_count ?? 1) > 1) {
        this.reuseCountMap.set(uuidAsString(result.id), result.reuse_count);
        reusedCipherIds.add(uuidAsString(result.id));
      }
    }

    const reusedPasswordCiphers = ciphers.filter((c) => reusedCipherIds.has(c.id));
    this.filterCiphersByOrg(reusedPasswordCiphers);
  }
}
