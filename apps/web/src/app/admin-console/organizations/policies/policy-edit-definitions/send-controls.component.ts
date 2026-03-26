import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { UntypedFormBuilder } from "@angular/forms";
import { Observable } from "rxjs";

import { OrgDomainApiServiceAbstraction } from "@bitwarden/common/admin-console/abstractions/organization-domain/org-domain-api.service.abstraction";
import { PolicyType } from "@bitwarden/common/admin-console/enums";
import { Organization } from "@bitwarden/common/admin-console/models/domain/organization";
import { FeatureFlag } from "@bitwarden/common/enums/feature-flag.enum";
import { ConfigService } from "@bitwarden/common/platform/abstractions/config/config.service";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";

import { SharedModule } from "../../../../shared";
import { BasePolicyEditDefinition, BasePolicyEditComponent } from "../base-policy-edit.component";

export class SendControlsPolicy extends BasePolicyEditDefinition {
  name = "sendControls";
  description = "sendControlsPolicyDesc";
  type = PolicyType.SendControls;
  component = SendControlsPolicyComponent;

  override display$(organization: Organization, configService: ConfigService): Observable<boolean> {
    return configService.getFeatureFlag$(FeatureFlag.SendControls);
  }
}

export const WhoCanAccessType = {
  SpecificPeople: "specificPeople",
  PasswordProtected: "passwordProtected",
} as const;

export type WhoCanAccessType = (typeof WhoCanAccessType)[keyof typeof WhoCanAccessType];

@Component({
  selector: "send-controls-policy-edit",
  templateUrl: "send-controls.component.html",
  imports: [SharedModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SendControlsPolicyComponent extends BasePolicyEditComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  readonly data = this.formBuilder.group({
    disableSend: false,
    disableHideEmail: false,
    whoCanAccess: [null as WhoCanAccessType | null],
    allowedDomains: [""],
  });

  readonly whoCanAccessOptions: { name: string; value: WhoCanAccessType }[];

  /** Whether the allowed domains text area should be displayed */
  readonly showDomains = signal(false);

  constructor(
    private readonly formBuilder: UntypedFormBuilder,
    private readonly orgDomainApiService: OrgDomainApiServiceAbstraction,
    i18nService: I18nService,
  ) {
    super();

    this.whoCanAccessOptions = [
      { name: i18nService.t("specificPeople"), value: WhoCanAccessType.SpecificPeople },
      { name: i18nService.t("passwordProtected"), value: WhoCanAccessType.PasswordProtected },
    ];
  }

  async ngOnInit() {
    super.ngOnInit();
    this.updateShowDomains();
    this.data
      .get("whoCanAccess")
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.updateShowDomains());

    // Auto-populate with organization's claimed domains if the field is empty
    await this.populateClaimedDomains();
  }

  private updateShowDomains() {
    this.showDomains.set(this.data.get("whoCanAccess")?.value === WhoCanAccessType.SpecificPeople);
  }

  /**
   * Fetches the organization's claimed domains and populates the allowedDomains
   * field if it is currently empty.
   */
  private async populateClaimedDomains() {
    const currentValue = this.data.get("allowedDomains")?.value;
    if (currentValue) {
      return; // Don't overwrite user-provided domains
    }

    const orgId = this.policyResponse?.organizationId;
    if (!orgId) {
      return;
    }

    try {
      const orgDomains = await this.orgDomainApiService.getAllByOrgId(orgId);
      if (orgDomains?.length) {
        const domainNames = orgDomains.map((d) => d.domainName).join(", ");
        this.data.get("allowedDomains")?.setValue(domainNames);
      }
    } catch {
      // Silently handle errors - claimed domains are optional auto-fill
    }
  }
}
