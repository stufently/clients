import { ChangeDetectionStrategy, Component } from "@angular/core";

import { cipherTypeNames, toCipherType } from "@bitwarden/common/vault/enums";

import { MagnifyExternalRequest } from "../../autofill/models/magnify-command";

@Component({
  selector: "magnify-root",
  template: `<p>Magnify</p>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  constructor() {
    // eslint-disable-next-line no-console
    console.log("chrome version" + window.ipc.chrome());

    const testCommand = "vaultSearch";
    const magnifyRequest: MagnifyExternalRequest = {
      command: testCommand,
      input: {
        query: "ab",
        cipherTypes: [toCipherType(cipherTypeNames[1])!],
      },
    };

    // eslint-disable-next-line no-console
    console.log("Magnify command request:", magnifyRequest);

    const result = window.ipc.sendCommand(magnifyRequest);

    // eslint-disable-next-line no-console
    console.log("Magnify command result:", result);
  }
}
