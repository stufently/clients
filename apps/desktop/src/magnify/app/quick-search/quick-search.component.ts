import { CommonModule } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  signal,
  viewChild,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { debounceTime, distinctUntilChanged, startWith } from "rxjs";

import { BitIconButtonComponent, ButtonModule, SearchModule } from "@bitwarden/components";

const DEBOUNCE_MS = 150;
const MAX_RESULTS = 5;

@Component({
  selector: "app-quick-search",
  templateUrl: "quick-search.component.html",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      .qs-results::-webkit-scrollbar {
        display: none;
      }
      .qs-results {
        scrollbar-width: none;
      }
    `,
  ],
  imports: [CommonModule, ReactiveFormsModule, BitIconButtonComponent, ButtonModule, SearchModule],
})
export class QuickSearchComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchHeaderRef = viewChild<ElementRef<HTMLElement>>("searchHeader");

  protected readonly isMac = magnifyIpc.platform === "darwin";
  protected readonly searchControl = new FormControl("", { nonNullable: true });
  protected readonly results = signal<MagnifyCipherResult[]>([]);
  protected readonly selectedIndex = signal(0);

  ngOnInit() {
    magnifyIpc.onResults((data) => {
      if (data.command === "cipherSearch") {
        const cipherResults = data.results as MagnifyCipherResult[];
        this.results.set(cipherResults.slice(0, MAX_RESULTS));
        this.selectedIndex.set(0);
      }
    });

    this.searchControl.valueChanges
      .pipe(
        startWith(""),
        debounceTime(DEBOUNCE_MS),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((input) => {
        magnifyIpc.sendCommand({ command: "cipherSearch", input });
      });

    setTimeout(() => {
      const input = this.searchHeaderRef()?.nativeElement?.querySelector<HTMLInputElement>("input");
      input?.focus();
    }, 50);
  }

  protected setSelectedIndex(index: number) {
    this.selectedIndex.set(index);
  }

  protected copyPassword(cipher: MagnifyCipherResult) {
    magnifyIpc.sendCommand({ command: "cipherPasswordCopy", input: cipher.id });
  }

  protected copyUsername(cipher: MagnifyCipherResult) {
    magnifyIpc.sendCommand({ command: "cipherUsernameCopy", input: cipher.id });
  }

  protected close() {
    window.close();
  }

  protected onKeydown(event: KeyboardEvent) {
    const ciphers = this.results();
    const selected = ciphers[this.selectedIndex()];
    const modKey = this.isMac ? event.metaKey : event.ctrlKey;

    switch (event.key) {
      case "Escape":
        this.close();
        break;
      case "ArrowDown":
        event.preventDefault();
        this.selectedIndex.update((i) => Math.min(i + 1, ciphers.length - 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        this.selectedIndex.update((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        if (selected) {
          event.preventDefault();
          this.copyPassword(selected);
        }
        break;
      case "c":
        if (modKey && selected) {
          event.preventDefault();
          this.copyUsername(selected);
        }
        break;
      default: {
        const digit = parseInt(event.key, 10);
        if (modKey && digit >= 1 && digit <= 9) {
          const target = ciphers[digit - 1];
          if (target) {
            event.preventDefault();
            this.selectedIndex.set(digit - 1);
            this.copyPassword(target);
          }
        }
      }
    }
  }
}
