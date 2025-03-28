"use strict";
(() => {
    const lang = new URLSearchParams(location.search).get('lang'), script = document.createElement('script'), title = document.querySelector('title'), h2 = document.querySelector('h2'), tbody = document.querySelector('tbody');
    title.textContent = title.textContent.replace('Wikipedia', `${lang}.wikipedia.org`);
    script.src = `./data/${lang}/index.js`;
    script.addEventListener('load', () => {
        h2.textContent = `${h2.textContent.replace('Wikipedia', `${lang}.wikipedia.org`)} (${data.slice(-1)[0]})`;
        for (const [rule, count] of data.slice(0, -1)) {
            const tr = document.createElement('tr'), description = document.createElement('td'), pages = document.createElement('td'), a = document.createElement('a');
            a.textContent = rule;
            a.href = `./rule.html?lang=${lang}&rule=${rule}`;
            description.append(a);
            pages.textContent = String(count);
            tr.append(description, pages);
            tbody.append(tr);
        }
    });
    document.head.append(script);
})();
