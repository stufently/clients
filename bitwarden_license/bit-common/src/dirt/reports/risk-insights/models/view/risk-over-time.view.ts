import { View } from "@bitwarden/common/models/view/view";
import { DeepJsonify } from "@bitwarden/common/types/deep-jsonify";

import { AccessReportSummaryView } from "../../../../access-intelligence/models";
import { RiskOverTime } from "../domain/risk-over-time";

/**
 * View model for risk-over-time chart data containing decrypted data points.
 *
 * Each data point is an AccessReportSummaryView with date and metric counts.
 * The chart widget reads the relevant counts based on the selected
 * data view (Applications or Members).
 *
 * - See {@link AccessReportSummaryApi} for API response model
 * - See {@link RiskOverTimeData} for data model
 * - See {@link RiskOverTime} for domain model
 */
export class RiskOverTimeView implements View {
  dataPoints: AccessReportSummaryView[] = [];

  constructor(data?: RiskOverTime) {
    if (data == null) {
      return;
    }
    if (data.dataPoints != null) {
      this.dataPoints = data.dataPoints.map((dp) => new AccessReportSummaryView(dp));
    }
  }

  toJSON() {
    return this;
  }

  static fromJSON(
    obj: Partial<DeepJsonify<RiskOverTimeView>> | undefined,
  ): RiskOverTimeView | undefined {
    if (obj == null) {
      return undefined;
    }
    const view = Object.assign(new RiskOverTimeView(), obj) as RiskOverTimeView;
    view.dataPoints =
      (obj.dataPoints as any[])?.map((dp: any) => AccessReportSummaryView.fromJSON(dp)) ?? [];
    return view;
  }
}
