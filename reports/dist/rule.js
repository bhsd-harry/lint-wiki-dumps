"use strict";
(() => {
    const search = new URLSearchParams(location.search), lang = search.get('lang'), rule = search.get('rule'), batch = Math.floor(Number(search.get('start') || 0) / 200), endStr = String((batch + 1) * 200), prev = document.getElementById('prev'), next = document.getElementById('next'), start = document.getElementById('start'), end = document.getElementById('end'), title = document.querySelector('title'), h2 = document.querySelector('h2'), wiki = document.getElementById('wiki'), tbody = document.querySelector('tbody'), script = document.createElement('script');
    h2.textContent = h2.textContent.replace('Wikipedia', `${lang}.wikipedia.org: ${rule}`);
    title.textContent = title.textContent.replace('Wikipedia', `${lang}.wikipedia.org`);
    wiki.textContent = `${lang}wiki`;
    wiki.href += `?lang=${lang}`;
    if (batch === 0) {
        prev.removeAttribute('href');
    }
    else {
        start.textContent = String(batch * 200 + 1);
        end.textContent = endStr;
        search.set('start', String((batch - 1) * 200));
        prev.href = `${location.pathname}?${search}`;
    }
    search.set('start', endStr);
    next.href = `${location.pathname}?${search}`;
    script.src = `./data/${lang}/${rule}-${batch}.js`;
    script.addEventListener('load', () => {
        if (data.batches === batch + 1) {
            next.removeAttribute('href');
            end.textContent = String(batch * 200 + data.articles.length);
        }
        for (const [page, startLine, startCol, message, excerpt] of data.articles) {
            const tr = document.createElement('tr'), article = document.createElement('td'), edit = document.createElement('td'), line = document.createElement('td'), column = document.createElement('td'), detail = document.createElement('td'), notice = document.createElement('td'), more = document.createElement('td'), articleLink = document.createElement('a'), editLink = document.createElement('a'), moreLink = document.createElement('a');
            articleLink.textContent = page;
            articleLink.href = `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(page)}?redirect=no`;
            article.className = 'excerpt';
            article.append(articleLink);
            editLink.textContent = 'edit';
            editLink.href = `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(page)}?action=edit`;
            edit.append(editLink);
            line.textContent = String(startLine);
            column.textContent = String(startCol);
            detail.textContent = message;
            detail.className = 'excerpt';
            notice.textContent = excerpt;
            notice.className = 'excerpt mono';
            moreLink.textContent = 'more';
            moreLink.href = `./article.html?lang=${lang}&page=${encodeURIComponent(page)}`;
            more.append(moreLink);
            tr.append(article, edit, line, column, detail, notice, more);
            tbody.append(tr);
        }
    });
    document.head.append(script);
})();
