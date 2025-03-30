declare interface Page {
	title: string;
	ns: string;
	revision: {
		model: string;
		timestamp: string;
		text: {
			$text: string;
		};
	};
}

declare module 'xml-stream' {
	export default class XmlStream {
		/** @class */
		constructor(stream: NodeJS.ReadableStream);
		preserve(tag: string, preserve: boolean): void;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		on<T extends string>(event: T, listener: T extends 'end' ? () => void : (page: Page) => void): void;
		pause(): void;
		resume(): void;
	}
}
