import { describe, expect, it } from "vitest";
import { CommandHistory, type Command } from "./CommandHistory";

describe("CommandHistory", () => {
  it("executes, undoes, and redoes a command", () => {
    const history = new CommandHistory<number>();
    const increment: Command<number> = {
      label: "Increment",
      apply: (value) => value + 1,
      revert: (value) => value - 1,
    };
    const changed = history.execute(increment, 4);
    expect(changed).toBe(5);
    expect(history.undo(changed)).toBe(4);
    expect(history.redo(4)).toBe(5);
  });
});
