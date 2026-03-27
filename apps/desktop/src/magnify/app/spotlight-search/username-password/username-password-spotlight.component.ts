import { ChangeDetectionStrategy, Component, OnInit, signal } from "@angular/core";

import { CommandService } from "../../../services/command-service";
import { SpotlightItemAction, SpotlightSearchComponent } from "../spotlight-search.component";

const MAX_RESULTS = 7;
//const COPY_FEEDBACK_MS = 2000;

@Component({
  selector: "app-username-password-spotlight",
  templateUrl: "username-password-spotlight.component.html",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SpotlightSearchComponent],
})
export class UsernamePasswordSpotlightComponent implements OnInit {
  protected readonly isMac = window.ipc.platform === "darwin";
  protected readonly results = signal<MagnifyCipherResult[]>([]);
  protected readonly copiedPasswordId = signal<string | null>(null);
  protected readonly copiedUsernameId = signal<string | null>(null);

  constructor(private readonly commandService: CommandService) {}

  ngOnInit() {
    // Trigger an empty search on load to populate initial results
    void this.search("");
  }

  protected async onQuery(input: string) {
    await this.search(input);
  }

  private async search(input: string) {
    const response = await this.commandService.searchVault(input);
    this.results.set(response.slice(0, MAX_RESULTS));
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
    // TODO: Implement copy password via commandService
    //setTimeout(() => this.copiedPasswordId.set(null), COPY_FEEDBACK_MS);
  }

  protected async copyUsername(cipher: MagnifyCipherResult) {
    // TODO: Implement copy username via commandService
    //setTimeout(() => this.copiedUsernameId.set(null), COPY_FEEDBACK_MS);
  }

  protected async launchCipher(cipher: MagnifyCipherResult) {
    // TODO: Implement launch cipher via commandService -- MAYBE AFTER POC?
    //await window.ipc.sendCommand({ type: MagnifyCommand.LaunchUri, id: cipher.id });
  }
}
