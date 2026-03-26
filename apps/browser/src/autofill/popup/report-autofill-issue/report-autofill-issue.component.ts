import { CommonModule } from "@angular/common";
import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from "@angular/core";

import { JslibModule } from "@bitwarden/angular/jslib.module";
import { ApiService } from "@bitwarden/common/abstractions/api.service";
import { AutofillTriageReportRequest } from "@bitwarden/common/autofill/models/request/autofill-triage-report.request";
import { ButtonModule, FormFieldModule, IconModule } from "@bitwarden/components";

import { PopupHeaderComponent } from "../../../platform/popup/layout/popup-header.component";
import { PopupPageComponent } from "../../../platform/popup/layout/popup-page.component";
import { AutofillTriagePageResult } from "../../types/autofill-triage";

@Component({
  standalone: true,
  selector: "app-report-autofill-issue",
  templateUrl: "./report-autofill-issue.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    JslibModule,
    PopupPageComponent,
    PopupHeaderComponent,
    ButtonModule,
    FormFieldModule,
    IconModule,
  ],
})
export class ReportAutofillIssueComponent implements OnInit {
  protected readonly MAX_USER_MESSAGE_LENGTH = 200;
  protected readonly MAX_REPORT_DATA_BYTES = 51200;

  protected readonly triageResult = signal<AutofillTriagePageResult | null>(null);
  protected readonly showDetail = signal(false);
  protected readonly userMessage = signal("");
  protected readonly isSending = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly isSuccess = signal(false);

  private readonly apiService = inject(ApiService);

  async ngOnInit() {
    chrome.runtime.sendMessage(
      { command: "getAutofillIssueReportResult" },
      (response: AutofillTriagePageResult | null) => {
        this.triageResult.set(response);
      },
    );
  }

  protected toggleDetail() {
    this.showDetail.update((v) => !v);
  }

  protected onUserMessageInput(event: Event) {
    const value = (event.target as HTMLTextAreaElement).value;
    this.userMessage.set(value);
  }

  protected async sendReport() {
    const result = this.triageResult();
    if (!result) {
      return;
    }

    const reportData = JSON.stringify(result.fields);
    if (new Blob([reportData]).size > this.MAX_REPORT_DATA_BYTES) {
      this.errorMessage.set("autofillReportTooLarge");
      return;
    }

    this.isSending.set(true);
    this.errorMessage.set(null);

    try {
      const request = new AutofillTriageReportRequest(
        result.pageUrl,
        this.userMessage(),
        reportData,
        result.targetElementRef,
      );
      await this.apiService.postAutofillTriageReport(request);
      this.isSuccess.set(true);
      setTimeout(() => window.close(), 1500);
    } catch {
      this.errorMessage.set("autofillReportError");
    } finally {
      this.isSending.set(false);
    }
  }

  protected cancel() {
    window.close();
  }
}
