import { CommonModule } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  signal,
  viewChild,
} from "@angular/core";
import { takeUntilDestroyed, toSignal } from "@angular/core/rxjs-interop";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import {
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  firstValueFrom,
  map,
  startWith,
  switchMap,
} from "rxjs";

import { IconComponent } from "@bitwarden/angular/vault/components/icon.component";
import { AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { getUserId } from "@bitwarden/common/auth/services/account.service";
import { DeviceType } from "@bitwarden/common/enums";
import { Utils } from "@bitwarden/common/platform/misc/utils";
import { CipherService } from "@bitwarden/common/vault/abstractions/cipher.service";
import { SearchService } from "@bitwarden/common/vault/abstractions/search.service";
import { CipherType } from "@bitwarden/common/vault/enums";
import { SearchTextDebounceInterval } from "@bitwarden/common/vault/services/search.service";
import {
  CipherViewLike,
  CipherViewLikeUtils,
} from "@bitwarden/common/vault/utils/cipher-view-like-utils";
import { BitIconButtonComponent, ButtonModule, SearchModule } from "@bitwarden/components";
import { I18nPipe } from "@bitwarden/ui-common";
import { CopyCipherFieldDirective, CopyCipherFieldService } from "@bitwarden/vault";

@Component({
  selector: "app-quick-search",
  templateUrl: "quick-search.component.html",
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
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IconComponent,
    CopyCipherFieldDirective,
    BitIconButtonComponent,
    ButtonModule,
    SearchModule,
    I18nPipe,
  ],
})
export class QuickSearchComponent implements OnInit {
  private readonly searchHeaderRef = viewChild<ElementRef<HTMLElement>>("searchHeader");

  private readonly accountService = inject(AccountService);
  private readonly cipherService = inject(CipherService);
  private readonly searchService = inject(SearchService);
  private readonly copyCipherFieldService = inject(CopyCipherFieldService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isMac = ipc.platform.deviceType === DeviceType.MacOsDesktop;

  protected readonly searchControl = new FormControl("", { nonNullable: true });
  protected readonly selectedIndex = signal(0);

  private readonly activeUserId$ = this.accountService.activeAccount$.pipe(getUserId);
  private readonly activeUserId = toSignal(this.activeUserId$);

  private readonly searchText$ = this.searchControl.valueChanges.pipe(
    startWith(""),
    debounceTime(SearchTextDebounceInterval),
    distinctUntilChanged(),
  );

  private readonly loginCiphers$ = this.activeUserId$.pipe(
    switchMap((userId) => this.cipherService.cipherListViews$(userId)),
    map((ciphers) =>
      ciphers.filter(
        (c) =>
          CipherViewLikeUtils.getType(c) === CipherType.Login &&
          !CipherViewLikeUtils.isDeleted(c) &&
          !CipherViewLikeUtils.isArchived(c),
      ),
    ),
  );

  protected readonly filteredCiphers = toSignal(
    combineLatest([this.loginCiphers$, this.searchText$]).pipe(
      switchMap(async ([ciphers, query]) => {
        if (!this.activeUserId()) {
          return [];
        }
        const userId = this.activeUserId()!;
        const isSearchable = await this.searchService.isSearchable(userId, query);
        if (isSearchable) {
          return this.searchService.searchCiphers(userId, query, null, ciphers);
        }
        return ciphers;
      }),
      map((ciphers) => ciphers.slice(0, 10)),
    ),
    { initialValue: [] as CipherViewLike[] },
  );

  protected readonly showNoResults = computed(
    () => this.filteredCiphers().length === 0 && this.searchControl.value.length >= 2,
  );

  ngOnInit() {
    void this.accountService.setShowHeader(false);

    this.destroyRef.onDestroy(() => {
      void this.accountService.setShowHeader(true);
    });

    // Reset selected index when search text changes
    this.searchText$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.selectedIndex.set(0));

    // Auto-focus the search input inside bit-search
    setTimeout(() => {
      const input = this.searchHeaderRef()?.nativeElement?.querySelector<HTMLInputElement>("input");
      input?.focus();
    }, 50);
  }

  protected getSubtitle(cipher: CipherViewLike): string {
    return CipherViewLikeUtils.subtitle(cipher) ?? "";
  }

  protected canLaunch(cipher: CipherViewLike): boolean {
    return CipherViewLikeUtils.canLaunch(cipher);
  }

  protected hasPassword(cipher: CipherViewLike): boolean {
    return CipherViewLikeUtils.hasCopyableValue(cipher, "password");
  }

  protected hasUsername(cipher: CipherViewLike): boolean {
    return CipherViewLikeUtils.hasCopyableValue(cipher, "username");
  }

  protected setSelectedIndex(index: number) {
    this.selectedIndex.set(index);
  }

  protected launch(cipher: CipherViewLike) {
    const uri = CipherViewLikeUtils.getLaunchUri(cipher);
    if (uri && Utils.isValidUrl(uri)) {
      this.close();
      window.open(uri, "_blank");
    }
  }

  protected onKeydown(event: KeyboardEvent) {
    const ciphers = this.filteredCiphers();
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
        if (selected && this.hasPassword(selected)) {
          event.preventDefault();
          void this.copyPassword(selected);
        }
        break;
      case "c":
        if (modKey && selected) {
          if (this.hasUsername(selected)) {
            event.preventDefault();
            void this.copyUsername(selected);
          }
        }
        break;
      default: {
        // ⌘/Ctrl + 1-9: jump to and copy password from the Nth item
        const digit = parseInt(event.key, 10);
        if (modKey && digit >= 1 && digit <= 9) {
          const index = digit - 1;
          const target = ciphers[index];
          if (target) {
            event.preventDefault();
            this.selectedIndex.set(index);
            if (this.hasPassword(target)) {
              void this.copyPassword(target);
            }
          }
        }
        break;
      }
    }
  }

  protected async copyPassword(cipher: CipherViewLike) {
    const value = await this.getCipherFieldValue(cipher, "password");
    await this.copyCipherFieldService.copy(value, "password", cipher);
  }

  protected async copyUsername(cipher: CipherViewLike) {
    const value = await this.getCipherFieldValue(cipher, "username");
    await this.copyCipherFieldService.copy(value, "username", cipher);
  }

  private async getCipherFieldValue(cipher: CipherViewLike, field: "password" | "username") {
    if (!CipherViewLikeUtils.isCipherListView(cipher)) {
      return "";
    }
    const userId = await firstValueFrom(this.accountService.activeAccount$.pipe(getUserId));
    const encryptedCipher = await this.cipherService.get(String(cipher.id), userId);
    const decrypted = await this.cipherService.decrypt(encryptedCipher, userId);
    return field === "password"
      ? (decrypted.login?.password ?? "")
      : (decrypted.login?.username ?? "");
  }

  close() {
    ipc.vault.closeQuickSearch();
    void this.router.navigate(["/vault"]);
  }
}
