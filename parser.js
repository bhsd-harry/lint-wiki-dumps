"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const common_1 = require("@bhsd/common");
const util_1 = require("./util");
const n = Number(process.argv[4]) || Infinity, [, , site, file, , restart] = process.argv, filePath = path_1.default.join(util_1.resultDir, `${site}.json`), data = fs_1.default.existsSync(filePath) && fs_1.default.readFileSync(filePath, 'utf8');
const getTimestamp = () => {
    if (!data) {
        return undefined;
    }
    const i = data.indexOf('"#timestamp": "') + 15;
    return data.slice(i, data.indexOf('"', i));
};
const getErrors = (page) => {
    if (!data) {
        return undefined;
    }
    const str = JSON.stringify(page), i = data.indexOf(`${str}: [`);
    if (i === -1) {
        return undefined;
    }
    const j = i + str.length + 2;
    return JSON.parse(data.slice(j, data.indexOf('\n]', j) + 2));
};
(0, util_1.init)();
const time = getTimestamp(), last = time && new Date(time), results = fs_1.default.createWriteStream(path_1.default.join(util_1.resultDir, `${site}.json`), { flags: restart ? 'a' : 'w' }), processor = new util_1.Processor(site, results, last);
let i = 0, stopping = false, restarted = !restart;
if (!restart) {
    results.write('{');
}
results.on('close', () => {
    process.exit(); // eslint-disable-line n/no-process-exit
});
const stop = () => {
    stopping = true;
    processor.stop('parse', `Parsed ${i} pages`);
};
console.time('parse');
const stream = (0, util_1.getXmlStream)(file.replace(/^~/u, os_1.default.homedir()));
stream.on('endElement: page', ({ title, ns, revision: { model, timestamp, text: { $text } } }) => {
    if (i === n) {
        if (!stopping) {
            stop();
        }
    }
    else if (restarted && model === 'wikitext' && $text && ns !== '10') {
        (0, common_1.refreshStdout)(`${i++} ${title}`);
        const date = new Date(timestamp);
        if (last && date <= last) {
            const previous = getErrors(title);
            if (previous) {
                processor.newEntry(title, previous);
            }
        }
        else {
            processor.lint($text, ns, title, date);
        }
    }
    else if (title === restart) {
        restarted = true;
    }
});
stream.on('end', stop);
