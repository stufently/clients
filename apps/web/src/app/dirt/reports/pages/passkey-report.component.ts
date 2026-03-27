import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { BehaviorSubject, firstValueFrom, lastValueFrom, switchMap } from "rxjs";

import { OrganizationService } from "@bitwarden/common/admin-console/abstractions/organization/organization.service.abstraction";
import { Organization } from "@bitwarden/common/admin-console/models/domain/organization";
import { AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { getUserId } from "@bitwarden/common/auth/services/account.service";
import { PasskeyDirectoryApiServiceAbstraction } from "@bitwarden/common/dirt/services/abstractions/passkey-directory-api.service.abstraction";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { LogService } from "@bitwarden/common/platform/abstractions/log.service";
import { CipherId, CollectionId, OrganizationId } from "@bitwarden/common/types/guid";
import { CipherService } from "@bitwarden/common/vault/abstractions/cipher.service";
import { SyncService } from "@bitwarden/common/vault/abstractions/sync/sync.service.abstraction";
import { CipherRepromptType } from "@bitwarden/common/vault/enums/cipher-reprompt-type";
import { CipherView } from "@bitwarden/common/vault/models/view/cipher.view";
import { DialogService, TableDataSource } from "@bitwarden/components";
import {
  CipherFormConfig,
  CipherFormConfigService,
  PasswordRepromptService,
} from "@bitwarden/vault";

import {
  VaultItemDialogComponent,
  VaultItemDialogMode,
  VaultItemDialogResult,
} from "../../../vault/components/vault-item-dialog/vault-item-dialog.component";

import {
  PasskeyServiceEntry,
  PasskeyTypeInfo,
  getPasskeyServiceMatch,
  processPasskeyCiphers,
  updateCipherMatchSignals,
} from "./passkey-report.utils";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "app-passkey-report",
  templateUrl: "passkey-report.component.html",
  standalone: false,
})
export class PasskeyReportComponent {
  // Injected dependencies
  private readonly accountService = inject(AccountService);
  private readonly cipherService = inject(CipherService);
  private readonly cipherFormConfigService = inject(CipherFormConfigService);
  private readonly dialogService = inject(DialogService);
  private readonly i18nService = inject(I18nService);
  private readonly logService = inject(LogService);
  private readonly organizationService = inject(OrganizationService);
  private readonly passkeyDirectoryApiService = inject(PasskeyDirectoryApiServiceAbstraction);
  private readonly passwordRepromptService = inject(PasswordRepromptService);
  private readonly syncService = inject(SyncService);

  // Reactive state
  protected readonly loading = signal(false);
  protected readonly hasLoaded = signal(false);
  protected readonly ciphers = signal<CipherView[]>([]);
  protected readonly allCiphers = signal<CipherView[]>([]);
  protected readonly cipherDocs = signal<Map<string, string>>(new Map());
  protected readonly dataSource = new TableDataSource<CipherView>();

  // Filter state
  protected readonly filterStatus = signal<(number | string)[]>([0]);
  protected readonly showFilterToggle = signal(false);
  protected readonly vaultMsg = signal("vault");
  protected readonly chipSelectOptions = signal<{ label: string; value: string }[]>([]);
  protected readonly selectedFilterChip = "0";
  protected readonly filterOrgStatus$ = new BehaviorSubject<number | string>(0);
  private readonly maxItemsToSwitchToChipSelect = 5;

  // Organization state
  private readonly organizations = signal<Organization[]>([]);
  protected readonly organizations$ = this.accountService.activeAccount$.pipe(
    getUserId,
    switchMap((userId) => this.organizationService.organizations$(userId)),
  );

  // Passkey type info exposed to template
  protected readonly cipherPasskeyTypes = signal<Map<string, PasskeyTypeInfo>>(new Map());

  // Private state
  private readonly passkeyServices = signal<Map<string, PasskeyServiceEntry>>(new Map());
  private readonly userId$ = this.accountService.activeAccount$.pipe(getUserId);
  private readonly currentFilterStatus = signal<number | string>(0);

  constructor() {
    this.organizations$
      .pipe(takeUntilDestroyed())
      .subscribe((orgs) => this.organizations.set(orgs));

    void this.init();
  }

  async setCiphers() {
    try {
      if (this.passkeyServices().size === 0) {
        const userId = await firstValueFrom(this.userId$);
        const entries = await this.passkeyDirectoryApiService.getPasskeyDirectory(userId);
        this.passkeyServices.set(
          entries
            .filter((x) => x.domainName != null)
            .reduce(
              (map, entry) => map.set(entry.domainName, entry),
              new Map<string, PasskeyServiceEntry>(),
            ),
        );
      }
    } catch (e) {
      this.logService.error("[PasskeyReportComponent] Failed to load passkeys", e);
    }

    if (this.passkeyServices().size === 0) {
      return;
    }

    const allCiphers = await this.getAllCiphers();
    const result = processPasskeyCiphers(allCiphers, this.passkeyServices());

    this.filterStatus.set([0]);
    this.filterCiphersByOrg(result.ciphers);
    this.cipherDocs.set(result.docs);
    this.cipherPasskeyTypes.set(result.passkeyTypes);
  }

  async determinedUpdatedCipherReportStatus(
    result: VaultItemDialogResult,
    updatedCipherView: CipherView,
  ): Promise<CipherView | null> {
    if (result === VaultItemDialogResult.Deleted) {
      return null;
    }

    const match = getPasskeyServiceMatch(updatedCipherView, this.passkeyServices());

    if (match != null) {
      updateCipherMatchSignals(
        updatedCipherView.id,
        match,
        this.cipherDocs,
        this.cipherPasskeyTypes,
      );
      return updatedCipherView;
    }

    return null;
  }

