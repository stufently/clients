import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";

import { JslibModule } from "@bitwarden/angular/jslib.module";
import { AuthType } from "@bitwarden/common/tools/send/types/auth-type";
import {
  BadgeModule,
  ButtonModule,
  IconButtonModule,
  LinkModule,
  MenuModule,
  TableDataSource,
  TableModule,
  TypographyModule,
} from "@bitwarden/components";

import { ReceiveView } from "./receive-view";

@Component({
  selector: "app-receive-table",
  templateUrl: "./receive-table.component.html",
  imports: [
    CommonModule,
    JslibModule,
    TableModule,
    ButtonModule,
    LinkModule,
    IconButtonModule,
    MenuModule,
    BadgeModule,
    TypographyModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReceiveTableComponent {
  protected readonly authType = AuthType;

  readonly dataSource = input<TableDataSource<ReceiveView>>();
  readonly disableReceive = input(false);

  readonly editReceive = output<ReceiveView>();
  readonly copyReceive = output<ReceiveView>();
  readonly removePassword = output<ReceiveView>();
  readonly deleteReceive = output<ReceiveView>();

  protected onEditReceive(receive: ReceiveView): void {
    this.editReceive.emit(receive);
  }

  protected onCopy(receive: ReceiveView): void {
    this.copyReceive.emit(receive);
  }

  protected onRemovePassword(receive: ReceiveView): void {
    this.removePassword.emit(receive);
  }

  protected onDelete(receive: ReceiveView): void {
    this.deleteReceive.emit(receive);
  }
}
