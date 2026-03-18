import { AccessReportSummaryApi } from "../../../../access-intelligence/models";

/**
 * Serializable data model for risk-over-time chart data.
 *
 * Holds the raw entries from the server. Each entry is an AccessReportSummaryApi
 * with date and encrypted fields populated. The count fields default to 0 until
 * a consuming data service decrypts the entries.
 *
 * - See {@link AccessReportSummaryApi} for API response model
 * - See {@link RiskOverTime} for domain model
 * - See {@link RiskOverTimeView} for view model
 */
export class RiskOverTimeData {
  entries: AccessReportSummaryApi[] = [];

  constructor(apiEntries?: AccessReportSummaryApi[]) {
    if (apiEntries == null) {
      return;
    }
    this.entries = apiEntries.filter((entry) => entry.date !== "");
  }
}
