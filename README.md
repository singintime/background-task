# background-task

Non-blocking iterative task, using the event loop to divide the iteration into
smaller batches and schedule them for deferred execution.
Particularly useful for low priority tasks made of simple and relatively fast
operations, but applied over very large datasets.

## Installation

`npm run build`

## Running tests

`npm run test`

## How it works

The constructor accepts a list of input values, a function to process them,
and an object describing the strategy used to divide the task into batches.

The batching strategies are the following:

- `atomic`: each iteration is scheduled as a separate deferred macrotask,
- `iterations`: the batches contain a fixed amount of iterations,
- `milliseconds`: the batches take a fixed amount of time to be processed.

Returning false in the processing function stops the iteration, similarly to
what happens when using a `break` statement in a regular loop.

## Example code

```
import {BackgroundTask} from "@singintime/background-task";

// Generating the input list - a million random numbers ranging from 0 to 100
const input: number[] = [];

for (let i = 0; i < 1000000; i++) {
    input.push(Math.round(Math.random() * 100));
}

// Preparing the output
const output: number[] = [];

// Defining the processing function - copies the input, stops when 42 is found
function process(value: number): boolean {
    output.push(value);
    return value !== 42;
}

// Process 100 values at a time
const options = {budget: "iterations", amount: 100};

// Process in batches of 10 ms each: {budget: "milliseconds", amount: 10}
// Process every iteration as a separate macrotask: {budget: "atomic"}

// Create the non-blocking task
const task = new BackgroundTask(input, process, {budget: "iterations", amount});

// Do something after termination
task.done
    .then(() => console.log('the output is', output))
    .catch(() => console.log('task canceled'));

// The task can be canceled at any time
task.cancel();
```

## API documentation

Available [here](https://singintime.github.io/background-task)
