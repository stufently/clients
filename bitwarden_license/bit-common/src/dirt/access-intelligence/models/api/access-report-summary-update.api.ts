import { AccessReportMetricsApi } from "./access-report-metrics.api";

/**
 * Request body for PATCH /reports/organizations/{organizationId}/data/summary/{reportId}
 */
export class AccessReportSummaryUpdateApi {
  summaryData?: string;
  metrics?: AccessReportMetricsApi;
}
