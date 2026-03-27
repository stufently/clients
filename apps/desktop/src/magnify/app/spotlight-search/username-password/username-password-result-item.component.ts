import { ChangeDetectionStrategy, Component, input, signal } from "@angular/core";

import { MagnifyCommand } from "../../../../autofill/models/magnify-commands";

const MAX_RESULTS = 7;
const COPY_FEEDBACK_MS = 2000;

@Component({
  selector: "username-password-result-item",
  templateUrl: "username-password-result-item.component.html",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  host: { class: "tw-contents" },
})
export class UsernamePasswordResultItemComponent {
  readonly item = input.required<MagnifyCipherResult>();
  readonly index = input.required<number>();
  readonly isSelected = input.required<boolean>();

  protected readonly isMac = window.ipc.platform === "darwin";
  protected readonly maxResults = MAX_RESULTS;
  protected readonly copiedPasswordId = signal<string | null>(null);
  protected readonly copiedUsernameId = signal<string | null>(null);

  protected async copyPassword() {
    const cipher = this.item();
    await window.ipc.sendCommand({ type: MagnifyCommand.CopyPassword, id: cipher.id });
    this.copiedPasswordId.set(cipher.id);
    setTimeout(() => this.copiedPasswordId.set(null), COPY_FEEDBACK_MS);
  }

  protected async copyUsername() {
    const cipher = this.item();
    await window.ipc.sendCommand({ type: MagnifyCommand.CopyUsername, id: cipher.id });
    this.copiedUsernameId.set(cipher.id);
    setTimeout(() => this.copiedUsernameId.set(null), COPY_FEEDBACK_MS);
  }

  protected async launchCipher() {
    await window.ipc.sendCommand({ type: MagnifyCommand.LaunchUri, id: this.item().id });
  }
}
