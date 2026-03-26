import { ChangeDetectionStrategy, Component } from "@angular/core";
import { FormsModule } from "@angular/forms";

import { ButtonModule, DialogModule, FormFieldModule } from "@bitwarden/components";
import { I18nPipe } from "@bitwarden/ui-common";

@Component({
  templateUrl: "./receive-add-edit.component.html",
  imports: [FormsModule, DialogModule, FormFieldModule, ButtonModule, I18nPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReceiveAddEditComponent {
  protected readonly name = "";
  protected readonly expirationDays = 7;
}
