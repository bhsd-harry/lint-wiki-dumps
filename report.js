"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = require("crypto");
const chalk_1 = __importDefault(require("chalk"));
const [, , lang] = process.argv;
const mkdir = (dir, empty) => {
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir);
    }
    else if (empty) {
        fs_1.default.rmSync(dir, { recursive: true });
    }
};
const dataDir = path_1.default.join(__dirname, 'reports', 'data');
mkdir(dataDir);
const writeJS = (data, file) => {
    fs_1.default.writeFileSync(path_1.default.join(dataDir, `${file}.js`), `window.data=${JSON.stringify(data)}`);
};
const dir = fs_1.default.readdirSync(path_1.default.join(__dirname, 'results')), summary = [], MAX = 100;
for (const file of dir) {
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const data = require(`./results/${file}`);
        const site = file.slice(0, -5);
        summary.push(site);
        delete data['#timestamp'];
        if (!lang || lang === site) {
            const siteDir = path_1.default.join(dataDir, site);
            mkdir(siteDir, true);
            // wiki
            const values = Object.values(data), rules = [...new Set(values.flat().map(({ rule }) => rule))].sort((a, b) => a.localeCompare(b)), wiki = [];
            for (const rule of rules) {
                wiki.push([rule, values.filter(errors => errors.some(({ rule: r }) => r === rule)).length]);
                // rule
                const articles = Object.entries(data).filter(([, errors]) => errors.some(({ rule: r }) => r === rule))
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([page, errors]) => {
                    const { startLine, startCol, message, excerpt } = errors.find(({ rule: r }) => r === rule);
                    return [page, startLine + 1, startCol + 1, message, excerpt.slice(0, MAX * 0.8)];
                }), batches = Math.ceil(articles.length / 200);
                for (let i = 0; i < batches; i++) {
                    writeJS({
                        articles: articles.slice(i * 200, (i + 1) * 200),
                        batches,
                    }, path_1.default.join(site, `${rule}-${i}`));
                }
            }
            writeJS(wiki, path_1.default.join(site, 'index'));
            // article
            const articlesDir = path_1.default.join(siteDir, 'pages');
            mkdir(articlesDir);
            for (const [page, errors] of Object.entries(data)) {
                const hash = (0, crypto_1.createHash)('sha256').update(page).digest('hex')
                    .slice(0, 8), info = errors.map(({ startLine, startCol, rule, message, excerpt, }) => [
                    rule,
                    startLine + 1,
                    startCol + 1,
                    message,
                    excerpt.slice(0, MAX),
                ]);
                writeJS(info, path_1.default.join(site, 'pages', hash));
            }
        }
    }
    catch {
        console.error(chalk_1.default.red(`Failed to read ${file}`));
    }
}
writeJS(summary, 'index');
