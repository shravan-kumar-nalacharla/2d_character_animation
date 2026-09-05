import { describe, expect, it } from "vitest";
import { VisemeMapper } from "./VisemeMapper";

describe("VisemeMapper", () => {
  it("shares one visual pack across English, Hindi, and Telugu", () => {
    expect(VisemeMapper.fromUnit("m", "en")).toBe("MBP");
    expect(VisemeMapper.fromUnit("म", "hi")).toBe("MBP");
    expect(VisemeMapper.fromUnit("మ", "te")).toBe("MBP");
    expect(VisemeMapper.fromUnit("శ", "te")).toBe("CHJSH");
  });
});
