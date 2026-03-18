import { ChangeDetectionStrategy, Component } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { MockProxy, mock } from "jest-mock-extended";
import { of } from "rxjs";

import { OrganizationService } from "@bitwarden/common/admin-console/abstractions/organization/organization.service.abstraction";
import { AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { Utils } from "@bitwarden/common/platform/misc/utils";
import { FakeAccountService, mockAccountServiceWith } from "@bitwarden/common/spec";
import { UserId } from "@bitwarden/common/types/guid";
import { CipherRiskService } from "@bitwarden/common/vault/abstractions/cipher-risk.service";
import { CipherService } from "@bitwarden/common/vault/abstractions/cipher.service";
import { SyncService } from "@bitwarden/common/vault/abstractions/sync/sync.service.abstraction";
import { DialogService } from "@bitwarden/components";
import { I18nPipe } from "@bitwarden/ui-common";
import { CipherFormConfigService, PasswordRepromptService } from "@bitwarden/vault";

import { VaultItemDialogResult } from "../../../vault/components/vault-item-dialog/vault-item-dialog.component";
import { AdminConsoleCipherFormConfigService } from "../../../vault/org-vault/services/admin-console-cipher-form-config.service";

import { cipherData } from "./reports-ciphers.mock";
import { ReusedPasswordsReportComponent } from "./reused-passwords-report.component";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "app-header",
  template: "<div></div>",
  standalone: false,
})
class MockHeaderComponent {}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "bit-container",
  template: "<div></div>",
  standalone: false,
})
class MockBitContainerComponent {}

describe("ReusedPasswordsReportComponent", () => {
  let component: ReusedPasswordsReportComponent;
  let fixture: ComponentFixture<ReusedPasswordsReportComponent>;
  let cipherRiskService: MockProxy<CipherRiskService>;
  let organizationService: MockProxy<OrganizationService>;
  let syncServiceMock: MockProxy<SyncService>;
  const userId = Utils.newGuid() as UserId;
  const accountService: FakeAccountService = mockAccountServiceWith(userId);

  beforeEach(async () => {
    const cipherFormConfigServiceMock = mock<CipherFormConfigService>();
    organizationService = mock<OrganizationService>();
    organizationService.organizations$.mockReturnValue(of([]));
    syncServiceMock = mock<SyncService>();
    cipherRiskService = mock<CipherRiskService>();
    await TestBed.configureTestingModule({
      declarations: [
        ReusedPasswordsReportComponent,
        MockHeaderComponent,
        MockBitContainerComponent,
      ],
      imports: [I18nPipe],
      providers: [
        {
          provide: CipherService,
          useValue: mock<CipherService>(),
        },
        {
          provide: CipherRiskService,
          useValue: cipherRiskService,
        },
        {
          provide: OrganizationService,
          useValue: organizationService,
        },
        {
          provide: AccountService,
          useValue: accountService,
        },
        {
          provide: DialogService,
          useValue: mock<DialogService>(),
        },
        {
          provide: PasswordRepromptService,
          useValue: mock<PasswordRepromptService>(),
        },
        {
          provide: SyncService,
          useValue: syncServiceMock,
        },
        {
          provide: I18nService,
          useValue: mock<I18nService>(),
        },
        {
          provide: CipherFormConfigService,
          useValue: cipherFormConfigServiceMock,
        },
        {
          provide: AdminConsoleCipherFormConfigService,
          useValue: mock<AdminConsoleCipherFormConfigService>(),
        },
      ],
      schemas: [],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ReusedPasswordsReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should initialize component", () => {
    expect(component).toBeTruthy();
  });

  it('should get ciphers with reused passwords that the user has "Can Edit" access to', async () => {
    const expectedIdOne = "cbea34a8-bde4-46ad-9d19-b05001228ab2";
    const expectedIdTwo = "cbea34a8-bde4-46ad-9d19-b05001228cd3";
    const passwordMap = { "123": 2 };

    cipherRiskService.buildPasswordReuseMap.mockResolvedValue(passwordMap as any);
    cipherRiskService.computeRiskForCiphers.mockResolvedValue([
      {
        id: expectedIdOne,
        password_strength: 0,
        exposed_result: { type: "NotChecked" },
        reuse_count: 2,
      },
      {
        id: expectedIdTwo,
        password_strength: 0,
        exposed_result: { type: "NotChecked" },
        reuse_count: 2,
      },
    ] as any);
    jest.spyOn(component as any, "getAllCiphers").mockReturnValue(Promise.resolve<any>(cipherData));
    await component.setCiphers();

    expect(component.ciphers.length).toEqual(2);
    expect(component.ciphers[0].id).toEqual(expectedIdOne);
    expect(component.ciphers[0].edit).toEqual(true);
    expect(component.ciphers[1].id).toEqual(expectedIdTwo);
    expect(component.ciphers[1].edit).toEqual(true);

    // Verify non-editable cipher was excluded before calling the risk service
    const calledCiphers = cipherRiskService.computeRiskForCiphers.mock.calls[0][0];
    const calledIds = calledCiphers.map((c: any) => c.id);
    expect(calledIds).toHaveLength(2);
    expect(calledIds).not.toContain("cbea34a8-bde4-46ad-9d19-b05001228ab1");

    // Verify the passwordMap from buildPasswordReuseMap was passed to computeRiskForCiphers
    expect(cipherRiskService.computeRiskForCiphers).toHaveBeenCalledWith(
      expect.any(Array),
      userId,
      expect.objectContaining({ passwordMap }),
    );
  });

  describe("determinedUpdatedCipherReportStatus", () => {
    it("should remove cipher from ciphersToCheckForReusedPasswords when deleted", async () => {
      const cipher = cipherData[1] as any;
      component.ciphersToCheckForReusedPasswords = [cipher];

      const result = await component.determinedUpdatedCipherReportStatus(
        VaultItemDialogResult.Deleted,
        cipher,
      );

      expect(result).toBeNull();
      expect(component.ciphersToCheckForReusedPasswords).toHaveLength(0);
    });

    it("should update the cipher in the list and recompute when saved", async () => {
      const cipher = cipherData[1] as any;
      component.ciphersToCheckForReusedPasswords = [cipher];
      cipherRiskService.buildPasswordReuseMap.mockResolvedValueOnce({} as any);
      cipherRiskService.computeRiskForCiphers.mockResolvedValueOnce([
        {
          id: cipher.id,
          password_strength: 0,
          exposed_result: { type: "NotChecked" },
          reuse_count: 2,
        },
      ] as any);

      const result = await component.determinedUpdatedCipherReportStatus(
        VaultItemDialogResult.Saved,
        cipher,
      );

      expect(result).not.toBeNull();
      expect(result!.id).toBe(cipher.id);
    });

    it("should recompute and exclude cipher no longer reused when saved", async () => {
      const cipher = cipherData[1] as any;
      component.ciphersToCheckForReusedPasswords = [cipher];
      cipherRiskService.buildPasswordReuseMap.mockResolvedValueOnce({} as any);
      cipherRiskService.computeRiskForCiphers.mockResolvedValueOnce([
        {
          id: cipher.id,
          password_strength: 0,
          exposed_result: { type: "NotChecked" },
          reuse_count: 1,
        },
      ] as any);

      await component.determinedUpdatedCipherReportStatus(VaultItemDialogResult.Saved, cipher);

      expect(component.ciphers).toHaveLength(0);
    });
  });

  it("should call fullSync method of syncService", () => {
    expect(syncServiceMock.fullSync).toHaveBeenCalledWith(false);
  });
});
