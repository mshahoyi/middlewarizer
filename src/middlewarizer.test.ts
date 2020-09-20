import middlewarizer from "./middlewarizer";

describe("Middlewarizer", () => {
	beforeEach(() => {
		console.log = jest.fn();
		console.warn = jest.fn();
	});

	test("all input functions are executed with next", async () => {
		const fn1 = jest.fn((n) => n());
		const fn2 = jest.fn();
		const fn3 = jest.fn();

		await middlewarizer()(fn1, fn2, fn3)();

		expect(fn1).toHaveBeenCalled();
		expect(fn2).toHaveBeenCalled();
		expect(fn3).not.toHaveBeenCalled();
	});

	test("the input arguments are provided to all middlewares", async () => {
		const fn1 = jest.fn((next, arg1, arg2) => next());
		const fn2 = jest.fn((next, arg1, arg2) => next());

		await middlewarizer({ dummy: "dummy" }, "second")(fn1, fn2)();

		expect(fn1.mock.calls[0][1]).toEqual({ dummy: "dummy" });
		expect(fn1.mock.calls[0][2]).toEqual("second");
		expect(fn2.mock.calls[0][1]).toEqual({ dummy: "dummy" });
		expect(fn2.mock.calls[0][2]).toEqual("second");
	});

	test("passing anything into next will stop the middleware stack", async () => {
		const fn1 = jest.fn((n) => n());
		const fn2 = jest.fn((next) => next("My Error"));
		const fn3 = jest.fn();

		await expect(middlewarizer("first")(fn1, fn2, fn3)()).rejects.toThrow();

		expect(fn1).toHaveBeenCalled();
		expect(fn2).toHaveBeenCalled();
		expect(fn3).not.toHaveBeenCalled();
	});

	test("does net let a function call next twice", async () => {
		const fn1 = jest.fn((n) => {
			n();
			n("With or without error");
		});
		const fn2 = jest.fn();

		await expect(middlewarizer()(fn1, fn2)()).rejects.toThrow();
		expect(fn1).toHaveBeenCalled();
		expect(fn2).not.toHaveBeenCalled();
	});

	test("warns the user if a function does not call next except for the last middleware", async () => {
		const fn1 = jest.fn();
		const fn2 = jest.fn();
		console.warn = jest.fn();

		await middlewarizer()(fn1, fn2)();

		expect(console.warn).toHaveBeenCalledTimes(1);

		const fn3 = jest.fn((n) => n());
		const fn4 = jest.fn();

		await middlewarizer()(fn3, fn4)();

		expect(console.warn).toHaveBeenCalledTimes(1);
	});

	test("errors passed to next can be processed in an error middleware", async () => {
		const error = new Error("an error");
		const fn1 = jest.fn((n) => n(error));
		const fn2 = jest.fn();
		const errorHandler = jest.fn();

		await middlewarizer("arg one")(fn1, fn2)({ errorHandler });

		expect(errorHandler).toHaveBeenCalledWith(error, "arg one");
	});

	test("middlewarizer returns what the last middleware returns", async () => {
		const fn1 = jest.fn((n) => n());
		const fn2 = jest.fn(() => "return Hello");

		const returnValue = await middlewarizer()(fn1, fn2)();

		expect(returnValue).toBe("return Hello");
	});

	test("has a verbose mode in options on by default which logs to commandline each middleware execution and result", async () => {
		const fn1 = (n) => n();
		const fn2 = (n) => n(error);
		const error = new Error("error");

		await expect(middlewarizer()(fn1, fn2)()).rejects.toThrow();

		expect((console.log as any).mock.calls[0][0]).toBe(
			"Middlewarizer: Exexuting the 1th middleware 'fn1'..."
		);
		expect((console.log as any).mock.calls[1][0]).toBe(
			"Middlewarizer: Passing wihout error to the next middleware"
		);
		expect((console.log as any).mock.calls[2][0]).toBe(
			"Middlewarizer: Exexuting the 2th middleware 'fn2'..."
		);
		expect((console.log as any).mock.calls[3][0]).toBe(
			"Middlewarizer: Failed to pass middleware 'fn2'. Stopped middleware stack."
		);
	});
});
