"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Processor = exports.getXmlStream = exports.init = exports.resultDir = exports.MAX = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const perf_hooks_1 = require("perf_hooks");
const chalk_1 = __importDefault(require("chalk"));
const unbzip2_stream_1 = __importDefault(require("unbzip2-stream"));
const xml_stream_1 = __importDefault(require("xml-stream"));
const wikilint_1 = __importDefault(require("wikilint"));
exports.MAX = 100, exports.resultDir = path_1.default.join(__dirname, 'results');
const ignore = new Set(['no-arg', 'url-encoding', 'h1', 'var-anchor']);
const init = () => {
    if (!fs_1.default.existsSync(exports.resultDir)) {
        fs_1.default.mkdirSync(exports.resultDir);
    }
};
exports.init = init;
const getXmlStream = (file) => {
    const stream = new xml_stream_1.default(fs_1.default.createReadStream(file).pipe((0, unbzip2_stream_1.default)()));
    stream.preserve('text', true);
    return stream;
};
exports.getXmlStream = getXmlStream;
class Processor {
    #failed = 0;
    #worst;
    #results;
    comma = '';
    /** @param site site nickname */
    constructor(site, results) {
        wikilint_1.default.config = `${site}wiki`;
        this.#results = results;
    }
    /**
     * Stop the processing and log the results.
     * @param timer timer name
     * @param msg message to log
     */
    stop(timer, msg) {
        console.log();
        console.timeEnd(timer);
        console.log(chalk_1.default.green(msg));
        if (this.#failed) {
            console.error(chalk_1.default.red(`${this.#failed} pages failed to parse`));
        }
        if (this.#worst) {
            console.info(chalk_1.default.yellow(`Worst page: ${this.#worst.title} (${this.#worst.duration.toFixed(3)} ms)`));
        }
    }
    /**
     * Write a new entry to the results file.
     * @param title page title
     * @param errors lint errors
     */
    newEntry(title, errors) {
        this.#results.write(`${this.comma}\n${JSON.stringify(title)}: ${JSON.stringify(errors, null, '\t')}`);
        this.comma ||= ',';
    }
    /**
     * Parse a page and lint it.
     * @param $text page text
     * @param ns page namespace
     * @param title page title
     */
    lint($text, ns, title) {
        try {
            const start = perf_hooks_1.performance.now(), errors = wikilint_1.default.parse($text, ns === '828').lint()
                .filter(({ severity, rule }) => severity === 'error' && !ignore.has(rule)), duration = perf_hooks_1.performance.now() - start;
            if (errors.length > 0) {
                this.newEntry(title, errors.map(({ severity, suggestions, fix, ...e }) => ({
                    ...e,
                    ...suggestions && {
                        suggestions: suggestions.map(action => ({
                            ...action,
                            original: $text.slice(...action.range),
                        })),
                    },
                    ...fix && { fix: { ...fix, original: $text.slice(...fix.range) } },
                    excerpt: $text.slice(e.startIndex, e.endIndex).slice(0, exports.MAX),
                })));
            }
            if (!this.#worst || duration > this.#worst.duration) {
                this.#worst = { title, duration };
            }
        }
        catch (e) {
            console.error(chalk_1.default.red(`Error parsing ${title}`), e);
            this.#failed++;
        }
    }
}
exports.Processor = Processor;
