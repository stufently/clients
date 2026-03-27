import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import { takeUntilDestroyed, toSignal } from "@angular/core/rxjs-interop";
import { ActivatedRoute } from "@angular/router";
import { concatMap, filter, firstValueFrom, lastValueFrom, shareReplay, switchMap } from "rxjs";

import { JslibModule } from "@bitwarden/angular/jslib.module";
import { OrganizationService } from "@bitwarden/common/admin-console/abstractions/organization/organization.service.abstraction";
import { Organization } from "@bitwarden/common/admin-console/models/domain/organization";
import { AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { getUserId } from "@bitwarden/common/auth/services/account.service";
import { PasskeyDirectoryApiServiceAbstraction } from "@bitwarden/common/dirt/services/abstractions/passkey-directory-api.service.abstraction";
import { LogService } from "@bitwarden/common/platform/abstractions/log.service";
import { getById } from "@bitwarden/common/platform/misc";
import { CipherId, CollectionId } from "@bitwarden/common/types/guid";
import { CipherService } from "@bitwarden/common/vault/abstractions/cipher.service";
import { SyncService } from "@bitwarden/common/vault/abstractions/sync/sync.service.abstraction";
import { CipherRepromptType } from "@bitwarden/common/vault/enums/cipher-reprompt-type";
import { Cipher } from "@bitwarden/common/vault/models/domain/cipher";
import { CipherView } from "@bitwarden/common/vault/models/view/cipher.view";
import {
  BadgeComponent,
  CalloutComponent,
  ContainerComponent,
  DialogService,
  LinkComponent,
  TableDataSource,
  TableModule,
} from "@bitwarden/components";
import {
  CipherFormConfig,
  CipherFormConfigService,
  PasswordRepromptService,
  RoutedVaultFilterBridgeService,
  RoutedVaultFilterService,
} from "@bitwarden/vault";

import { HeaderModule } from "../../../../layouts/header/header.module";
import {
  VaultItemDialogComponent,
  VaultItemDialogMode,
  VaultItemDialogResult,
} from "../../../../vault/components/vault-item-dialog/vault-item-dialog.component";
import { AdminConsoleCipherFormConfigService } from "../../../../vault/org-vault/services/admin-console-cipher-form-config.service";
import {
  PasskeyServiceEntry,
  PasskeyTypeInfo,
  getPasskeyServiceMatch,
  loadPasskeyServices,
  processPasskeyCiphers,
  updateCipherMatchSignals,
} from "../passkey-report.utils";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "app-org-passkey-report",
  templateUrl: "org-passkey-report.component.html",
  providers: [
    {
      provide: CipherFormConfigService,
      useClass: AdminConsoleCipherFormConfigService,
    },
    AdminConsoleCipherFormConfigService,
    RoutedVaultFilterService,
    RoutedVaultFilterBridgeService,
  ],
  imports: [
    CommonModule,
    JslibModule,
    HeaderModule,
    BadgeComponent,
    CalloutComponent,
    ContainerComponent,
    LinkComponent,
    TableModule,
  ],
})
export class OrgPasskeyReportComponent {
  // Injected dependencies
  private readonly route = inject(ActivatedRoute);
  private readonly accountService = inject(AccountService);
  private readonly organizationService = inject(OrganizationService);
  private readonly cipherService = inject(CipherService);
  private readonly dialogService = inject(DialogService);
  private readonly logService = inject(LogService);
  private readonly passkeyDirectoryApiService = inject(PasskeyDirectoryApiServiceAbstraction);
  private readonly passwordRepromptService = inject(PasswordRepromptService);
  private readonly syncService = inject(SyncService);
  private readonly adminConsoleCipherFormConfigService = inject(
    AdminConsoleCipherFormConfigService,
  );

  // Reactive state
  protected readonly loading = signal(false);
  protected readonly hasLoaded = signal(false);
  protected readonly ciphers = signal<CipherView[]>([]);
  protected readonly cipherDocs = signal<Map<string, string>>(new Map());
  protected readonly dataSource = new TableDataSource<CipherView>();

  // Passkey type info exposed to the template
  protected readonly cipherPasskeyTypes = signal<Map<string, PasskeyTypeInfo>>(new Map());