  protected async selectCipher(cipher: CipherView) {
    if (
      cipher.reprompt !== CipherRepromptType.None &&
      !(await this.passwordRepromptService.showPasswordPrompt())
    ) {
      return;
    }

    const formConfig = await this.cipherFormConfigService.buildConfig(
      "edit",
      cipher.id as CipherId,
      cipher.type,
    );

    await this.openVaultItemDialog("view", formConfig, cipher);
  }

  protected canManageCipher(_: CipherView): boolean {
    return true;
  }

  protected canDisplayToggleGroup(): boolean {
    return this.filterStatus().length <= this.maxItemsToSwitchToChipSelect;
  }

  protected getName(filterId: string | number): string {
    if (filterId === 0) {
      return this.i18nService.t("all");
    }
    if (filterId === 1) {
      return this.i18nService.t("me");
    }
    return this.organizations().find((org) => org.id === filterId)?.name ?? "";
  }

  protected getCount(filterId: string | number): number {
    if (filterId === 0) {
      return this.allCiphers().length;
    }
    if (filterId === 1) {
      return this.allCiphers().filter((c) => !c.organizationId).length;
    }
    return this.allCiphers().filter((c) => c.organizationId === filterId).length;
  }

  protected async filterOrgToggle(status: number | string) {
    this.currentFilterStatus.set(status);
    if (typeof status === "number" && status === 1) {
      this.dataSource.filter = (c: CipherView) => !c.organizationId;
    } else if (typeof status === "string") {
      const orgId = status as OrganizationId;
      this.dataSource.filter = (c: CipherView) => c.organizationId === orgId;
    } else {
      this.dataSource.filter = () => true;
    }
  }

  protected async filterOrgToggleChipSelect(filterId: string | null) {
    await this.filterOrgToggle(filterId ?? 0);
  }

  private async init() {
    this.loading.set(true);
    await this.syncService.fullSync(false);

    if (this.currentFilterStatus()) {
      if (this.ciphers().length > 2) {
        this.filterOrgStatus$.next(this.currentFilterStatus());
        await this.filterOrgToggle(this.currentFilterStatus());
      } else {
        this.filterOrgStatus$.next(0);
        await this.filterOrgToggle(0);
      }
    } else {
      await this.setCiphers();
    }

    this.loading.set(false);
    this.hasLoaded.set(true);
  }

  private async getAllCiphers(): Promise<CipherView[]> {
    const activeUserId = await firstValueFrom(this.userId$);
    return await this.cipherService.getAllDecrypted(activeUserId);
  }

  private async openVaultItemDialog(
    mode: VaultItemDialogMode,
    formConfig: CipherFormConfig,
    cipher: CipherView,
    activeCollectionId?: CollectionId,
  ) {
    const dialogRef = VaultItemDialogComponent.open(this.dialogService, {
      mode,
      formConfig,
      activeCollectionId,
      isAdminConsoleAction: false,
    });

    const result = await lastValueFrom(dialogRef.closed);

    if (result === VaultItemDialogResult.PremiumUpgrade) {
      return;
    }

    if (result === VaultItemDialogResult.Deleted || result === VaultItemDialogResult.Saved) {
      await this.refresh(result, cipher);
    }
  }

  private async refresh(result: VaultItemDialogResult, cipher: CipherView) {
    if (result === VaultItemDialogResult.Deleted) {
      await this.determinedUpdatedCipherReportStatus(result, cipher);
      this.ciphers.update((current) => current.filter((c) => c.id !== cipher.id));
      this.filterCiphersByOrg(this.ciphers());
      return;
    }

    if (result === VaultItemDialogResult.Saved) {
      const activeUserId = await firstValueFrom(this.userId$);
      const updatedCipher = await this.cipherService.get(cipher.id, activeUserId);

      const updatedCipherView = await updatedCipher.decrypt(
        await this.cipherService.getKeyForCipherKeyDecryption(updatedCipher, activeUserId),
      );

      const updatedReportResult = await this.determinedUpdatedCipherReportStatus(
        result,
        updatedCipherView,
      );

      const currentCiphers = [...this.ciphers()];
      const index = currentCiphers.findIndex((c) => c.id === updatedCipherView.id);

      if (updatedReportResult === null && index > -1) {
        currentCiphers.splice(index, 1);
      }

      if (updatedReportResult !== null && index > -1) {
        currentCiphers[index] = updatedReportResult;
      }

      this.filterCiphersByOrg(currentCiphers);
    }
  }

  private filterCiphersByOrg(ciphersList: CipherView[]) {
    const statuses: (number | string)[] = [0];

    for (const cipher of ciphersList) {
      if (cipher.organizationId != null && !statuses.includes(cipher.organizationId)) {
        statuses.push(cipher.organizationId);
      } else if (cipher.organizationId == null && !statuses.includes(1)) {
        statuses.splice(1, 0, 1);
      }
    }

    this.ciphers.set(ciphersList);
    this.allCiphers.set([...ciphersList]);
    this.dataSource.data = ciphersList;
    this.filterStatus.set(statuses);

    if (statuses.length > 2) {
      this.showFilterToggle.set(true);
      this.vaultMsg.set("vaults");
    } else {
      this.showFilterToggle.set(false);
      this.vaultMsg.set("vault");
    }

    this.chipSelectOptions.set(this.setupChipSelectOptions(statuses));
  }

  private setupChipSelectOptions(filters: (number | string)[]): { label: string; value: string }[] {
    return filters.map((filterId) => {
      const name = this.getName(filterId);
      const count = this.getCount(filterId);
      const labelSuffix = count != null ? ` (${count})` : "";

      return {
        label: name + labelSuffix,
        value: String(filterId),
      };
    });
  }
}
