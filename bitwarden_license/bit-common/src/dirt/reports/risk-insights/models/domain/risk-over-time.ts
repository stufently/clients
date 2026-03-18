import Domain from "@bitwarden/common/platform/models/domain/domain-base";

import { AccessReportSummary } from "../../../../access-intelligence/models";

/**
 * Domain model for risk-over-time chart data.
 *
 * After decryption, each server entry yields an AccessReportSummary with
 * date and metric counts populated. The chart widget reads the relevant
 * counts based on the selected data view (Applications or Members).
 *
 * - See {@link AccessReportSummaryApi} for API response model
 * - See {@link RiskOverTimeData} for data model
 * - See {@link RiskOverTimeView} for view model
 */
export class RiskOverTime extends Domain {
  dataPoints: AccessReportSummary[] = [];

  constructor(dataPoints?: AccessReportSummary[]) {
    super();
    if (dataPoints == null) {
      return;
    }
    this.dataPoints = dataPoints;
  }
}