  // Private state
  private readonly manageableCiphers = signal<Cipher[]>([]);
  private readonly passkeyServices = new Map<string, PasskeyServiceEntry>();

  // Observable streams
  private readonly userId$ = this.accountService.activeAccount$.pipe(getUserId);

  private readonly organization$ = this.route.params.pipe(
    concatMap((params) =>
      this.userId$.pipe(
        switchMap((userId) =>
          this.organizationService.organizations$(userId).pipe(getById(params.organizationId)),
        ),
        filter((organization): organization is Organization => organization != null),
        shareReplay({ refCount: true, bufferSize: 1 }),
      ),
    ),
  );

  protected readonly organization = toSignal(this.organization$);

  constructor() {
    this.organization$
      .pipe(
        concatMap(async (org) => {
          const userId = await firstValueFrom(this.userId$);
          this.manageableCiphers.set(await this.cipherService.getAll(userId));
          await this.load(org);
        }),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  protected async selectCipher(cipher: CipherView) {
    if (
      cipher.reprompt !== CipherRepromptType.None &&
      !(await this.passwordRepromptService.showPasswordPrompt())
    ) {
      return;
    }

    const formConfig = await this.adminConsoleCipherFormConfigService.buildConfig(
      "edit",
      cipher.id as CipherId,
      cipher.type,
    );

    await this.openVaultItemDialog("view", formConfig, cipher);
  }

  protected canManageCipher(c: CipherView): boolean {
    if (c.collectionIds.length === 0) {
      return true;
    }
    if (this.organization()?.allowAdminAccessToAllCollectionItems) {
      return true;
    }
    return this.manageableCiphers().some((x) => x.id === c.id);
  }

  private async load(org: Organization) {
    this.loading.set(true);
    await this.syncService.fullSync(false);
    await this.setCiphers(org);
    this.loading.set(false);
    this.hasLoaded.set(true);
  }

  private async setCiphers(org: Organization) {
    try {
      if (this.passkeyServices.size === 0) {
        const userId = await firstValueFrom(this.userId$);
        this.passkeyServices = await loadPasskeyServices(this.passkeyDirectoryApiService, userId);
      }
    } catch (e) {
      this.logService.error("[OrgPasskeyReportComponent] Failed to load passkeys", e);
    }

    if (this.passkeyServices.size === 0) {
      return;
    }

    const allCiphers = await this.cipherService.getAllFromApiForOrganization(org.id, true);
    const result = processPasskeyCiphers(allCiphers, this.passkeyServices);

    this.ciphers.set(result.ciphers);
    this.dataSource.data = result.ciphers;
    this.cipherDocs.set(result.docs);
    this.cipherPasskeyTypes.set(result.passkeyTypes);
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
      isAdminConsoleAction: true,
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
    const org = this.organization();
    if (org == null) {
      return;
    }

    if (result === VaultItemDialogResult.Deleted) {
      this.ciphers.update((current) => current.filter((c) => c.id !== cipher.id));
      this.dataSource.data = this.ciphers();
      return;
    }

    if (result === VaultItemDialogResult.Saved) {
      const activeUserId = await firstValueFrom(this.userId$);
      const updatedCipher =
        (await this.adminConsoleCipherFormConfigService.getCipher(cipher.id as CipherId, org)) ??
        (await this.cipherService.get(cipher.id, activeUserId));

      const updatedCipherView = await updatedCipher.decrypt(
        await this.cipherService.getKeyForCipherKeyDecryption(updatedCipher, activeUserId),
      );

      const match = getPasskeyServiceMatch(updatedCipherView, this.passkeyServices);
      const index = this.ciphers().findIndex((c) => c.id === updatedCipherView.id);

      if (match != null) {
        updateCipherMatchSignals(
          updatedCipherView.id,
          match,
          this.cipherDocs,
          this.cipherPasskeyTypes,
        );
        if (index > -1) {
          this.ciphers.update((current) => {
            const updated = [...current];
            updated[index] = updatedCipherView;
            return updated;
          });
        }
      } else if (index > -1) {
        this.ciphers.update((current) => current.filter((c) => c.id !== updatedCipherView.id));
      }

      this.dataSource.data = this.ciphers();
    }
  }
}
