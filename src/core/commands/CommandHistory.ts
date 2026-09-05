export interface Command<T> {
  label: string;
  apply(state: T): T;
  revert(state: T): T;
}

export class CommandHistory<T> {
  private past: Command<T>[] = [];
  private future: Command<T>[] = [];

  execute(command: Command<T>, state: T): T {
    this.past.push(command);
    this.future = [];
    return command.apply(state);
  }

  recordApplied(command: Command<T>): void {
    this.past.push(command);
    this.future = [];
  }

  undo(state: T): T {
    const command = this.past.pop();
    if (!command) return state;
    this.future.push(command);
    return command.revert(state);
  }

  redo(state: T): T {
    const command = this.future.pop();
    if (!command) return state;
    this.past.push(command);
    return command.apply(state);
  }

  clear(): void {
    this.past = [];
    this.future = [];
  }

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }
}
