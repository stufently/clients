import { Injectable } from "@angular/core";

import {
  MagnifyCommand,
  MagnifyCommandRequest,
  MagnifyCommandResponse,
  MagnifyLoginItem,
} from "../../autofill/models/magnify-commands";

@Injectable({
  providedIn: "root",
})
export class CommandService {
  async searchVault(input: string): Promise<MagnifyLoginItem[]> {
    const request: MagnifyCommandRequest = {
      type: MagnifyCommand.SearchVault,
      input,
    };

    const response: MagnifyCommandResponse = await window.ipc.sendCommand(request);

    if (
      response !== undefined &&
      response !== null &&
      response.type === MagnifyCommand.SearchVault
    ) {
      // eslint-disable-next-line no-console
      console.log("search vault results: ", response.results);

      return response.results;
    }

    // eslint-disable-next-line no-console
    console.log("Error in searchVault(): response was not MagnifyCommand.SearchVault as expected");
    return [];
  }

  async getAuthStatus(): Promise<number> {
    const request: MagnifyCommandRequest = {
      type: MagnifyCommand.GetAuthStatus,
    };

    const response: MagnifyCommandResponse = await window.ipc.sendCommand(request);

    if (
      response !== undefined &&
      response !== null &&
      response.type === MagnifyCommand.GetAuthStatus
    ) {
      return response.status;
    }

    // eslint-disable-next-line no-console
    console.log(
      "Error in getAuthStatus(): response was not MagnifyCommand.GetAuthStatus as expected",
    );
    return 0; // Default to LoggedOut
  }

  async copyPassword(id: string): Promise<string> {
    const request: MagnifyCommandRequest = {
      type: MagnifyCommand.CopyPassword,
      id,
    };

    const response: MagnifyCommandResponse = await window.ipc.sendCommand(request);

    if (
      response !== undefined &&
      response !== null &&
      response.type === MagnifyCommand.CopyPassword
    ) {
      // eslint-disable-next-line no-console
      console.log("copy password result: ", response.result);

      return response.result;
    }

    // eslint-disable-next-line no-console
    console.log(
      "Error in copyPassword(): response was not MagnifyCommand.CopyPassword as expected",
    );
    return "";
  }
}
