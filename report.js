"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = require("crypto");
const chalk_1 = __importDefault(require("chalk"));
const util_1 = require("./util");
const { argv } = process, [, , lang] = argv, defaultOurDir = path_1.default.join(__dirname, 'reports');
let [, , , outDir] = argv;
const mkdir = (dir, empty) => {
    if (fs_1.default.existsSync(dir)) {
        if (!empty) {
            return;
        }
        fs_1.default.rmSync(dir, { recursive: true });
    }
    fs_1.default.mkdirSync(dir);
};
if (outDir) {
    mkdir(outDir);
    // eslint-disable-next-line n/no-unsupported-features/node-builtins
    fs_1.default.cpSync(defaultOurDir, outDir, { recursive: true, force: true });
}
else {
    outDir = defaultOurDir;
}
const dataDir = path_1.default.join(outDir, 'data');
mkdir(dataDir);
const writeJS = (data, file) => {
    fs_1.default.writeFileSync(path_1.default.join(dataDir, `${file}.js`), `window.data=${JSON.stringify(data)}`);
};
const initJS = (file) => {
    const stream = fs_1.default.createWriteStream(`${file}.js`);
    stream.write('window.data={"articles":[');
    return stream;
};
const compare = (a, b) => a.localeCompare(b);
const resultDir = path_1.default.join(__dirname, 'results'), dir = fs_1.default.readdirSync(resultDir), summary = new Set(), ruleRecords = new Map(), wiki = {}, siteDir = path_1.default.join(dataDir, lang), articlesDir = path_1.default.join(siteDir, 'pages');
let latest;
mkdir(siteDir, true);
mkdir(articlesDir);
for (const file of dir) {
    if (!file.endsWith('.json')) {
        continue;
    }
    const fileDir = path_1.default.join(resultDir, file);
    if (!fs_1.default.existsSync(fileDir)) {
        console.error(chalk_1.default.red(`Failed to read ${file}`));
        continue;
    }
    const k = file.search(/-\d+\.json$/u), site = k === -1 ? file.slice(0, -5) : file.slice(0, k);
    summary.add(site);
    if (lang !== site) {
        continue;
    }
    const data = fs_1.default.readFileSync(fileDir, 'utf8'), date = new Date(data.substr(data.indexOf('\n"#timestamp": "') + 16, 10));
    latest = !latest || date > latest ? date : latest;
    for (const mt of data.matchAll(/^(".+"): \[$/gmu)) {
        const page = JSON.parse(mt[1]), hash = (0, crypto_1.createHash)('sha256').update(page).digest('hex')
            .slice(0, 8), errors = JSON.parse(data.slice(mt.index + mt[0].length - 1, data.indexOf('\n]', mt.index) + 2)), rules = new Set(), info = [];
        for (const { rule, startLine, startCol, message, excerpt } of errors) {
            // article
            const line = startLine + 1, col = startCol + 1;
            info.push([rule, line, col, message, excerpt]);
            // wiki
            if (!(rule in wiki)) {
                wiki[rule] = 0;
            }
            // rule
            if (!rules.has(rule)) {
                rules.add(rule);
                wiki[rule]++;
                let ruleRecord;
                if (ruleRecords.has(rule)) {
                    ruleRecord = ruleRecords.get(rule);
                }
                else {
                    ruleRecord = ['', []];
                    ruleRecords.set(rule, ruleRecord);
                }
                ruleRecord[1].push(page);
                ruleRecord[0] += `${JSON.stringify([page, line, col, message, excerpt.slice(0, util_1.MAX * 0.8)], null, '\t')},`;
            }
        }
        writeJS(info, path_1.default.join(site, 'pages', hash));
    }
}
const timestamp = latest.toISOString().slice(0, 10);
// rule
for (const [rule, [str, pages]] of ruleRecords) {
    const batches = Math.ceil(pages.length / 200);
    pages.sort(compare);
    for (let i = 0; i < batches; i++) {
        const stream = initJS(path_1.default.join(siteDir, `${rule}-${i}`));
        for (let j = i * 200; j < (i + 1) * 200; j++) {
            const page = pages[j];
            if (!page) {
                break;
            }
            const index = str.indexOf(`[\n\t${JSON.stringify(page)}`);
            stream.write(str.slice(index, str.indexOf('\n]', index) + 3));
        }
        stream.write(`],batches:${batches},timestamp:"${timestamp}"}`);
        stream.end();
    }
}
writeJS([...summary].sort(compare), 'index');
writeJS([...Object.entries(wiki).sort(([a], [b]) => a.localeCompare(b)), timestamp], path_1.default.join(lang, 'index'));
