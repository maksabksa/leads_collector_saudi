import { describe, it, expect } from "vitest";

describe("Bright Data Connection", () => {
  it("should have BRIGHT_DATA_WS_ENDPOINT configured", () => {
    const endpoint = process.env.BRIGHT_DATA_WS_ENDPOINT;
    expect(endpoint).toBeDefined();
    expect(endpoint).toContain("brd.superproxy.io");
    expect(endpoint).toContain("wss://");
  });

  it("should have valid endpoint format", () => {
    const endpoint = process.env.BRIGHT_DATA_WS_ENDPOINT || "";
    // يجب أن يكون WebSocket URL صحيح
    expect(endpoint.startsWith("wss://")).toBe(true);
    expect(endpoint).toContain("@brd.superproxy.io:9222");
  });
});
