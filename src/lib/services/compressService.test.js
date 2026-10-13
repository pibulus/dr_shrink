import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { gunzipSync, unzipSync } from "fflate";

const engine = vi.hoisted(() => ({
  on: vi.fn(),
  load: vi.fn().mockResolvedValue(true),
  writeFile: vi.fn().mockResolvedValue(undefined),
  exec: vi.fn().mockResolvedValue(0),
  readFile: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
  deleteFile: vi.fn().mockResolvedValue(undefined),
  terminate: vi.fn(),
}));
vi.mock("@ffmpeg/ffmpeg", () => ({ FFmpeg: vi.fn(() => engine) }));
vi.mock("@ffmpeg/util", () => ({
  fetchFile: async (file) => new Uint8Array(await file.arrayBuffer()),
}));

let compress;
beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  ({ compress } = await import("./compressService.js"));
});
afterEach(() => vi.useRealTimers());

describe("compression preserves usable files", () => {
  it("refuses multi-frame GIFs without optional control extensions", async () => {
    const header = [
      71, 73, 70, 56, 57, 97, 1, 0, 1, 0, 128, 0, 0, 0, 0, 0, 255, 255, 255,
    ];
    const frame = [44, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 2, 68, 1, 0];
    const file = new File(
      [new Uint8Array([...header, ...frame, ...frame, 59])],
      "animated.gif",
      { type: "image/gif" },
    );
    await expect(compress([file])).rejects.toThrow("is animated");
  });

  it("refuses animated PNGs before Canvas can flatten them", async () => {
    const bytes = new Uint8Array(28);
    bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
    const view = new DataView(bytes.buffer);
    view.setUint32(8, 8);
    view.setUint32(12, 0x6163544c); // acTL
    view.setUint32(16, 2); // frames
    await expect(
      compress([new File([bytes], "animated.png", { type: "image/png" })]),
    ).rejects.toThrow("is animated");
  });

  it("keeps incompressible small files instead of making them bigger", async () => {
    const file = new File(["abc"], "tiny.txt", { type: "text/plain" });
    const [r] = await compress([file]);
    expect(r.blob).toBe(file);
    expect(r.name).toBe("tiny.txt");
    expect(r.saved).toBe(0);
  });

  it("gzip round-trips text byte for byte", async () => {
    const original = "the doctor will see you now\n".repeat(100);
    const [r] = await compress([new File([original], "notes.txt")]);
    expect(r.name).toBe("notes.txt.gz");
    expect(
      new TextDecoder().decode(
        gunzipSync(new Uint8Array(await r.blob.arrayBuffer())),
      ),
    ).toBe(original);
  });

  it("never overwrites an existing ZIP entry when renaming a duplicate", async () => {
    const files = [
      new File(["first"], "same.bin"),
      new File(["existing"], "2_same.bin"),
      new File(["second"], "same.bin"),
      new File(["existing prefix"], "1_same.bin"),
    ];
    const [r] = await compress(files);
    const entries = unzipSync(new Uint8Array(await r.blob.arrayBuffer()));
    expect(Object.keys(entries)).toHaveLength(files.length);
    expect(
      Object.values(entries)
        .map((bytes) => new TextDecoder().decode(bytes))
        .sort(),
    ).toEqual(["first", "existing", "second", "existing prefix"].sort());
  });

  it("preserves folder paths and document formats inside ZIPs", async () => {
    const html = "<p>keep my markup</p>".repeat(100);
    const word = new Uint8Array([80, 75, 3, 4, 99]);
    const file = new File([html], "page.html", { type: "text/html" });
    Object.defineProperty(file, "relativePath", {
      value: "/project/../pages/page.html",
    });
    const [r] = await compress([file, new File([word], "letter.docx")]);
    const entries = unzipSync(new Uint8Array(await r.blob.arrayBuffer()));
    expect(Object.keys(entries)).toEqual([
      "project/pages/page.html",
      "letter.docx",
    ]);
    expect(new TextDecoder().decode(entries["project/pages/page.html"])).toBe(
      html,
    );
    expect(entries["letter.docx"]).toEqual(word);
  });
});

describe("self-hosted audio engine", () => {
  it("loads same-origin ESM assets, clears its timer and cleans up virtual files", async () => {
    vi.useFakeTimers();
    const [r] = await compress([
      new File([new Uint8Array(100)], "my recording.wav", {
        type: "audio/wav",
      }),
    ]);
    expect(engine.load).toHaveBeenCalledWith({
      coreURL: "/wasm/ffmpeg-core.js?v=0.12.10-esm",
      wasmURL: "/wasm/ffmpeg-core.wasm?v=0.12.10-esm",
    });
    expect(r.name).toBe("my recording.min.mp3");
    expect(engine.deleteFile).toHaveBeenCalledWith("in_my_recording.wav");
    expect(engine.deleteFile).toHaveBeenCalledWith("output.mp3");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("surfaces failed encoding and still cleans up its virtual files", async () => {
    engine.exec.mockResolvedValueOnce(1);
    await expect(
      compress([new File([new Uint8Array(100)], "broken.wav")]),
    ).rejects.toThrow("Couldn't re-encode");
    expect(engine.deleteFile).toHaveBeenCalledTimes(2);
  });

  it("terminates an engine that cannot load and allows another attempt", async () => {
    vi.useFakeTimers();
    engine.load.mockImplementationOnce(() => new Promise(() => {}));
    const attempt = compress([new File([new Uint8Array(100)], "sound.wav")]);
    const failed = expect(attempt).rejects.toThrow("engine would not start");
    await vi.waitFor(() => expect(engine.load).toHaveBeenCalledTimes(1));
    await vi.advanceTimersByTimeAsync(45000);
    await failed;
    expect(engine.terminate).toHaveBeenCalledTimes(1);
    const [r] = await compress([new File([new Uint8Array(100)], "sound.wav")]);
    expect(r.name).toBe("sound.min.mp3");
    expect(engine.load).toHaveBeenCalledTimes(2);
  });
});
