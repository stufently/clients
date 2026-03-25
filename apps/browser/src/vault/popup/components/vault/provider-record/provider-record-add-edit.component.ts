import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { map } from "rxjs/operators";

import { AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { UserId } from "@bitwarden/common/types/guid";
import { CipherService } from "@bitwarden/common/vault/abstractions/cipher.service";
import { FieldType, CipherType } from "@bitwarden/common/vault/enums";
import { CipherView } from "@bitwarden/common/vault/models/view/cipher.view";
import { FieldView } from "@bitwarden/common/vault/models/view/field.view";
import { LoginView } from "@bitwarden/common/vault/models/view/login.view";
import {
  AsyncActionsModule,
  ButtonModule,
  FormFieldModule,
  ToastService,
} from "@bitwarden/components";
import { I18nPipe } from "@bitwarden/ui-common";

import { PopupFooterComponent } from "../../../../../platform/popup/layout/popup-footer.component";
import { PopupHeaderComponent } from "../../../../../platform/popup/layout/popup-header.component";
import { PopupPageComponent } from "../../../../../platform/popup/layout/popup-page.component";

export const PROVIDER_RECORD_MARKER = "__providerRecord";

// FIXME(https://bitwarden.atlassian.net/browse/CL-764): Migrate to OnPush
// eslint-disable-next-line @angular-eslint/prefer-on-push-component-change-detection
@Component({
  templateUrl: "./provider-record-add-edit.component.html",
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PopupPageComponent,
    PopupHeaderComponent,
    PopupFooterComponent,
    FormFieldModule,
    ButtonModule,
    AsyncActionsModule,
    I18nPipe,
  ],
})
export class ProviderRecordAddEditComponent implements OnInit {
  protected form: FormGroup;
  protected loading = false;
  protected isEdit = false;
  private cipherId: string | null = null;
  private activeUserId: UserId | null = null;

  constructor(
    private fb: FormBuilder,
    private cipherService: CipherService,
    private accountService: AccountService,
    private toastService: ToastService,
    private i18nService: I18nService,
    private router: Router,
    private route: ActivatedRoute,
  ) {
    this.form = this.fb.group({
      providerName: ["", Validators.required],
      siteName: ["", Validators.required],
      email: [""],
      phoneNumber: [""],
    });
  }

  async ngOnInit() {
    this.activeUserId = await firstValueFrom(
      this.accountService.activeAccount$.pipe(map((a) => a?.id ?? null)),
    );

    this.cipherId = this.route.snapshot.queryParamMap.get("cipherId");
    this.isEdit = this.cipherId != null;

    if (this.isEdit && this.activeUserId) {
      this.loading = true;
      const ciphers = await this.cipherService.getAllDecrypted(this.activeUserId);
      const cipher = ciphers.find((c) => c.id === this.cipherId);
      if (cipher) {
        this.form.patchValue({
          providerName: cipher.name,
          siteName: this.getFieldValue(cipher, "siteName"),
          email: this.getFieldValue(cipher, "email"),
          phoneNumber: this.getFieldValue(cipher, "phoneNumber"),
        });
      }
      this.loading = false;
    }
  }

  protected save = async () => {
    if (this.form.invalid || !this.activeUserId) {
      this.form.markAllAsTouched();
      return;
    }

    const { providerName, siteName, email, phoneNumber } = this.form.value;

    const cipher = this.isEdit ? await this.getExistingCipher() : this.buildNewCipher();

    if (!cipher) {
      return;
    }

    cipher.name = providerName;
    cipher.fields = this.buildFields(siteName, email, phoneNumber);

    if (this.isEdit) {
      await this.cipherService.updateWithServer(cipher, this.activeUserId);
    } else {
      await this.cipherService.createWithServer(cipher, this.activeUserId);
    }

    this.toastService.showToast({
      variant: "success",
      title: "",
      message: this.i18nService.t(this.isEdit ? "providerRecordUpdated" : "providerRecordCreated"),
    });

    await this.router.navigate(["/provider-records"]);
  };

  private buildNewCipher(): CipherView {
    const cipher = new CipherView();
    cipher.type = CipherType.Login;
    cipher.login = new LoginView();
    cipher.favorite = false;
    return cipher;
  }

  private async getExistingCipher(): Promise<CipherView | null> {
    const ciphers = await this.cipherService.getAllDecrypted(this.activeUserId!);
    return ciphers.find((c) => c.id === this.cipherId) ?? null;
  }

  private buildFields(siteName: string, email: string, phoneNumber: string): FieldView[] {
    const fields: FieldView[] = [];

    const siteNameField = new FieldView();
    siteNameField.name = "siteName";
    siteNameField.value = siteName;
    siteNameField.type = FieldType.Text;
    fields.push(siteNameField);

    if (email) {
      const emailField = new FieldView();
      emailField.name = "email";
      emailField.value = email;
      emailField.type = FieldType.Text;
      fields.push(emailField);
    }

    if (phoneNumber) {
      const phoneField = new FieldView();
      phoneField.name = "phoneNumber";
      phoneField.value = phoneNumber;
      phoneField.type = FieldType.Text;
      fields.push(phoneField);
    }

    const markerField = new FieldView();
    markerField.name = PROVIDER_RECORD_MARKER;
    markerField.value = "true";
    markerField.type = FieldType.Hidden;
    fields.push(markerField);

    return fields;
  }

  private getFieldValue(cipher: CipherView, name: string): string {
    return cipher.fields?.find((f) => f.name === name)?.value ?? "";
  }
}
