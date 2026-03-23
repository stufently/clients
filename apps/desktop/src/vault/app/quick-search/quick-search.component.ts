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
import { combineLatest, debounceTime, distinctUntilChanged, map, startWith, switchMap } from "rxjs";

import { IconComponent } from "@bitwarden/angular/vault/components/icon.component";
import { AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { getUserId } from "@bitwarden/common/auth/services/account.service";
import { Utils } from "@bitwarden/common/platform/misc/utils";
import { CipherService } from "@bitwarden/common/vault/abstractions/cipher.service";
import { SearchService } from "@bitwarden/common/vault/abstractions/search.service";
import { CipherType } from "@bitwarden/common/vault/enums";
import { SearchTextDebounceInterval } from "@bitwarden/common/vault/services/search.service";
import {
  CipherViewLike,
  CipherViewLikeUtils,
} from "@bitwarden/common/vault/utils/cipher-view-like-utils";
import { BitIconButtonComponent, ButtonModule } from "@bitwarden/components";
import { I18nPipe } from "@bitwarden/ui-common";
import { CopyCipherFieldDirective } from "@bitwarden/vault";

@Component({
  selector: "app-quick-search",
  templateUrl: "quick-search.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IconComponent,
    CopyCipherFieldDirective,
    BitIconButtonComponent,
    ButtonModule,
    I18nPipe,
  ],
})
export class QuickSearchComponent implements OnInit {
  private readonly searchInputRef = viewChild<ElementRef<HTMLInputElement>>("searchInput");

  private readonly accountService = inject(AccountService);
  private readonly cipherService = inject(CipherService);
  private readonly searchService = inject(SearchService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

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
    // Reset selected index when search text changes
    this.searchText$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.selectedIndex.set(0));

    // Auto-focus the search input
    setTimeout(() => this.searchInputRef()?.nativeElement?.focus(), 50);
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
    }
  }

  close() {
    ipc.vault.closeQuickSearch();
    void this.router.navigate(["/vault"]);
  }
}
