// Supports addition (add), subtraction (subtract), multiplication (multiply),
// and division (divide) of two numeric operands.

const usage = `Usage: node src/calculator.js <operation> <number1> <number2>
Operations: add, subtract, multiply, divide
Example: node src/calculator.js add 2 3`;

function fail(message, showUsage = false) {
  console.error(`Error: ${message}`);
  if (showUsage) {
    console.error(usage);
  }
  process.exitCode = 1;
}

function main(args) {
  if (args.length !== 3) {
    fail("Provide an operation and exactly two numeric operands.", true);
    return;
  }

  const [operation, first, second] = args;
  if (!["add", "subtract", "multiply", "divide"].includes(operation)) {
    fail(`Unsupported operation: ${operation}.`, true);
    return;
  }

  const left = Number(first);
  const right = Number(second);
  if (
    first.trim() === "" ||
    second.trim() === "" ||
    !Number.isFinite(left) ||
    !Number.isFinite(right)
  ) {
    fail("Both operands must be finite numbers.", true);
    return;
  }

  let result;
  switch (operation) {
    case "add":
      result = left + right;
      break;
    case "subtract":
      result = left - right;
      break;
    case "multiply":
      result = left * right;
      break;
    case "divide":
      if (right === 0) {
        fail("Cannot divide by zero.");
        return;
      }
      result = left / right;
      break;
  }

  if (!Number.isFinite(result)) {
    fail("Result is outside the finite numeric range.");
    return;
  }

  console.log(result);
}

if (require.main === module) {
  main(process.argv.slice(2));
}

module.exports = { main };
