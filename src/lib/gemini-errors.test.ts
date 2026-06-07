import { describe, expect, it } from "vitest";
import { GeminiSpendCapError, classifyGeminiError } from "./gemini-errors";

describe("classifyGeminiError", () => {
  it("flags the monthly spending cap as spend_cap", () => {
    const err = {
      error: {
        code: 429,
        status: "RESOURCE_EXHAUSTED",
        message: "Your billing account has exceeded its monthly spending cap",
      },
    };
    expect(classifyGeminiError(err)).toBe("spend_cap");
  });

  it("flags a bare 429 / quota-exhaustion message as rate_limit, not spend_cap", () => {
    const quotaExhausted = { status: "RESOURCE_EXHAUSTED", message: "Resource has been exhausted (e.g. check quota)." };
    const rate = { code: 429, message: "Too many requests, please retry." };
    expect(classifyGeminiError(quotaExhausted)).toBe("rate_limit");
    expect(classifyGeminiError(rate)).toBe("rate_limit");
  });

  it("reads nested SDK error shapes and plain Error messages", () => {
    expect(
      classifyGeminiError(new Error("429 RESOURCE_EXHAUSTED: monthly spending cap exceeded"))
    ).toBe("spend_cap");
  });

  it("returns other for unrelated errors", () => {
    expect(classifyGeminiError(new Error("ECONNRESET"))).toBe("other");
    expect(classifyGeminiError(null)).toBe("other");
  });

  it("GeminiSpendCapError is named and instanceof Error", () => {
    const e = new GeminiSpendCapError("cap");
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe("GeminiSpendCapError");
  });
});
