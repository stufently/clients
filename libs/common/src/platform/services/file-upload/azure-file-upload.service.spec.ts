import { mock, MockProxy } from "jest-mock-extended";

import { ApiService } from "../../../abstractions/api.service";
import { LogService } from "../../abstractions/log.service";
import { EncArrayBuffer } from "../../models/domain/enc-array-buffer";

import { AzureFileUploadService } from "./azure-file-upload.service";

// jsdom doesn't ship Request/Headers; stub them for these unit tests
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
  (globalThis as any).Headers = FakeHeaders;
  (globalThis as any).Request = FakeRequest;
});

afterAll(() => {
  delete (globalThis as any).Headers;
  delete (globalThis as any).Request;
});

function makeEncArrayBuffer(byteLength: number): EncArrayBuffer {
  const buffer = new ArrayBuffer(byteLength);
  return { buffer } as EncArrayBuffer;
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
    const blockSize = 1 * 1024 * 1024; // 1 MiB
    const data = makeEncArrayBuffer(3 * blockSize); // 3 blocks
    const url = makeUrl();
    const renewalCallback = jest.fn().mockResolvedValue(url);
    const progressValues: number[] = [];

    apiService.nativeFetch.mockResolvedValue(makeOkResponse());

    await service.upload(url, data, renewalCallback, {
      blockSize,
      onProgress: (p) => progressValues.push(p),
    });

    // 3 block PUTs + 1 block list PUT = 4 calls; onProgress called after each block
    expect(progressValues).toEqual([33, 67, 100]);
  });

  it("clamps blockSize to MIN_BLOCK_SIZE when given a smaller value", async () => {
    const tinyBlockSize = 100; // Below 1 MiB minimum
    const minBlockSize = 1 * 1024 * 1024;
    const data = makeEncArrayBuffer(minBlockSize); // exactly 1 block at min size
    const url = makeUrl();
    const renewalCallback = jest.fn().mockResolvedValue(url);

    apiService.nativeFetch.mockResolvedValue(makeOkResponse());

    await service.upload(url, data, renewalCallback, { blockSize: tinyBlockSize });

    // 1 block PUT + 1 block list PUT = 2 calls
    expect(apiService.nativeFetch).toHaveBeenCalledTimes(2);
  });

  it("clamps blockSize to MAX_BLOCK_SIZE when given a larger value", async () => {
    const hugeBlockSize = 9999 * 1024 * 1024; // Exceeds 4000 MiB max
    const maxBlockSize = 4000 * 1024 * 1024;
    const data = makeEncArrayBuffer(maxBlockSize); // 1 block at max size
    const url = makeUrl();
    const renewalCallback = jest.fn().mockResolvedValue(url);

    apiService.nativeFetch.mockResolvedValue(makeOkResponse());

    await service.upload(url, data, renewalCallback, { blockSize: hugeBlockSize });

    // 1 block PUT + 1 block list PUT = 2 calls
    expect(apiService.nativeFetch).toHaveBeenCalledTimes(2);
  });

  it("throws when numBlocks exceeds MAX_BLOCKS_PER_BLOB", async () => {
    const blockSize = 1 * 1024 * 1024; // 1 MiB (min)
    const maxBlocks = 50000;
    const data = makeEncArrayBuffer((maxBlocks + 1) * blockSize); // 50001 blocks
    const url = makeUrl();
    const renewalCallback = jest.fn();

    await expect(service.upload(url, data, renewalCallback, { blockSize })).rejects.toThrow(
      "Cannot upload file, exceeds maximum size",
    );
  });

  it("calls renewalCallback when URL is near expiry", async () => {
    const blockSize = 1 * 1024 * 1024; // 1 MiB
    const data = makeEncArrayBuffer(blockSize);
    const expiredUrl = makeUrl(-5000); // expired 5 seconds ago
    const freshUrl = makeUrl(3600000);
    const renewalCallback = jest.fn().mockResolvedValue(freshUrl);

    apiService.nativeFetch.mockResolvedValue(makeOkResponse());

    await service.upload(expiredUrl, data, renewalCallback, { blockSize });

    expect(renewalCallback).toHaveBeenCalled();
  });

  it("throws on non-201 block PUT response", async () => {
    const blockSize = 1 * 1024 * 1024; // 1 MiB
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
    const blockSize = 1 * 1024 * 1024; // 1 MiB
    const data = makeEncArrayBuffer(blockSize);
    const url = makeUrl();
    const renewalCallback = jest.fn().mockResolvedValue(url);

    apiService.nativeFetch
      .mockResolvedValueOnce(makeOkResponse()) // block PUT succeeds
      .mockResolvedValueOnce({
        status: 500,
        json: () => Promise.resolve({ error: "Internal Server Error" }),
      } as Response); // block list PUT fails

    await expect(service.upload(url, data, renewalCallback, { blockSize })).rejects.toThrow(
      "Unsuccessful block list PUT. Received status 500",
    );
  });
});
