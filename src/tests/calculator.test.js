const { spawnSync } = require("node:child_process");
const path = require("node:path");
const { main } = require("../calculator");

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

  test.each(["power", "+", "ADD"])("rejects unsupported operation %s", (operation) => {
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

  test.each([
    ["add", "1e308", "1e308"],
    ["subtract", "-1e308", "1e308"],
    ["multiply", "1e308", "2"],
    ["divide", "1e308", "1e-308"],
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
  ])("runs the image example %j", (args, expected) => {
    const result = runCli(args);
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe(expected);
    expect(result.stderr).toBe("");
  });

  test.each([
    [[], "Provide an operation and exactly two numeric operands."],
    [["divide", "5", "0"], "Cannot divide by zero."],
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
