import { AccessReportMetricsApi } from "./access-report-metrics.api";

/**
 * Request body for PUT /reports/organizations/{organizationId}/{reportId}
 */
export class AccessReportUpdateApi {
  reportData?: string;
  contentEncryptionKey?: string;
  summaryData?: string;
  applicationData?: string;
  metrics?: AccessReportMetricsApi;
}
