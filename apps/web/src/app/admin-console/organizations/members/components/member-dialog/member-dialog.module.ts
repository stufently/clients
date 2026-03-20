import { NgModule } from "@angular/core";

import { ChipInputComponent, RadioButtonModule } from "@bitwarden/components";

import { SharedOrganizationModule } from "../../../shared";

import { MemberDialogComponent } from "./member-dialog.component";
import { NestedCheckboxComponent } from "./nested-checkbox.component";

@NgModule({
  declarations: [MemberDialogComponent, NestedCheckboxComponent],
  imports: [SharedOrganizationModule, RadioButtonModule, ChipInputComponent],
  exports: [MemberDialogComponent],
})
export class UserDialogModule {}
