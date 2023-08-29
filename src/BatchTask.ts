interface SingleOptions {
  budget: "atomic";
}

interface ChunkOptions {
  budget: "iterations";
  amount: number;
}

interface IntervalOptions {
  budget: "milliseconds";
  amount: number;
}

type Options = SingleOptions | ChunkOptions | IntervalOptions;

/**
 * Non-blocking iterative task, using the event loop to divide the iteration
 * into smaller batches and schedule them for deferred execution.
 *
 * The constructor accepts a list of input values, a function to process them,
 * and an object describing the strategy used to divide the task into batches.
 *
 * The batching strategies are the following:
 * - atomic: each iteration is scheduled as a separate deferred macrotask,
 * - iterations: the batches contain a fixed amount of iterations,
 * - milliseconds: the batches take a fixed amount of time to be processed.
 *
 * Returning false in the processing function stops the iteration, similarly to
 * what happens when using a `break` statement in a regular loop.
 */
export class BatchTask<T> {
  private canceled = false;
  private completed = false;
  private resolve = () => {};
  private reject = (_: Error) => {};

  /**
   * Promise resolved as soon as the task terminates successfully, and rejected
   * in case the task is canceled from the outside.
   */
  done = new Promise<void>((resolve, reject) => {
    this.resolve = resolve;
    this.reject = reject;
  });

  constructor(
    private values: T[],
    private callback: (value: T) => unknown,
    options: Options
  ) {
    switch (options.budget) {
      case "atomic":
        setTimeout(() => this.processAtomic(0));
        break;
      case "iterations":
        setTimeout(() => this.processIterations(0, options.amount));
        break;
      case "milliseconds":
        setTimeout(() => this.processMilliseconds(0, options.amount));
        break;
    }
  }

  /**
   * Whether or not the task execution was canceled.
   */
  isCanceled() {
    return this.canceled;
  }

  /**
   * Whether or not the task has successfully terminated its execution..
   */
  isCompleted() {
    return this.completed;
  }

  /**
   * Cancels the execution of this background task.
   */
  cancel(): void {
    this.canceled = true;
    this.reject(new Error("canceled"));
  }

  /**
   * Applies the processing function to a single value, and resolves the `done`
   * promise when the task terminates.
   */
  private processValue(index: number): boolean {
    const { values, callback } = this;

    if (index >= values.length || callback(values[index]) === false) {
      this.completed = true;
      this.resolve();
      return false;
    }

    return true;
  }

  /**
   * Applies the processing function to the input values.
   * Each iteration is scheduled as a separate macrotask.
   */
  private processAtomic(startIndex: number): void {
    if (this.canceled || !this.processValue(startIndex)) {
      return;
    }

    setTimeout(() => {
      this.processAtomic(startIndex + 1);
    });
  }

  /**
   * Applies the processing function to the input values.
   * The task is divided into batches containing a fixed amount of iterations.
   */
  private processIterations(startIndex: number, amount: number): void {
    if (this.canceled) {
      return;
    }

    for (let i = 0; i < amount; i++) {
      if (!this.processValue(startIndex + i)) {
        return;
      }
    }

    setTimeout(() => {
      this.processIterations(startIndex + amount, amount);
    });
  }

  /**
   * Applies the operator function to the input values.
   * The task is divided into batches processed within a fixed amount of time.
   */
  private processMilliseconds(startIndex: number, amount: number): void {
    if (this.canceled) {
      return;
    }

    const startTime = performance.now();
    let index = startIndex;

    while (performance.now() - startTime < amount) {
      if (!this.processValue(index)) {
        return;
      }

      index += 1;
    }

    setTimeout(() => {
      this.processMilliseconds(index, amount);
    });
  }
}
