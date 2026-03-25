import { Injectable } from "@angular/core";
import { firstValueFrom } from "rxjs";

import { AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { PlatformUtilsService } from "@bitwarden/common/platform/abstractions/platform-utils.service";
import { UserId } from "@bitwarden/common/types/guid";
import { CipherService } from "@bitwarden/common/vault/abstractions/cipher.service";
import { SearchService } from "@bitwarden/common/vault/abstractions/search.service";
import { CipherView } from "@bitwarden/common/vault/models/view/cipher.view";
import { LogService } from "@bitwarden/logging";

import {
  CopyVaultItemFieldInput,
  MagnifyCommand,
  MagnifyRequest,
  MagnifyResponse,
  MagnifyVaultItemResult,
  VaultItemField,
  VaultSearchInput,
} from "../models/magnify-command";

const MAX_SEARCH_RESULTS = 5;

/**
 * Angular service in the Bitwarden renderer process that handles
 * Magnify commands relayed from the Main process.
 *
 * This service owns all vault operations for Magnify — decrypted data
 * never leaves this process. Clipboard writes happen here, not in Magnify.
 */
@Injectable()
export class MagnifyCommandHandlerService {
  constructor(
    private searchService: SearchService,
    private cipherService: CipherService,
    private accountService: AccountService,
    private platformUtilsService: PlatformUtilsService,
    private logService: LogService,
  ) {}

  async init() {
    ipc.autofill.onMagnifyCommandRequest((request: MagnifyRequest) => {
      this.handleCommand(request).catch((err) => {
        this.logService.error("[MagnifyCommandHandler] Error handling command", err);
        this.sendResponse({
          command: request.command,
          correlationId: request.correlationId,
          results: [],
          error: "Internal error processing command",
        });
      });
    });
  }

  private async handleCommand(request: MagnifyRequest): Promise<void> {
    switch (request.command) {
      case MagnifyCommand.VaultSearch:
        await this.handleVaultSearch(request.input as VaultSearchInput, request);
        break;
      case MagnifyCommand.CopyVaultItemField:
        await this.handleCopyVaultItemField(request.input as CopyVaultItemFieldInput, request);
        break;
      default:
        this.sendResponse({
          command: request.command,
          correlationId: request.correlationId,
          results: [],
          error: `Unknown command: ${request.command}`,
        });
    }
  }

  private async handleVaultSearch(input: VaultSearchInput, request: MagnifyRequest): Promise<void> {
    const userId = await this.getActiveUserId();
    if (userId == null) {
      this.sendResponse({
        command: request.command,
        correlationId: request.correlationId,
        results: [],
        error: "No active user",
      });
      return;
    }

    const allCiphers = await this.cipherService.getAllDecrypted(userId);

    const filter =
      input.cipherTypes?.length > 0 ? (c: CipherView) => input.cipherTypes.includes(c.type) : null;

    const matched = await this.searchService.searchCiphers(userId, input.query, filter, allCiphers);

    const results: MagnifyVaultItemResult[] = matched.slice(0, MAX_SEARCH_RESULTS).map((c) => ({
      id: c.id,
      name: c.name,
      username: c.login?.username,
      uri: c.login?.uris?.[0]?.uri,
    }));

    this.sendResponse({
      command: request.command,
      correlationId: request.correlationId,
      results,
    });
  }

  private async handleCopyVaultItemField(
    input: CopyVaultItemFieldInput,
    request: MagnifyRequest,
  ): Promise<void> {
    const userId = await this.getActiveUserId();
    if (userId == null) {
      this.sendResponse({
        command: request.command,
        correlationId: request.correlationId,
        results: [],
        error: "No active user",
      });
      return;
    }

    const allCiphers = await this.cipherService.getAllDecrypted(userId);
    const cipher = allCiphers.find((c) => c.id === input.vaultItemId);

    if (cipher == null) {
      this.sendResponse({
        command: request.command,
        correlationId: request.correlationId,
        results: [],
        error: "Vault item not found",
      });
      return;
    }

    const fieldValue = this.resolveField(cipher, input.field);

    if (fieldValue == null) {
      this.sendResponse({
        command: request.command,
        correlationId: request.correlationId,
        results: [],
        error: `Field "${input.field}" is not available on this vault item`,
      });
      return;
    }

    // Copy to clipboard from within the Bitwarden renderer.
    // The decrypted value never crosses IPC to the Magnify window.
    this.platformUtilsService.copyToClipboard(fieldValue);

    this.sendResponse({
      command: request.command,
      correlationId: request.correlationId,
      results: [{ id: cipher.id, name: cipher.name }],
    });
  }

  private resolveField(cipher: CipherView, field: VaultItemField): string | undefined {
    switch (field) {
      case VaultItemField.Password:
        return cipher.login?.password;
      case VaultItemField.Username:
        return cipher.login?.username;
      case VaultItemField.Totp:
        return cipher.login?.totp;
      case VaultItemField.CardNumber:
        return cipher.card?.number;
      case VaultItemField.CardCode:
        return cipher.card?.code;
      default:
        return undefined;
    }
  }

  private async getActiveUserId(): Promise<UserId | null> {
    const account = await firstValueFrom(this.accountService.activeAccount$);
    return account?.id ?? null;
  }

  private sendResponse(response: MagnifyResponse): void {
    ipc.autofill.sendMagnifyCommandResponse(response);
  }
}
