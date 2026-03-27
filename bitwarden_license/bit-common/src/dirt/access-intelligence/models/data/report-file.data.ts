import { ReportFileApi } from "../api/report-file.api";

/**
 * Serializable data model for report file metadata.
 */
export class ReportFileData {
  id?: string;
  fileName: string = "";
  size: number = 0;
  validated: boolean = false;

  constructor(response?: ReportFileApi) {
    if (response == null) {
      return;
    }

    this.id = response.id;
    this.fileName = response.fileName;
    this.size = response.size;
    this.validated = response.validated;
  }
}
