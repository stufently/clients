export class AutofillTriageReportRequest {
  pageUrl: string;
  targetElementRef?: string;
  userMessage: string;
  reportData: string; // JSON.stringify(AutofillTriageFieldResult[])

  constructor(pageUrl: string, userMessage: string, reportData: string, targetElementRef?: string) {
    this.pageUrl = pageUrl;
    this.targetElementRef = targetElementRef;
    this.userMessage = userMessage;
    this.reportData = reportData;
  }
}
