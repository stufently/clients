import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormBuilder, FormControl, Validators, ReactiveFormsModule } from "@angular/forms";

import { SendView } from "@bitwarden/common/tools/send/models/view/send.view";
import { CheckboxModule, FormFieldModule, SectionComponent } from "@bitwarden/components";
import { I18nPipe } from "@bitwarden/ui-common";

import { SendFormConfig } from "../../abstractions/send-form-config.service";
import { SendFormContainer } from "../../send-form-container";

@Component({
  selector: "tools-send-text-details",
  templateUrl: "./send-text-details.component.html",
  imports: [CheckboxModule, I18nPipe, ReactiveFormsModule, FormFieldModule, SectionComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SendTextDetailsComponent {
  readonly formBuilder = inject(FormBuilder);
  readonly sendFormContainer = inject(SendFormContainer);

  readonly config = input.required<SendFormConfig>();
  readonly originalSendView = input<SendView>();
  readonly editing = input<boolean>(false);

  readonly sendTextDetailsForm = this.formBuilder.group({
    text: new FormControl("", Validators.required),
    hidden: new FormControl(false),
  });

  readonly formDisabled = computed(() => !this.editing() || !this.config().areSendsAllowed);
  readonly showHiddenCheckbox = computed(
    () => this.editing() || this.config().originalSend?.text?.hidden,
  );

  constructor() {
    this.sendFormContainer.registerChildForm("sendTextDetailsForm", this.sendTextDetailsForm);

    effect(() => {
      if (this.formDisabled()) {
        this.sendTextDetailsForm.controls.hidden.disable();
      } else {
        this.sendTextDetailsForm.controls.hidden.enable();
      }
    });

    effect(() => {
      this.sendTextDetailsForm.patchValue({
        text: this.originalSendView()?.text?.text || "",
        hidden: this.originalSendView()?.text?.hidden || false,
      });
    });

    this.sendTextDetailsForm.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      this.sendFormContainer.patchSend((send) => {
        return Object.assign(send, {
          text: {
            text: value.text,
            hidden: value.hidden,
          },
        });
      });
    });
  }
}
