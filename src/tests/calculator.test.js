const { spawnSync } = require("node:child_process");
const path = require("node:path");
const { main, modulo, power, squareRoot } = require("../calculator");

describe("modulo", () => {
  test.each([
    [5, 2, 1],
    [10, 3, 1],
    [6, 3, 0],
    [-10, 3, -1],
    [10, -3, 1],
    [5.5, 2, 1.5],
    [0, 3, 0],
  ])("modulo(%s, %s) returns %s", (a, b, expected) => {
    expect(modulo(a, b)).toBe(expected);
  });

  test.each([0, -0])("rejects a zero divisor %s", (divisor) => {
    expect(() => modulo(10, divisor)).toThrow("Cannot calculate modulo by zero.");
  });
});

describe("power", () => {
  test.each([
    [2, 3, 8],
    [-2, 2, 4],
    [-2, 3, -8],
    [2, -2, 0.25],
    [9, 0.5, 3],
    [2, 0, 1],
    [0, 2, 0],
  ])("power(%s, %s) returns %s", (base, exponent, expected) => {
    expect(power(base, exponent)).toBe(expected);
  });

  test.each([
    [1e308, 2],
    [0, -1],
    [-1, 0.5],
  ])("rejects non-finite power(%s, %s)", (base, exponent) => {
    expect(() => power(base, exponent)).toThrow(
      "Result is outside the finite numeric range.",
    );
  });
});

describe("squareRoot", () => {
  test.each([
    [16, 4],
    [25, 5],
    [0, 0],
    [0.25, 0.5],
    [2, Math.SQRT2],
  ])("squareRoot(%s) returns %s", (n, expected) => {
    expect(squareRoot(n)).toBeCloseTo(expected, 12);
  });

  test.each([-16, -1, -0.25])("rejects negative input %s", (n) => {
    expect(() => squareRoot(n)).toThrow(
      "Cannot calculate the square root of a negative number.",
    );
  });
});

describe.each([
  ["modulo", (value) => modulo(value, 2)],
  ["modulo divisor", (value) => modulo(2, value)],
  ["power", (value) => power(value, 2)],
  ["power exponent", (value) => power(2, value)],
  ["squareRoot", squareRoot],
])("%s operand validation", (_name, calculate) => {
  test.each([NaN, Infinity, -Infinity, "2", undefined])(
    "rejects invalid operand %j",
    (value) => {
      expect(() => calculate(value)).toThrow("Operands must be finite numbers.");
    },
  );
});

