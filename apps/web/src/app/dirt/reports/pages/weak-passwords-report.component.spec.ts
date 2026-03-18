import { ChangeDetectionStrategy, Component } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { mock, MockProxy } from "jest-mock-extended";
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
import { WeakPasswordsReportComponent } from "./weak-passwords-report.component";

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

describe("WeakPasswordsReportComponent", () => {
  let component: WeakPasswordsReportComponent;
  let fixture: ComponentFixture<WeakPasswordsReportComponent>;
  let cipherRiskService: MockProxy<CipherRiskService>;
  let organizationService: MockProxy<OrganizationService>;
  let syncServiceMock: MockProxy<SyncService>;
  const userId = Utils.newGuid() as UserId;
  const accountService: FakeAccountService = mockAccountServiceWith(userId);

  beforeEach(async () => {
    const cipherFormConfigServiceMock = mock<CipherFormConfigService>();
    syncServiceMock = mock<SyncService>();
    cipherRiskService = mock<CipherRiskService>();
    organizationService = mock<OrganizationService>();
    organizationService.organizations$.mockReturnValue(of([]));

    await TestBed.configureTestingModule({
      declarations: [WeakPasswordsReportComponent, MockHeaderComponent, MockBitContainerComponent],
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
    fixture = TestBed.createComponent(WeakPasswordsReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should initialize component", () => {
    expect(component).toBeTruthy();
  });

  it('should get only ciphers with weak passwords that the user has "Can Edit" access to', async () => {
    const expectedIdOne = "cbea34a8-bde4-46ad-9d19-b05001228ab2";
    const expectedIdTwo = "cbea34a8-bde4-46ad-9d19-b05001228cd3";

    cipherRiskService.computeRiskForCiphers.mockResolvedValue([
      {
        id: expectedIdOne,
        password_strength: 0,
        exposed_result: { type: "NotChecked" },
        reuse_count: undefined,
      },
      {
        id: expectedIdTwo,
        password_strength: 0,
        exposed_result: { type: "NotChecked" },
        reuse_count: undefined,
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
  });

  describe("determinedUpdatedCipherReportStatus", () => {
    it("should remove cipher from weakPasswordCiphers when deleted", async () => {
      const cipher = cipherData[1] as any;
      component.weakPasswordCiphers = [{ ...cipher, score: 0 }] as any;

      const result = await component.determinedUpdatedCipherReportStatus(
        VaultItemDialogResult.Deleted,
        cipher,
      );

      expect(result).toBeNull();
      expect(component.weakPasswordCiphers).toHaveLength(0);
    });

    it("should update cipher in weakPasswordCiphers when it is still weak", async () => {
      const cipher = cipherData[1] as any;
      component.weakPasswordCiphers = [{ ...cipher, score: 0 }] as any;
      cipherRiskService.computeRiskForCiphers.mockResolvedValueOnce([
        {
          id: cipher.id,
          password_strength: 2,
          exposed_result: { type: "NotChecked" },
          reuse_count: undefined,
        },
      ] as any);

      const result = await component.determinedUpdatedCipherReportStatus(
        VaultItemDialogResult.Saved,
        cipher,
      );

      expect(result).not.toBeNull();
      expect((result as any).score).toBe(2);
      expect(component.weakPasswordCiphers[0].score).toBe(2);
    });

    it("should remove cipher from weakPasswordCiphers when password is no longer weak", async () => {
      const cipher = cipherData[1] as any;
      component.weakPasswordCiphers = [{ ...cipher, score: 0 }] as any;
      cipherRiskService.computeRiskForCiphers.mockResolvedValueOnce([
        {
          id: cipher.id,
          password_strength: 3,
          exposed_result: { type: "NotChecked" },
          reuse_count: undefined,
        },
      ] as any);

      const result = await component.determinedUpdatedCipherReportStatus(
        VaultItemDialogResult.Saved,
        cipher,
      );

      expect(result).toBeNull();
      expect(component.weakPasswordCiphers).toHaveLength(0);
    });

    it("should add cipher to weakPasswordCiphers when it becomes newly weak", async () => {
      const cipher = cipherData[1] as any;
      component.weakPasswordCiphers = [];
      cipherRiskService.computeRiskForCiphers.mockResolvedValueOnce([
        {
          id: cipher.id,
          password_strength: 0,
          exposed_result: { type: "NotChecked" },
          reuse_count: undefined,
        },
      ] as any);

      const result = await component.determinedUpdatedCipherReportStatus(
        VaultItemDialogResult.Saved,
        cipher,
      );

      expect(result).not.toBeNull();
      expect(component.weakPasswordCiphers).toHaveLength(1);
      expect(component.weakPasswordCiphers[0].id).toBe(cipher.id);
    });
  });

  it("should call fullSync method of syncService", () => {
    expect(syncServiceMock.fullSync).toHaveBeenCalledWith(false);
  });
});
