/* 資源とごみの分け方・出し方（横浜市） / How to Sort and Put Out Garbage in Yokohama
   言語の切り替え・メニュー・品目検索を担当します。 */
(function () {
  'use strict';

  /* ---------- 言語の切り替え ---------- */
  var KEY = 'wg-lang';
  function getLang() {
    return document.documentElement.getAttribute('data-lang') === 'en' ? 'en' : 'ja';
  }
  function applyLang(l, save) {
    document.documentElement.setAttribute('data-lang', l);
    document.documentElement.lang = l;
    var titles = document.querySelector('meta[name="x-title-' + l + '"]');
    if (titles) document.title = titles.getAttribute('content');
    document.querySelectorAll('[data-set-lang]').forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-set-lang') === l ? 'true' : 'false');
    });
    document.querySelectorAll('[data-ph-ja]').forEach(function (el) {
      el.setAttribute('placeholder', el.getAttribute('data-ph-' + l));
    });
    if (save) { try { localStorage.setItem(KEY, l); } catch (e) {} }
  }
  applyLang(getLang(), false);
  document.querySelectorAll('[data-set-lang]').forEach(function (b) {
    b.addEventListener('click', function () { applyLang(b.getAttribute('data-set-lang'), true); });
  });

  /* ---------- メニュー ---------- */
  var mb = document.getElementById('menu-btn');
  var menu = document.getElementById('menu');
  if (mb && menu) {
    mb.addEventListener('click', function () {
      var open = mb.getAttribute('aria-expanded') === 'true';
      mb.setAttribute('aria-expanded', open ? 'false' : 'true');
      menu.hidden = open;
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && mb.getAttribute('aria-expanded') === 'true') {
        mb.setAttribute('aria-expanded', 'false'); menu.hidden = true; mb.focus();
      }
    });
  }

  /* ---------- 印刷ボタン（早見表） ---------- */
  document.querySelectorAll('[data-print]').forEach(function (b) {
    b.addEventListener('click', function () { window.print(); });
  });

  /* ---------- 品目検索 ---------- */
  var items = window.ITEMS;
  var input = document.getElementById('q');
  var list = document.getElementById('results');
  if (!items || !input || !list) return;

  var CATS = {
    plastic:      { ja: 'プラスチック資源', en: 'Plastic Resources', page: 'plastic.html' },
    cans:         { ja: '缶・びん・ペットボトル', en: 'Cans, Bottles & PET Bottles', page: 'cans-bottles.html' },
    metal:        { ja: '小さな金属類', en: 'Small Metal Items', page: 'small-metals.html' },
    paper:        { ja: '古紙', en: 'Paper', page: 'paper-cloth.html' },
    cloth:        { ja: '古布', en: 'Clothes & Cloth', page: 'paper-cloth.html' },
    burnable:     { ja: '燃やすごみ', en: 'Burnable Garbage', page: 'burnable.html' },
    nonburnable:  { ja: '燃えないごみ', en: 'Non-burnable Garbage', page: 'non-burnable.html' },
    spray:        { ja: 'スプレー缶', en: 'Spray Cans', page: 'non-burnable.html#spray' },
    battery:      { ja: '電池類', en: 'Batteries', page: 'non-burnable.html#battery' },
    oversized:    { ja: '粗大ごみ', en: 'Oversized Garbage', page: 'oversized.html' },
    notcollected: { ja: '市では収集できない', en: 'Not collected by the city', page: 'not-collected.html' }
  };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function norm(s) {
    return String(s).normalize('NFKC').toLowerCase()
      .replace(/[ァ-ヶ]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0x60); })
      .replace(/[\s　]+/g, ' ').trim();
  }
  items.forEach(function (it) {
    it._ja = norm(it.ja); it._en = norm(it.en);
    it._note = norm(it.noteJa + ' ' + it.noteEn);
  });

  var limit = parseInt(list.getAttribute('data-limit') || '0', 10);
  var moreLink = document.getElementById('see-all');
  var countEl = document.getElementById('count');
  var activeCat = '';

  function hitHtml(it) {
    var main = it.cats[0];
    var tags = it.cats.map(function (c) {
      var k = CATS[c];
      return '<a class="tag c-' + c + '" href="' + k.page + '"><span lang="ja">' + esc(k.ja) +
             '</span><span lang="en">' + esc(k.en) + '</span></a>';
    }).join('');
    if (it.small) {
      tags += '<span class="tag star"><span lang="ja">小型家電回収ボックスも利用可</span>' +
              '<span lang="en">Small-appliance box OK</span></span>';
    }
    var note = '';
    if (it.noteJa || it.noteEn) {
      note = '<p class="hit-note"><span lang="ja">' + esc(it.noteJa) + '</span><span lang="en">' + esc(it.noteEn) + '</span></p>';
    }
    var more = it.see ? ' <a class="more" href="' + it.see + '"><span lang="ja">詳しく見る</span><span lang="en">More details</span></a>' : '';
    return '<li class="hit c-' + main + '"><div class="hit-top"><span class="hit-name"><span lang="ja">' + esc(it.ja) +
      '</span><span lang="en">' + esc(it.en) + '</span></span><span class="hit-alt jp" lang="ja">' + esc(it.ja) +
      '</span></div><div class="hit-top" style="margin-top:6px">' + tags + '</div>' + note +
      (more ? '<p class="hit-note">' + more + '</p>' : '') + '</li>';
  }

  function search(q) {
    var n = norm(q);
    var toks = n ? n.split(' ') : [];
    var out = [];
    items.forEach(function (it) {
      if (activeCat && it.cats.indexOf(activeCat) === -1) return;
      if (!toks.length) { out.push({ it: it, s: 3 }); return; }
      var best = 9, ok = true;
      toks.forEach(function (t) {
        var s;
        if (it._ja.indexOf(t) === 0 || it._en.indexOf(t) === 0) s = 0;
        else if (it._ja.indexOf(t) > -1 || it._en.indexOf(t) > -1) s = 1;
        else if (it._note.indexOf(t) > -1) s = 2;
        else { ok = false; return; }
        if (s < best || best === 9) best = Math.min(best, s);
      });
      if (ok) out.push({ it: it, s: best });
    });
    if (toks.length) out.sort(function (a, b) { return a.s - b.s || a.it.id - b.it.id; });
    return out;
  }

  function render() {
    var q = input.value;
    var res = search(q);
    var hasQuery = norm(q) !== '' || activeCat !== '';
    if (!hasQuery && limit) {
      list.innerHTML = ''; if (countEl) countEl.textContent = ''; if (moreLink) moreLink.hidden = true; return;
    }
    var shown = limit ? res.slice(0, limit) : res;
    if (!res.length) {
      list.innerHTML = '<li class="empty"><p lang="ja">見つかりませんでした。別のことば（例：「かさ」「電池」）で探すか、お住まいの区の資源循環局事務所に電話で確認してください。<a href="contact.html">連絡先を見る</a></p>' +
        '<p lang="en">No match found. Try another word (for example, "umbrella" or "battery"), or call your ward\'s Collection Office. <a href="contact.html">See contact numbers</a></p></li>';
      if (countEl) countEl.textContent = '';
      if (moreLink) moreLink.hidden = true;
      return;
    }
    list.innerHTML = shown.map(function (r) { return hitHtml(r.it); }).join('');
    if (countEl) {
      countEl.innerHTML = '<span lang="ja">' + res.length + '件' + (limit && res.length > shown.length ? '（先頭の' + shown.length + '件を表示）' : '') +
        '</span><span lang="en">' + res.length + ' item' + (res.length === 1 ? '' : 's') +
        (limit && res.length > shown.length ? ' (showing the first ' + shown.length + ')' : '') + '</span>';
    }
    if (moreLink) {
      moreLink.hidden = !(limit && res.length > shown.length);
      moreLink.href = 'lookup.html?q=' + encodeURIComponent(q);
    }
  }

  input.addEventListener('input', render);
  document.querySelectorAll('[data-q]').forEach(function (b) {
    b.addEventListener('click', function () { input.value = b.getAttribute('data-q'); render(); input.focus(); });
  });
  document.querySelectorAll('[data-cat]').forEach(function (b) {
    b.addEventListener('click', function () {
      var c = b.getAttribute('data-cat');
      activeCat = (activeCat === c) ? '' : c;
      document.querySelectorAll('[data-cat]').forEach(function (x) {
        x.setAttribute('aria-pressed', x.getAttribute('data-cat') === activeCat ? 'true' : 'false');
      });
      render();
    });
  });

  var m = /[?&]q=([^&]*)/.exec(location.search);
  if (m) { try { input.value = decodeURIComponent(m[1].replace(/\+/g, ' ')); } catch (e) {} }
  render();
})();