describe("calculator", () => {
  let log;
  let error;
  let originalExitCode;

  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = 0;
    log = vi.spyOn(console, "log").mockImplementation(() => {});
    error = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
    vi.restoreAllMocks();
  });

  describe.each([
    ["add", [
      ["2", "3", 5],
      ["-2", "-3", -5],
      ["-2", "3", 1],
      ["0", "7", 7],
      ["1.25", "2.5", 3.75],
      ["0.1", "0.2", 0.3],
    ]],
    ["subtract", [
      ["10", "4", 6],
      ["4", "10", -6],
      ["-10", "-4", -6],
      ["5", "5", 0],
      ["0", "4", -4],
      ["-2.5", "1.25", -3.75],
    ]],
    ["multiply", [
      ["45", "2", 90],
      ["-4", "3", -12],
      ["-4", "-3", 12],
      ["7", "0", 0],
      ["7", "1", 7],
      ["-2.5", "1.2", -3],
    ]],
    ["divide", [
      ["20", "5", 4],
      ["-20", "5", -4],
      ["-20", "-5", 4],
      ["0", "5", 0],
      ["7.5", "2.5", 3],
      ["1", "3", 1 / 3],
    ]],
    ["modulo", [
      ["5", "2", 1],
      ["10", "3", 1],
      ["-10", "3", -1],
      ["5.5", "2", 1.5],
    ]],
    ["power", [
      ["2", "3", 8],
      ["2", "-2", 0.25],
      ["9", "0.5", 3],
    ]],
  ])("%s", (operation, cases) => {
    test.each(cases)("%s and %s produces %s", (left, right, expected) => {
      main([operation, left, right]);

      expect(log).toHaveBeenCalledTimes(1);
      expect(log.mock.calls[0][0]).toBeCloseTo(expected, 12);
      expect(error).not.toHaveBeenCalled();
      expect(process.exitCode).toBe(0);
    });
  });

  function expectFailure(message, withUsage = false) {
    expect(log).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith(`Error: ${message}`);
    expect(process.exitCode).toBe(1);
    expect(error).toHaveBeenCalledTimes(withUsage ? 2 : 1);
    if (withUsage) {
      expect(error).toHaveBeenCalledWith(
        expect.stringContaining("Usage: node src/calculator.js"),
      );
    }
  }

  test.each([
    [],
    ["add"],
    ["add", "2"],
    ["add", "2", "3", "4"],
  ].map((args) => [args]))("rejects incorrect argument count: %j", (args) => {
    main(args);
    expectFailure("Provide an operation and exactly two numeric operands.", true);
  });

  test.each(["log", "+", "ADD"])("rejects unsupported operation %s", (operation) => {
    main([operation, "2", "3"]);
    expectFailure(`Unsupported operation: ${operation}.`, true);
  });

  describe.each([0, 1])("operand at position %i", (position) => {
    test.each(["abc", "3abc", "", "   ", "NaN", "Infinity", "-Infinity", "1e309"])(
      "rejects invalid or non-finite value %j",
      (value) => {
        const operands = ["2", "3"];
        operands[position] = value;
        main(["add", ...operands]);
        expectFailure("Both operands must be finite numbers.", true);
      },
    );
  });

  test.each([
    ["5", "0"],
    ["5", "-0"],
    ["0", "0"],
  ])("rejects division of %s by %s", (left, right) => {
    main(["divide", left, right]);
    expectFailure("Cannot divide by zero.");
  });

  test.each([["16", 4], ["25", 5], ["0", 0], ["0.25", 0.5]])(
    "calculates sqrt %s as %s",
    (value, expected) => {
      main(["sqrt", value]);
      expect(log).toHaveBeenCalledExactlyOnceWith(expected);
      expect(error).not.toHaveBeenCalled();
      expect(process.exitCode).toBe(0);
    },
  );

  test.each([
    ["sqrt"],
    ["sqrt", "25", "5"],
  ].map((args) => [args]))("rejects incorrect sqrt argument count: %j", (args) => {
    main(args);
    expectFailure("Provide sqrt and exactly one numeric operand.", true);
  });

  test.each(["abc", "", "Infinity"])("rejects invalid sqrt operand %j", (value) => {
    main(["sqrt", value]);
    expectFailure("Operand must be a finite number.", true);
  });

  test.each(["modulo", "power"])("requires two operands for %s", (operation) => {
    main([operation, "2"]);
    expectFailure("Provide an operation and exactly two numeric operands.", true);
  });

  test.each([
    [["modulo", "10", "0"], "Cannot calculate modulo by zero."],
    [["modulo", "10", "-0"], "Cannot calculate modulo by zero."],
    [["sqrt", "-1"], "Cannot calculate the square root of a negative number."],
  ])("reports a domain error for %j", (args, message) => {
    main(args);
    expectFailure(message);
  });

  test.each([
    ["add", "1e308", "1e308"],
    ["subtract", "-1e308", "1e308"],
    ["multiply", "1e308", "2"],
    ["divide", "1e308", "1e-308"],
    ["power", "1e308", "2"],
    ["power", "0", "-1"],
    ["power", "-1", "0.5"],
  ])("reports overflow for %s", (operation, left, right) => {
    main([operation, left, right]);
    expectFailure("Result is outside the finite numeric range.");
  });
});

describe("CLI entry point", () => {
  test.each([
    [["add", "2", "3"], "5"],
    [["subtract", "10", "4"], "6"],
    [["multiply", "45", "2"], "90"],
    [["divide", "20", "5"], "4"],
    [["modulo", "5", "2"], "1"],
    [["modulo", "10", "3"], "1"],
    [["power", "2", "3"], "8"],
    [["sqrt", "16"], "4"],
    [["sqrt", "25"], "5"],
  ])("runs the CLI example %j", (args, expected) => {
    const result = runCli(args);
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe(expected);
    expect(result.stderr).toBe("");
  });

  test.each([
    [[], "Provide an operation and exactly two numeric operands."],
    [["divide", "5", "0"], "Cannot divide by zero."],
    [["modulo", "5", "0"], "Cannot calculate modulo by zero."],
    [["sqrt", "-1"], "Cannot calculate the square root of a negative number."],
    [["sqrt", "-16"], "Cannot calculate the square root of a negative number."],
    [["power", "1e308", "2"], "Result is outside the finite numeric range."],
    [["modulo", "5"], "Provide an operation and exactly two numeric operands."],
    [["power", "2"], "Provide an operation and exactly two numeric operands."],
    [["sqrt", "16", "2"], "Provide sqrt and exactly one numeric operand."],
  ])("returns a failing exit status for %j", (args, message) => {
    const result = runCli(args);
    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain(`Error: ${message}`);
  });
});

function runCli(args) {
  const result = spawnSync(
    process.execPath,
    [path.join(__dirname, "..", "calculator.js"), ...args],
    { encoding: "utf8" },
  );
  if (result.error) {
    throw result.error;
  }
  return result;
}
