import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, OnInit, signal } from "@angular/core";

import { BitIconButtonComponent, ButtonModule } from "@bitwarden/components";

import { SpotlightItemAction, SpotlightSearchComponent } from "../spotlight-search.component";

const MAX_RESULTS = 7;

@Component({
  selector: "app-username-password-spotlight",
  templateUrl: "username-password-spotlight.component.html",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, SpotlightSearchComponent, BitIconButtonComponent, ButtonModule],
})
export class UsernamePasswordSpotlightComponent implements OnInit {
  protected readonly isMac = magnifyIpc.platform === "darwin";
  protected readonly results = signal<MagnifyCipherResult[]>([]);
  protected readonly maxResults = MAX_RESULTS;

  ngOnInit() {
    magnifyIpc.onResults((data) => {
      if (data.command === "cipherSearch") {
        const cipherResults = data.results as MagnifyCipherResult[];
        this.results.set(cipherResults.slice(0, MAX_RESULTS));
      }
    });
  }

  protected onQuery(input: string) {
    magnifyIpc.sendCommand({ command: "cipherSearch", input });
  }

  protected onItemAction({ event, item }: SpotlightItemAction) {
    const cipher = item as MagnifyCipherResult;
    const modKey = this.isMac ? event.metaKey : event.ctrlKey;

    if (event.key === "Enter") {
      event.preventDefault();
      this.copyPassword(cipher);
    } else if (event.key === "c" && modKey) {
      event.preventDefault();
      this.copyUsername(cipher);
    } else if (modKey && /^[1-9]$/.test(event.key)) {
      // Shell already updated selectedIndex; execute copy-password for the forwarded item
      this.copyPassword(cipher);
    }
  }

  protected copyPassword(cipher: MagnifyCipherResult) {
    magnifyIpc.sendCommand({ command: "cipherPasswordCopy", input: cipher.id });
  }

  protected copyUsername(cipher: MagnifyCipherResult) {
    magnifyIpc.sendCommand({ command: "cipherUsernameCopy", input: cipher.id });
  }

  protected launchCipher(cipher: MagnifyCipherResult) {
    magnifyIpc.sendCommand({ command: "cipherLaunch", input: cipher.id });
  }
}
