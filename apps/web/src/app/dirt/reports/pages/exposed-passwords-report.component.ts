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

type ReportResult = CipherView & { exposedXTimes: number };

// FIXME(https://bitwarden.atlassian.net/browse/CL-764): Migrate to OnPush
// eslint-disable-next-line @angular-eslint/prefer-on-push-component-change-detection
@Component({
  selector: "app-exposed-passwords-report",
  templateUrl: "exposed-passwords-report.component.html",
  standalone: false,
})
export class ExposedPasswordsReportComponent extends CipherReportComponent implements OnInit {
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
    const filteredCiphers = this.filterCiphersByPermissions(allCiphers);

    const userId = await firstValueFrom(this.accountService.activeAccount$.pipe(getUserId));
    const results = await this.cipherRiskService.computeRiskForCiphers(filteredCiphers, userId, {
      checkExposed: true,
    });

    const exposedPasswordCiphers: ReportResult[] = [];
    const cipherMap = new Map(filteredCiphers.map((c) => [c.id, c]));
    this.filterStatus = [0];

    for (const result of results) {
      if (result.exposed_result.type === "Error") {
        // eslint-disable-next-line no-console
        console.warn(`[ExposedPasswords] Failed to check breach status for cipher ${result.id}`);
        continue;
      }
      if (result.exposed_result.type === "Found" && result.exposed_result.value > 0) {
        const cipher = cipherMap.get(uuidAsString(result.id));
        if (cipher) {
          exposedPasswordCiphers.push({
            ...cipher,
            exposedXTimes: result.exposed_result.value,
          } as ReportResult);
        }
      }
    }

    this.filterCiphersByOrg(exposedPasswordCiphers);
    this.dataSource.sort = { column: "exposedXTimes", direction: "desc" };
  }

  protected canManageCipher(c: CipherView): boolean {
    // this will only ever be false from the org view;
    return true;
  }

  async determinedUpdatedCipherReportStatus(
    result: VaultItemDialogResult,
    updatedCipherView: CipherView,
  ): Promise<CipherView | null> {
    const userId = await firstValueFrom(this.accountService.activeAccount$.pipe(getUserId));
    const results = await this.cipherRiskService.computeRiskForCiphers(
      [updatedCipherView],
      userId,
      { checkExposed: true },
    );

    const riskResult = results[0];
    if (riskResult?.exposed_result.type === "Error") {
      // eslint-disable-next-line no-console
      console.warn(`[ExposedPasswords] Failed to check breach status for cipher ${riskResult.id}`);
    }
    if (riskResult?.exposed_result.type === "Found" && riskResult.exposed_result.value > 0) {
      return {
        ...updatedCipherView,
        exposedXTimes: riskResult.exposed_result.value,
      } as ReportResult;
    }

    return null;
  }
}
