declare interface Page {
	title: string;
	ns: string;
	id: string;
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
		_preserveAll: boolean;
		/** @class */
		constructor(stream: NodeJS.ReadableStream);
		on<T extends string>(event: T, listener: T extends 'end' ? () => void : (page: Page) => void): void;
		pause(): void;
		resume(): void;
	}
}
