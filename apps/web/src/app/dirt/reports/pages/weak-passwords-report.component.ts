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
import { BadgeVariant, DialogService } from "@bitwarden/components";
import { CipherFormConfigService, PasswordRepromptService } from "@bitwarden/vault";
import { VaultItemDialogResult } from "@bitwarden/web-vault/app/vault/components/vault-item-dialog/vault-item-dialog.component";

import { AdminConsoleCipherFormConfigService } from "../../../vault/org-vault/services/admin-console-cipher-form-config.service";

import { CipherReportComponent } from "./cipher-report.component";

type ReportScore = { label: string; badgeVariant: BadgeVariant; sortOrder: number };
type ReportResult = CipherView & { score: number; reportValue: ReportScore; scoreKey: number };

// FIXME(https://bitwarden.atlassian.net/browse/CL-764): Migrate to OnPush
// eslint-disable-next-line @angular-eslint/prefer-on-push-component-change-detection
@Component({
  selector: "app-weak-passwords-report",
  templateUrl: "weak-passwords-report.component.html",
  standalone: false,
})
export class WeakPasswordsReportComponent extends CipherReportComponent implements OnInit {
  disabled = true;

  weakPasswordCiphers: ReportResult[] = [];

  constructor(
    protected cipherService: CipherService,
    protected cipherRiskService: CipherRiskService,
    protected organizationService: OrganizationService,
    dialogService: DialogService,
    protected accountService: AccountService,
    passwordRepromptService: PasswordRepromptService,
    i18nService: I18nService,
    syncService: SyncService,
    cipherFormConfigService: CipherFormConfigService,
    protected adminConsoleCipherFormConfigService: AdminConsoleCipherFormConfigService,
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
    const results = await this.cipherRiskService.computeRiskForCiphers(filteredCiphers, userId);

    this.weakPasswordCiphers = [];
    this.filterStatus = [0];

    const cipherMap = new Map(filteredCiphers.map((c) => [c.id, c]));

    for (const result of results) {
      if (result.password_strength <= 2) {
        const cipher = cipherMap.get(uuidAsString(result.id));
        if (cipher) {
          const scoreValue = this.scoreKey(result.password_strength);
          this.weakPasswordCiphers.push({
            ...cipher,
            score: result.password_strength,
            reportValue: scoreValue,
            scoreKey: scoreValue.sortOrder,
          } as ReportResult);
        }
      }
    }

    this.filterCiphersByOrg(this.weakPasswordCiphers);
  }

  async determinedUpdatedCipherReportStatus(
    result: VaultItemDialogResult,
    updatedCipherView: CipherView,
  ): Promise<CipherView | null> {
    if (result === VaultItemDialogResult.Deleted) {
      this.weakPasswordCiphers = this.weakPasswordCiphers.filter(
        (c) => c.id !== updatedCipherView.id,
      );
      return null;
    }

    const userId = await firstValueFrom(this.accountService.activeAccount$.pipe(getUserId));
    const results = await this.cipherRiskService.computeRiskForCiphers([updatedCipherView], userId);

    const riskResult = results[0];
    let updatedReportStatus: ReportResult | null = null;

    if (riskResult && riskResult.password_strength <= 2) {
      const scoreValue = this.scoreKey(riskResult.password_strength);
      updatedReportStatus = {
        ...updatedCipherView,
        score: riskResult.password_strength,
        reportValue: scoreValue,
        scoreKey: scoreValue.sortOrder,
      } as ReportResult;
    }

    const index = this.weakPasswordCiphers.findIndex((c) => c.id === updatedCipherView.id);

    if (updatedReportStatus) {
      if (index !== -1) {
        this.weakPasswordCiphers[index] = updatedReportStatus;
      } else {
        this.weakPasswordCiphers.push(updatedReportStatus);
        // Newly weak cipher — sync the data source so it appears in the table
        this.filterCiphersByOrg(this.weakPasswordCiphers);
        return updatedReportStatus;
      }
    } else if (index !== -1) {
      this.weakPasswordCiphers.splice(index, 1);
    }

    return updatedReportStatus;
  }

  protected canManageCipher(c: CipherView): boolean {
    // this will only ever be false from the org view;
    return true;
  }

  private scoreKey(score: number): ReportScore {
    switch (score) {
      case 2:
        return { label: "weak", badgeVariant: "warning", sortOrder: 3 };
      default:
        return { label: "veryWeak", badgeVariant: "danger", sortOrder: 4 };
    }
  }
}
