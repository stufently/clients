import { ChangeDetectionStrategy, Component } from "@angular/core";

import { QuickSearchComponent } from "./quick-search/quick-search.component";

@Component({
  selector: "magnify-root",
  template: `<app-quick-search />`,
  standalone: true,
  imports: [QuickSearchComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {}
