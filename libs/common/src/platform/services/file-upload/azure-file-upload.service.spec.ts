import { mock, MockProxy } from "jest-mock-extended";

import { ApiService } from "../../../abstractions/api.service";
import { AzureUploadOptions } from "../../abstractions/file-upload/file-upload.service";
import { LogService } from "../../abstractions/log.service";
import { AzureUploadBlockSize } from "../../enums/azure-block-size.enum";
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

function makeEncArrayBuffer(byteLength: number): EncArrayBuffer {
  const buffer = new ArrayBuffer(byteLength);
  return { buffer } as unknown as EncArrayBuffer;
}

function makeUrl(expiryOffset = 3600000): string {
  const expiry = new Date(Date.now() + expiryOffset).toISOString();
  return `https://example.blob.core.windows.net/container/blob?sv=2020-08-04&se=${encodeURIComponent(expiry)}&sig=fake`;
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

  it("calls onProgress incrementally as blocks complete", async () => {
    const data = makeEncArrayBuffer(3 * AzureUploadBlockSize[32]);
    const url = makeUrl();
    const renewalCallback = jest.fn().mockResolvedValue(url);
    const progressValues: number[] = [];

    apiService.nativeFetch.mockResolvedValue(makeOkResponse());

    await service.upload(url, data, renewalCallback, {
      blockSize: AzureUploadBlockSize[32],
      onProgress: (p) => progressValues.push(p),
    } as AzureUploadOptions);

    // 3 block PUTs + 1 block list PUT = 4 calls; onProgress called after each block
    expect(progressValues).toEqual([33, 67, 100]);
  });

  it("throws when numBlocks exceeds MAX_BLOCKS_PER_BLOB", async () => {
    const blockSize = AzureUploadBlockSize[32];
    const maxBlocks = 50000;
    // Use a fake buffer with only byteLength set to avoid allocating real memory.
    const data = {
      buffer: { byteLength: (maxBlocks + 1) * blockSize },
    } as unknown as EncArrayBuffer;
    const url = makeUrl();
    const renewalCallback = jest.fn();

    await expect(service.upload(url, data, renewalCallback, { blockSize })).rejects.toThrow(
      "Cannot upload file, exceeds maximum size",
    );
  });

  it("calls renewalCallback when URL is near expiry", async () => {
    const blockSize = AzureUploadBlockSize[32];
    const data = makeEncArrayBuffer(blockSize);
    const expiredUrl = makeUrl(-5000); // expired 5 seconds ago
    const freshUrl = makeUrl(3600000);
    const renewalCallback = jest.fn().mockResolvedValue(freshUrl);

    apiService.nativeFetch.mockResolvedValue(makeOkResponse());

    await service.upload(expiredUrl, data, renewalCallback, { blockSize });

    expect(renewalCallback).toHaveBeenCalled();
  });

  it("throws on non-201 block PUT response", async () => {
    const blockSize = AzureUploadBlockSize[32];
    const data = makeEncArrayBuffer(blockSize);
    const url = makeUrl();
    const renewalCallback = jest.fn().mockResolvedValue(url);

    apiService.nativeFetch.mockResolvedValue({
      status: 403,
      json: () => Promise.resolve({ error: "Forbidden" }),
    } as Response);

    await expect(service.upload(url, data, renewalCallback, { blockSize })).rejects.toThrow(
      "Unsuccessful block PUT. Received status 403",
    );
  });

  it("throws on non-201 block list PUT response", async () => {
    const data = makeEncArrayBuffer(AzureUploadBlockSize[32]);
    const url = makeUrl();
    const renewalCallback = jest.fn().mockResolvedValue(url);

    apiService.nativeFetch
      .mockResolvedValueOnce(makeOkResponse()) // block PUT succeeds
      .mockResolvedValueOnce({
        status: 500,
        json: () => Promise.resolve({ error: "Internal Server Error" }),
      } as Response); // block list PUT fails

    await expect(
      service.upload(url, data, renewalCallback, { blockSize: AzureUploadBlockSize[32] }),
    ).rejects.toThrow("Unsuccessful block list PUT. Received status 500");
  });
});
