import { AccessReportMetricsApi } from "./access-report-metrics.api";

/**
 * Request body for POST /reports/organizations/{organizationId}
 *
 * When the Access Intelligence V2 feature flag is enabled, `fileSize` is required
 * and `reportData`/`summaryData`/`applicationData` are omitted in favour of an
 * uploaded file. Otherwise the encrypted blobs are sent inline.
 */
export class AccessReportCreateApi {
  reportData?: string;
  contentEncryptionKey?: string;
  summaryData?: string;
  applicationData?: string;
  metrics?: AccessReportMetricsApi;
  fileSize?: number;
}
