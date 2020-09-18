export interface MiddlewarizerOptions {
	errorHandler?: (error: Error, ...args: any[]) => any;
	muteNoNextCallWarning?: boolean;
}

const middlewarizer = function (...args: any[]) {
	return (...funcs: Array<(next: (error?) => void, ...args) => any>) => async (
		options?: MiddlewarizerOptions
	) => {
		let nextCallsNumber = 0;
		let nextError;

		const next = (error?) => {
			nextCallsNumber += 1;
			nextError = error;
		};

		for (let i = 0; i < funcs.length; i++) {
			try {
				await funcs[i](next, ...args);
			} catch (e) {
				return handleError(e, options, ...args);
			}

			if (nextCallsNumber === 0) {
				if ((options && options.muteNoNextCallWarning) || i === funcs.length - 1) return;
				return console.warn(
					`Middlewarizer Warning: Next has not been called inside your ${
						i + 1
					}th function. You can mute this warning by setting 'muteNoNextCallWarning'`
				);
			} else if (nextCallsNumber > 1)
				throw new Error(
					`Middlewarizer Error: Next has been called more than once inside your ${
						i + 1
					}th function`
				);

			if (typeof nextError !== "undefined") return handleError(nextError, options, ...args);

			nextCallsNumber = 0;
		}
	};
};

const handleError = (error, options: MiddlewarizerOptions, ...args) => {
	if (options && options.errorHandler) options.errorHandler(error, ...args);
	else throw new Error(error);
};

export default middlewarizer;
