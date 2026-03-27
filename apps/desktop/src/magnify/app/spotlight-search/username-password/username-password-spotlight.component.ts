import { ChangeDetectionStrategy, Component, OnInit, signal } from "@angular/core";

import { MagnifyCommand } from "../../../../autofill/models/magnify-commands";
import { MagnifySpotlightSearchType } from "../../../constants";
import { SpotlightItemAction, SpotlightSearchComponent } from "../spotlight-search.component";

const MAX_RESULTS = 7;
const COPY_FEEDBACK_MS = 2000;

@Component({
  selector: "app-username-password-spotlight",
  templateUrl: "username-password-spotlight.component.html",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SpotlightSearchComponent],
})
export class UsernamePasswordSpotlightComponent implements OnInit {
  readonly type = MagnifySpotlightSearchType.UsernamePassword;

  protected readonly isMac = window.ipc.platform === "darwin";
  protected readonly results = signal<MagnifyCipherResult[]>([]);
  protected readonly copiedPasswordId = signal<string | null>(null);
  protected readonly copiedUsernameId = signal<string | null>(null);

  ngOnInit() {
    // Trigger an empty search on load to populate initial results
    void this.search("");
  }

  protected async onQuery(input: string) {
    await this.search(input);
  }

  private async search(input: string) {
    const response = await window.ipc.sendCommand({ type: MagnifyCommand.SearchVault, input });
    if (response.type === MagnifyCommand.SearchVault) {
      this.results.set(response.results.slice(0, MAX_RESULTS) as MagnifyCipherResult[]);
    }
  }

  protected onItemAction({ event, item }: SpotlightItemAction) {
    const cipher = item as MagnifyCipherResult;
    const modKey = this.isMac ? event.metaKey : event.ctrlKey;

    if (event.key === "c" && modKey && !event.shiftKey) {
      event.preventDefault();
      void this.copyPassword(cipher);
    } else if (event.key === "c" && modKey && event.shiftKey) {
      event.preventDefault();
      void this.copyUsername(cipher);
    } else if (event.key === "Enter") {
      event.preventDefault();
      void this.copyPassword(cipher);
    } else if (modKey && /^[1-9]$/.test(event.key)) {
      void this.copyPassword(cipher);
    }
  }

  protected async copyPassword(cipher: MagnifyCipherResult) {
    await window.ipc.sendCommand({ type: MagnifyCommand.CopyPassword, id: cipher.id });
    this.copiedPasswordId.set(cipher.id);
    setTimeout(() => this.copiedPasswordId.set(null), COPY_FEEDBACK_MS);
  }

  protected async copyUsername(cipher: MagnifyCipherResult) {
    await window.ipc.sendCommand({ type: MagnifyCommand.CopyUsername, id: cipher.id });
    this.copiedUsernameId.set(cipher.id);
    setTimeout(() => this.copiedUsernameId.set(null), COPY_FEEDBACK_MS);
  }

  protected async launchCipher(cipher: MagnifyCipherResult) {
    await window.ipc.sendCommand({ type: MagnifyCommand.LaunchUri, id: cipher.id });
  }
}
