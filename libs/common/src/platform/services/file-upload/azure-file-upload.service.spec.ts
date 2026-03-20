import { mock, MockProxy } from "jest-mock-extended";

import { ApiService } from "../../../abstractions/api.service";
import { UploadOptions } from "../../abstractions/file-upload/file-upload.service";
import { LogService } from "../../abstractions/log.service";
import { EncArrayBuffer } from "../../models/domain/enc-array-buffer";

import { AzureFileUploadService } from "./azure-file-upload.service";

class FakeHeaders {
  private map: Record<string, string> = {};
  constructor(init?: Record<string, string>) {
    if (init) {
      Object.assign(this.map, init);
    }
  }
  get(name: string) {
    return this.map[name] ?? null;
  }
}

class FakeRequest {
  url: string;
  options: unknown;
  constructor(url: string, options?: unknown) {
    this.url = url;
    this.options = options;
  }
}

beforeAll(() => {
  // jsdom doesn't ship Request/Headers
  (globalThis as any).Headers = FakeHeaders;
  (globalThis as any).Request = FakeRequest;
});

afterAll(() => {
  delete (globalThis as any).Headers;
  delete (globalThis as any).Request;
});

function makeUrl(expiryOffset = 3600000): string {
  const expiry = new Date(Date.now() + expiryOffset).toISOString();
  return `https://example.blob.core.windows.net/container/blob?sv=2020-08-04&se=${encodeURIComponent(expiry)}&sig=fake`;
}

const BLOCK_SIZE = 4000 * 1024 * 1024; // 4000 MiB, matches the hardcoded value in the service

/**
 * Creates a fake EncArrayBuffer large enough to trigger block upload (> 256 MiB) without
 * allocating real memory. `slice` returns an empty ArrayBuffer since network calls are mocked.
 */
function makeFakeBlockUploadData(numBlocks = 1): EncArrayBuffer {
  return {
    buffer: {
      byteLength: numBlocks * BLOCK_SIZE,
      slice: () => new ArrayBuffer(0),
    },
  } as unknown as EncArrayBuffer;
}

describe("AzureFileUploadService", () => {
  let logService: MockProxy<LogService>;
  let apiService: MockProxy<ApiService>;
  let service: AzureFileUploadService;

  const makeOkResponse = () => ({ status: 201 }) as Response;

  beforeEach(() => {
    logService = mock<LogService>();
    apiService = mock<ApiService>();
    service = new AzureFileUploadService(logService, apiService);
  });

  it("calls onProgress for each block via XMLHttpRequest", async () => {
    const data = makeFakeBlockUploadData(3);
    const url = makeUrl();
    const renewalCallback = jest.fn().mockResolvedValue(url);
    const progressValues: number[] = [];

    // In browser mode, each block PUT uses nativeXMLHttpRequest which calls onProgress
    apiService.nativeXMLHttpRequest.mockImplementation(
      async (_req: Request, onProgress: (percentage: number) => void) => {
        onProgress(100);
        return { status: 201 } as Response;
      },
    );
    apiService.nativeFetch.mockResolvedValue(makeOkResponse()); // block list PUT

    await service.upload(url, data, renewalCallback, {
      onProgress: (p) => progressValues.push(p),
    } as UploadOptions);

    // 3 block PUTs via XHR (each calls onProgress(100)) + 1 block list PUT via nativeFetch
    expect(progressValues).toEqual([100, 100, 100]);
  });

  it("throws when numBlocks exceeds MAX_BLOCKS_PER_BLOB", async () => {
    const maxBlocks = 50000;
    // Use a fake buffer with only byteLength set to avoid allocating real memory.
    const data = {
      buffer: { byteLength: (maxBlocks + 1) * BLOCK_SIZE },
    } as unknown as EncArrayBuffer;
    const url = makeUrl();
    const renewalCallback = jest.fn();

    await expect(service.upload(url, data, renewalCallback)).rejects.toThrow(
      "Cannot upload file, exceeds maximum size",
    );
  });

  it("calls renewalCallback when URL is near expiry", async () => {
    const data = makeFakeBlockUploadData();
    const expiredUrl = makeUrl(-5000); // expired 5 seconds ago
    const freshUrl = makeUrl(3600000);
    const renewalCallback = jest.fn().mockResolvedValue(freshUrl);

    apiService.nativeFetch.mockResolvedValue(makeOkResponse());

    await service.upload(expiredUrl, data, renewalCallback);

    expect(renewalCallback).toHaveBeenCalled();
  });

  it("throws on non-201 block PUT response", async () => {
    const data = makeFakeBlockUploadData();
    const url = makeUrl();
    const renewalCallback = jest.fn().mockResolvedValue(url);

    apiService.nativeFetch.mockResolvedValue({
      status: 403,
      json: () => Promise.resolve({ error: "Forbidden" }),
    } as Response);

    await expect(service.upload(url, data, renewalCallback)).rejects.toThrow(
      "Unsuccessful block PUT. Received status 403",
    );
  });

  it("throws on non-201 block list PUT response", async () => {
    const data = makeFakeBlockUploadData();
    const url = makeUrl();
    const renewalCallback = jest.fn().mockResolvedValue(url);

    apiService.nativeFetch
      .mockResolvedValueOnce(makeOkResponse()) // block PUT succeeds
      .mockResolvedValueOnce({
        status: 500,
        json: () => Promise.resolve({ error: "Internal Server Error" }),
      } as Response); // block list PUT fails

    await expect(service.upload(url, data, renewalCallback)).rejects.toThrow(
      "Unsuccessful block list PUT. Received status 500",
    );
  });
});
