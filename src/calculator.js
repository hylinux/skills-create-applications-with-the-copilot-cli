// Supports addition (add), subtraction (subtract), multiplication (multiply),
// division (divide), remainder (modulo), and exponentiation (power) of two
// numeric operands, plus square root (sqrt) of one numeric operand.

const usage = `Usage: node src/calculator.js <operation> <number1> <number2>
       node src/calculator.js sqrt <number>
Operations: add, subtract, multiply, divide, modulo, power, sqrt
Example: node src/calculator.js add 2 3`;

function validateOperands(...operands) {
  if (!operands.every(Number.isFinite)) {
    throw new TypeError("Operands must be finite numbers.");
  }
}

function modulo(a, b) {
  validateOperands(a, b);
  if (b === 0) {
    throw new RangeError("Cannot calculate modulo by zero.");
  }
  return a % b;
}

function power(base, exponent) {
  validateOperands(base, exponent);
  const result = base ** exponent;
  if (!Number.isFinite(result)) {
    throw new RangeError("Result is outside the finite numeric range.");
  }
  return result;
}

function squareRoot(n) {
  validateOperands(n);
  if (n < 0) {
    throw new RangeError("Cannot calculate the square root of a negative number.");
  }
  return Math.sqrt(n);
}

function fail(message, showUsage = false) {
  console.error(`Error: ${message}`);
  if (showUsage) {
    console.error(usage);
  }
  process.exitCode = 1;
}

function main(args) {
  const isSquareRoot = args[0] === "sqrt";
  if (args.length !== (isSquareRoot ? 2 : 3)) {
    fail(
      isSquareRoot
        ? "Provide sqrt and exactly one numeric operand."
        : "Provide an operation and exactly two numeric operands.",
      true,
    );
    return;
  }

  const [operation, ...operandArgs] = args;
  if (!["add", "subtract", "multiply", "divide", "modulo", "power", "sqrt"].includes(operation)) {
    fail(`Unsupported operation: ${operation}.`, true);
    return;
  }

  const operands = operandArgs.map(Number);
  if (
    operandArgs.some((operand) => operand.trim() === "") ||
    !operands.every(Number.isFinite)
  ) {
    fail(
      isSquareRoot
        ? "Operand must be a finite number."
        : "Both operands must be finite numbers.",
      true,
    );
    return;
  }

  const [left, right] = operands;
  let result;
  try {
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
      case "modulo":
        result = modulo(left, right);
        break;
      case "power":
        result = power(left, right);
        break;
      case "sqrt":
        result = squareRoot(left);
        break;
    }
  } catch (error) {
    if (!(error instanceof RangeError)) {
      throw error;
    }
    fail(error.message);
    return;
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

module.exports = { main, modulo, power, squareRoot };
