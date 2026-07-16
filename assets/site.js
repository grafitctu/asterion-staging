(function () {
  "use strict";

  const data = window.ASTERION_DATA;
  const main = document.getElementById("main-content");
  const right = document.getElementById("right-sidebar");
  const navigation = document.getElementById("main-navigation");
  const menu = document.getElementById("left-sidebar");
  const menuToggle = document.querySelector(".menu-toggle");
  const themeToggle = document.getElementById("theme-toggle");
  const searchForm = document.getElementById("site-search-form");
  const searchInput = document.getElementById("site-search");
  const pageSize = 30;

  function storedTheme() {
    try {
      return window.localStorage.getItem("asterion-theme");
    } catch (_error) {
      return null;
    }
  }

  function applyTheme(theme, remember) {
    const dark = theme === "dark";
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    themeToggle.setAttribute("aria-pressed", String(dark));
    themeToggle.textContent = dark ? "Světlé pozadí" : "Černé pozadí";
    if (remember) {
      try {
        window.localStorage.setItem("asterion-theme", dark ? "dark" : "light");
      } catch (_error) {
        /* Přímé otevření přes file:// může mít ukládání zakázané. */
      }
    }
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalize(value) {
    return String(value == null ? "" : value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("cs");
  }

  function formatBytes(bytes) {
    const value = Number(bytes) || 0;
    if (value < 1024) return value + " B";
    if (value < 1024 * 1024) return (value / 1024).toFixed(value < 10240 ? 1 : 0) + " kB";
    return (value / (1024 * 1024)).toFixed(value < 10 * 1024 * 1024 ? 1 : 0) + " MB";
  }

  function formatDate(value) {
    const date = new Date(value + "T12:00:00");
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("cs-CZ").format(date);
  }

  function safeHref(value) {
    const href = String(value || "");
    if (href.startsWith("#/")) return href;
    if (href.startsWith("../")) return href;
    if (href.startsWith("assets/")) return href;
    if (/^https?:\/\//i.test(href) || /^mailto:/i.test(href)) return href;
    return "#";
  }

  function linkAttributes(href) {
    return /^https?:\/\//i.test(href)
      ? ' target="_blank" rel="noopener noreferrer"'
      : "";
  }

  function routeInfo() {
    const raw = (location.hash || "#/home").replace(/^#\/?/, "");
    const question = raw.indexOf("?");
    const path = question === -1 ? raw : raw.slice(0, question);
    const query = new URLSearchParams(question === -1 ? "" : raw.slice(question + 1));
    return { path: decodeURIComponent(path || "home"), query };
  }

  function setTitle(title) {
    document.title = title + " – Asterion";
  }

  function updateActiveNavigation(path) {
    navigation.querySelectorAll("a").forEach(function (link) {
      const target = link.dataset.route || "";
      const active = path === target || (target === "archive" && path.startsWith("archive/"));
      link.classList.toggle("active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  function renderSocialPanel() {
    const social = data.social;
    if (!social || !Array.isArray(social.sources) || !social.sources.length) return "";

    const limit = Math.max(1, Math.min(5, Number(social.limit_per_source) || 3));
    const sources = social.sources.map(function (source) {
      const sourceHref = safeHref(source.url);
      const items = Array.isArray(source.items) ? source.items.slice(0, limit) : [];
      const entries = items.length
        ? items.map(function (item) {
            const href = safeHref(item.url);
            return `
              <article class="social-item">
                <div class="social-date">${escapeHtml(formatDate(item.date))}</div>
                <a href="${escapeHtml(href)}"${linkAttributes(href)}>${escapeHtml(item.title)}</a>
              </article>`;
          }).join("")
        : '<p class="social-empty">Zatím bez uložených příspěvků.</p>';

      return `
        <div class="social-source">
          <h3>${escapeHtml(source.title)}</h3>
          ${entries}
          <p class="social-source-link"><a href="${escapeHtml(sourceHref)}"${linkAttributes(sourceHref)}>${escapeHtml(source.link_label || "Otevřít zdroj")}</a></p>
        </div>`;
    }).join("");

    return `<section class="right-panel social-panel"><h2>Nově jinde</h2>${sources}</section>`;
  }

  function renderSidebar() {
    const news = data.config.news.map(function (item) {
      const href = safeHref(item.route);
      return `
        <article class="news-item">
          <div class="news-date">${escapeHtml(formatDate(item.date))}</div>
          <h3><a href="${escapeHtml(href)}"${linkAttributes(href)}>${escapeHtml(item.title)}</a></h3>
          <p>${escapeHtml(item.text)}</p>
        </article>`;
    }).join("");

    const panels = data.config.panels.map(function (panel) {
      const links = panel.links.map(function (item) {
        const href = safeHref(item[1]);
        return `<li><a href="${escapeHtml(href)}"${linkAttributes(href)}>${escapeHtml(item[0])}</a></li>`;
      }).join("");
      return `<section class="right-panel"><h2>${escapeHtml(panel.title)}</h2><ul class="plain-links">${links}</ul></section>`;
    }).join("");

    right.innerHTML = `<section class="right-panel"><h2>Novinky</h2>${news}</section>${renderSocialPanel()}${panels}`;
  }

  function renderHome() {
    setTitle("Úvod");
    const stats = data.stats;
    const originalHome = data.pages.find(function (page) { return page.slug === "uvod"; });
    const historicalHome = originalHome
      ? originalHome.html.replace(/<h1(\s|>)/gi, "<h2$1").replace(/<\/h1>/gi, "</h2>")
      : "";

    main.innerHTML = `
      <h1>${escapeHtml(data.config.site_title)}</h1>
      <p class="intro">${escapeHtml(data.config.intro)}</p>
      <p class="stats-line">
        <span><strong>${stats.catalog_items}</strong> unikátních souborů</span>
        <span><a href="#/dech-draka?tag=pov%C3%ADdka"><strong>${stats.dech_draka_stories}</strong> povídek</a></span>
        <span><a href="#/dech-draka?tag=dobrodru%C5%BEstv%C3%AD"><strong>${stats.dech_draka_adventures}</strong> dobrodružství</a></span>
        <span><a href="#/dech-draka?tag=tematick%C3%BD%20%C4%8Dl%C3%A1nek"><strong>${stats.dech_draka_thematic_articles}</strong> tematických článků</a></span>
      </p>
      <div class="quick-sections">
        <section><h2><a href="#/materials">Materiály ke stažení</a></h2><p>Jeden katalog místo nepřehledné soustavy složek. Lze hledat podle názvu, typu, tématu i původu.</p></section>
        <section><h2><a href="#/dech-draka">Co vyšlo v Dechu draka</a></h2><p>Historicky smysluplná skupina zůstává zachována a je dostupná samostatně.</p></section>
        <section><h2><a href="#/modules">Herní moduly</a></h2><p>Rozcestník modulů propojuje původní články s příslušnými mapami, dobrodružstvími a pravidly.</p></section>
        <section><h2><a href="#/archive">Archiv původního webu</a></h2><p>Text starých stránek je zachován, ale už není svázán s historickou administrací Contaa.</p></section>
      </div>
      ${historicalHome ? `
        <section class="homepage-history" aria-labelledby="homepage-history-title">
          <h2 id="homepage-history-title">Zachovaná titulní strana původního webu</h2>
          <p class="homepage-history-note">Následující příspěvky zůstávají v původním pořadí jako kronika Asterionu. Odkazy a obrázky jsou převedené do bezpečné místní kopie.</p>
          <div class="legacy-content homepage-history-content">${historicalHome}</div>
        </section>` : ""}`;
  }

  function catalogMetadataText(item) {
    if (item._metadataText) return item._metadataText;
    item._metadataText = normalize([
      item.title,
      item.group,
      item.tags.join(" "),
      item.description,
      item.summary,
      item.path
    ].join(" "));
    return item._metadataText;
  }

  function catalogText(item) {
    if (item._catalogText) return item._catalogText;
    item._catalogText = normalize(catalogMetadataText(item) + " " + (item.search_text || ""));
    return item._catalogText;
  }

  function catalogPreset(path) {
    const presets = {
      "dech-draka": { title: "Co vyšlo v Dechu draka", group: "Dech draka", intro: "Historická skupina článků a příloh publikovaných v časopisu Dech draka." },
      "maps": { title: "Mapy", group: "Mapy", intro: "Mapy a plánky jsou rozdělené podle použití; pracovní čísla a interní poznámky v názvech jsou odstraněné." },
      "adventures": { title: "Dobrodružství", group: "", contentKind: "adventure", intro: "Samostatná dobrodružství pro vypravěče bez ohledu na to, zda původně vyšla na webu, v Dechu draka nebo jako doplněk modulu." },
      "rules": { title: "Aplikace pravidel", group: "Aplikace pravidel", intro: "Pravidlové převody, tabulky a další herní pomůcky pro různé systémy." },
      "indexes": { title: "Rejstříky a databáze", group: "Rejstříky a databáze", intro: "Stažené pracovní rejstříky Asterionu a otevřená evidence dohledaných i dosud chybějících pramenů." },
      "archive/dech-draka": { title: "Články v časopise Dech draka", group: "Dech draka", intro: "Povídky, články, dobrodružství a herní materiály, které vyšly v časopise Dech draka.", legacy: [["Původní stránka Dech draka", "dech-draka"], ["Starší přehled podle čísel", "dech-draka-79"], ["Původní společný rozcestník článků", "clanky-v-casopisech"]] },
      "archive/alduron": { title: "Články v časopise Alduron", group: "Alduron", intro: "Dochované články o Asterionu publikované v časopise Alduron.", legacy: [["Původní stránka časopisu Alduron", "alduron"]] },
      "archive/legenda": { title: "Články v časopise Legenda", group: "Legenda", intro: "Dochované části článku o Asterionu publikovaného v časopise Legenda.", legacy: [["Původní stránka časopisu Legenda", "legenda"]] }
    };
    return presets[path] || { title: "Materiály ke stažení", group: "", intro: "Sjednocený katalog veřejných souborů a užitečných položek nalezených ve správci souborů Contaa." };
  }

  function renderSourceRegister() {
    const register = data.source_register;
    if (!register) return "";
    const recovered = (Array.isArray(register.recovered) ? register.recovered : []).map(function (source) {
      const files = (source.files || []).map(function (file) {
        const href = safeHref(file.href);
        return `<a href="${escapeHtml(href)}">${escapeHtml(file.label)}</a>`;
      }).join(" · ");
      return `
        <li>
          <strong>${escapeHtml(source.title)}</strong>
          <span class="source-status">${escapeHtml(source.status)}</span>
          <p>${escapeHtml(source.description)}</p>
          ${files ? `<p>${files}</p>` : ""}
          ${source.provenance ? `<small>${escapeHtml(source.provenance)}</small>` : ""}
        </li>`;
    }).join("");
    const missing = (Array.isArray(register.missing) ? register.missing : []).map(function (source) {
      return `
        <li>
          <strong>${escapeHtml(source.title)}</strong>
          <span class="source-status">${escapeHtml(source.status)}</span>
          <p>${escapeHtml(source.description)}</p>
          ${source.recovery ? `<small>${escapeHtml(source.recovery)}</small>` : ""}
        </li>`;
    }).join("");
    if (!recovered && !missing) return "";
    return `
      <section class="source-register" aria-labelledby="source-register-title">
        <h2 id="source-register-title">${escapeHtml(register.title || "Stav pramenů")}</h2>
        <p>${escapeHtml(register.intro || "")}</p>
        ${recovered ? `<h3>Dohledané prameny</h3><ul class="missing-source-list">${recovered}</ul>` : ""}
        ${missing ? `<h3>Dosud chybí</h3><ul class="missing-source-list">${missing}</ul>` : ""}
      </section>`;
  }

  function renderCatalog(path, query) {
    const preset = catalogPreset(path);
    setTitle(preset.title);
    let shown = pageSize;
    const groups = data.groups.map(function (pair) { return pair[0]; });
    const initial = {
      q: query.get("q") || "",
      group: query.get("group") || preset.group,
      tag: query.get("tag") || preset.tag || ""
    };

    function countGroup(group) {
      const pair = data.groups.find(function (item) { return item[0] === group; });
      return pair ? Number(pair[1]) : 0;
    }

    const topicCards = path === "materials" ? `
      <nav class="catalog-topics" aria-label="Připravené skupiny materiálů">
        <a href="#/dech-draka"><strong>Dech draka</strong><span>${data.stats.dech_draka} položek</span></a>
        <a href="#/adventures"><strong>Dobrodružství</strong><span>${data.stats.adventures_total || 0} připravených scénářů</span></a>
        <a href="#/maps"><strong>Mapy</strong><span>${countGroup("Mapy")} map a plánků</span></a>
        <a href="#/rules"><strong>Aplikace pravidel</strong><span>${countGroup("Aplikace pravidel")} souborů</span></a>
        <a href="#/indexes"><strong>Rejstříky a databáze</strong><span>${countGroup("Rejstříky a databáze")} stažené soubory</span></a>
        <a href="#/materials?group=${encodeURIComponent("Vaše tvorba")}"><strong>Vaše tvorba</strong><span>${countGroup("Vaše tvorba")} příspěvků</span></a>
      </nav>` : "";

    const archiveBack = path.startsWith("archive/") ? '<p class="archive-back"><a href="#/archive">← Zpět na rozcestník archivu</a></p>' : "";
    const legacyLinks = preset.legacy
      ? `<p class="legacy-index-links">Staré členění: ${preset.legacy.map(function (item) { return `<a href="#/page/${encodeURIComponent(item[1])}">${escapeHtml(item[0])}</a>`; }).join(" · ")}</p>`
      : "";
    const sourceRegister = path === "indexes" ? renderSourceRegister() : "";
    main.innerHTML = `
      ${archiveBack}<h1>${escapeHtml(preset.title)}</h1>
      <p>${escapeHtml(preset.intro)}</p>
      ${legacyLinks}
      ${sourceRegister}
      ${topicCards}
      <form class="catalog-controls" id="catalog-controls">
        <div class="control-grid">
          <label>Hledat
            <input type="search" name="q" value="${escapeHtml(initial.q)}" autocomplete="off" placeholder="Název, téma nebo slovo z dokumentu">
          </label>
          <label>Skupina
            <select name="group">
              <option value="">Všechny skupiny</option>
              ${groups.map(function (group) { return `<option value="${escapeHtml(group)}"${group === initial.group ? " selected" : ""}>${escapeHtml(group)}</option>`; }).join("")}
            </select>
          </label>
        </div>
        <div class="catalog-actions"><button type="button" id="catalog-reset">Vymazat</button></div>
      </form>
      <p class="catalog-search-note">Hledání prochází názvy, témata a také text ${data.stats.fulltext_items || 0} rozpoznaných dokumentů.</p>
      <p class="result-count" id="result-count" aria-live="polite"></p>
      <div class="material-list" id="material-list"></div>
      <button type="button" class="load-more" id="load-more">Zobrazit další</button>`;

    const form = document.getElementById("catalog-controls");
    const list = document.getElementById("material-list");
    const count = document.getElementById("result-count");
    const load = document.getElementById("load-more");

    function currentFilters() {
      const values = new FormData(form);
      return {
        q: String(values.get("q") || ""),
        group: String(values.get("group") || ""),
        tag: initial.tag
      };
    }

    function renderCatalogOverview() {
      const grouped = {};
      data.catalog.forEach(function (item) {
        if (!grouped[item.group]) grouped[item.group] = [];
        grouped[item.group].push(item);
      });
      return data.groups.filter(function (pair) {
        return grouped[pair[0]] && grouped[pair[0]].length;
      }).map(function (pair) {
        const group = pair[0];
        const items = grouped[group].sort(function (a, b) { return a.title.localeCompare(b.title, "cs"); });
        const files = items.map(function (item) {
          const href = safeHref(item.href);
          return `<div class="rule-file"><a href="${escapeHtml(href)}">${escapeHtml(item.title)}</a><span>${escapeHtml(item.extension.toUpperCase())}, ${escapeHtml(formatBytes(item.size))}</span></div>`;
        }).join("");
        return `
          <section class="rules-system catalog-overview-group">
            <h2><a href="#/materials?group=${encodeURIComponent(group)}">${escapeHtml(group)}</a> <span>${items.length} ${items.length === 1 ? "položka" : (items.length < 5 ? "položky" : "položek")}</span></h2>
            <div class="catalog-overview-files">${files}</div>
          </section>`;
      }).join("");
    }

    function updateList(resetLimit) {
      if (resetLimit) shown = pageSize;
      const filters = currentFilters();
      const search = normalize(filters.q);
      const tag = normalize(filters.tag);
      if (path === "materials" && !search && !filters.group && !tag) {
        list.classList.add("catalog-overview");
        list.innerHTML = renderCatalogOverview();
        count.textContent = `Přehled všech ${data.catalog.length} položek v ${data.groups.length} skupinách.`;
        load.hidden = true;
        return;
      }
      list.classList.remove("catalog-overview");
      const filtered = data.catalog.filter(function (item) {
        if (preset.contentKind && item.content_kind !== preset.contentKind) return false;
        if (filters.group && item.group !== filters.group) return false;
        if (tag && !item.tags.some(function (value) { return normalize(value).includes(tag); })) return false;
        return !search || catalogText(item).includes(search);
      });
      if (path === "adventures") filtered.sort(function (a, b) { return a.title.localeCompare(b.title, "cs"); });

      const visible = filtered.slice(0, shown);
      const options = { search: search, showGroup: path !== "adventures" && !filters.group && !preset.group, showSummary: path === "adventures" || path === "indexes" };
      list.innerHTML = path === "maps"
        ? renderMapGroups(visible, options)
        : (visible.map(function (item) { return materialRow(item, options); }).join("") || '<p class="empty-result">Tomuto výběru neodpovídá žádný soubor.</p>');
      count.textContent = `Nalezeno ${filtered.length} položek${filtered.length > shown ? `, zobrazeno prvních ${shown}` : ""}.`;
      load.hidden = filtered.length <= shown;
      load.onclick = function () {
        shown += pageSize;
        updateList(false);
      };
    }

    form.addEventListener("input", function () { updateList(true); });
    form.addEventListener("change", function () { updateList(true); });
    form.addEventListener("submit", function (event) { event.preventDefault(); updateList(true); });
    document.getElementById("catalog-reset").addEventListener("click", function () {
      form.elements.q.value = "";
      form.elements.group.value = preset.group;
      initial.tag = "";
      updateList(true);
    });
    updateList(true);
  }

  function renderMapGroups(items, options) {
    if (!items.length) return '<p class="empty-result">Tomuto výběru neodpovídá žádná mapa.</p>';
    const order = ["Mapy z herních modulů", "Samostatné mapy a plánky", "Slepé mapy pro hráče", "Starší mapy a podklady"];
    const grouped = {};
    items.forEach(function (item) {
      const group = item.map_category || "Samostatné mapy a plánky";
      if (!grouped[group]) grouped[group] = [];
      grouped[group].push(item);
    });
    return order.filter(function (group) { return grouped[group]; }).map(function (group) {
      const unique = {};
      grouped[group].forEach(function (item) {
        const key = normalize(item.title);
        if (!unique[key] || Number(item.size || 0) > Number(unique[key].size || 0)) unique[key] = item;
      });
      return `<section class="material-subgroup"><h2>${escapeHtml(group)}</h2>${Object.keys(unique).map(function (key) { return materialRow(unique[key], options); }).join("")}</section>`;
    }).join("");
  }

  function visibleTags(item) {
    const hidden = new Set([
      normalize(item.group),
      normalize(item.extension),
      "pdf", "zip", "doc", "docx", "rtf", "jpg", "jpeg", "png",
      "webovy clanek", "webovy material", "verejny web", "serverovy archiv"
    ]);
    return item.tags.filter(function (tag) { return !hidden.has(normalize(tag)); });
  }

  function materialRow(item, options) {
    options = options || {};
    const href = safeHref(item.href);
    const tags = visibleTags(item);
    const meta = [];
    if (options.showGroup) meta.push(escapeHtml(item.group));
    if (tags.length) meta.push(`<span class="tags">${tags.map(function (tag) { return `<span>${escapeHtml(tag)}</span>`; }).join("")}</span>`);
    if (options.search && !catalogMetadataText(item).includes(options.search) && normalize(item.search_text || "").includes(options.search)) {
      meta.push('<span class="content-hit">shoda v obsahu dokumentu</span>');
    }
    const summary = options.showSummary && item.summary ? `<p class="material-summary">${escapeHtml(item.summary)}</p>` : "";
    return `
      <article class="material-row${summary ? " with-summary" : ""}">
        <h2><a href="${escapeHtml(href)}">${escapeHtml(item.title)}</a></h2>
        <div class="file-info">${escapeHtml(formatBytes(item.size))}</div>
        ${summary}
        ${meta.length ? `<div class="meta">${meta.join(" · ")}</div>` : ""}
      </article>`;
  }

  function renderDechDraka(query) {
    setTitle("Co vyšlo v Dechu draka");
    const categoryOrder = [
      "Povídky",
      "Dobrodružství",
      "Tematické články",
      "Cizí postavy",
      "Drakolidé",
      "Bestiář a bytosti",
      "Pravidla a aplikace",
      "Obrazové přílohy",
      "Související soubory bez doloženého čísla"
    ];
    const allItems = data.catalog.filter(function (item) { return item.group === "Dech draka"; });
    let selectedTag = query.get("tag") || "";

    main.innerHTML = `
      <h1>Co vyšlo v Dechu draka</h1>
      <p>Články a přílohy jsou rozdělené podle tématu. U ${data.stats.dech_draka_dated || 0} položek původní přehled uvádí také konkrétní číslo a rok vydání.</p>
      <p class="catalog-search-note">V pozdějších letech vycházel Dech draka jako součást časopisu Pevnost; překryv obou historických přehledů proto není duplicita ani chyba.</p>
      <form class="catalog-controls dech-controls" id="dech-controls">
        <div class="control-grid">
          <label>Hledat v Dechu draka
            <input type="search" name="q" value="${escapeHtml(query.get("q") || "")}" autocomplete="off" placeholder="Název, téma nebo slovo z dokumentu">
          </label>
        </div>
        <div class="catalog-actions"><button type="button" id="dech-reset">Zobrazit vše</button></div>
      </form>
      <p class="catalog-search-note">Hledání prochází názvy, témata i rozpoznaný text dokumentů.</p>
      <p class="result-count" id="dech-result-count" aria-live="polite"></p>
      <div class="dech-groups" id="dech-groups"></div>`;

    const form = document.getElementById("dech-controls");
    const container = document.getElementById("dech-groups");
    const count = document.getElementById("dech-result-count");

    function latestIssue(item) {
      return (item.dech_issues || []).reduce(function (latest, issue) {
        const parts = issue.split("/");
        return Math.max(latest, Number(parts[1] || 0) * 100 + Number(parts[0] || 0));
      }, 0);
    }

    function issueLabel(item) {
      const issues = item.dech_issues || [];
      return issues.length
        ? `Dech draka ${issues.join(" a ")}`
        : "číslo v původním přehledu neuvedeno";
    }

    function renderGroups(items) {
      const grouped = {};
      items.forEach(function (item) {
        const category = item.dech_category || "Tematické články";
        if (!grouped[category]) grouped[category] = [];
        grouped[category].push(item);
      });
      return categoryOrder.filter(function (category) { return grouped[category]; }).map(function (category) {
        const rows = grouped[category].sort(function (a, b) {
          return latestIssue(b) - latestIssue(a) || a.title.localeCompare(b.title, "cs");
        }).map(function (item) {
          const href = safeHref(item.href);
          const metadata = `${issueLabel(item)} · ${item.extension.toUpperCase()}, ${formatBytes(item.size)}`;
          return `<div class="rule-file"><a href="${escapeHtml(href)}">${escapeHtml(item.title)}</a><span>${escapeHtml(metadata)}</span></div>`;
        }).join("");
        const note = category === "Související soubory bez doloženého čísla"
          ? '<p class="dech-group-note">Tyto soubory jsou s archivem propojené, ale dochované přehledy u nich neuvádějí číslo časopisu. Údaj proto nedoplňujeme odhadem.</p>'
          : "";
        return `
          <section class="rules-system dech-category">
            <h2>${escapeHtml(category)} <span>${grouped[category].length} ${grouped[category].length === 1 ? "položka" : (grouped[category].length < 5 ? "položky" : "položek")}</span></h2>
            ${note}<div class="dech-category-files">${rows}</div>
          </section>`;
      }).join("");
    }

    function update() {
      const search = normalize(String(new FormData(form).get("q") || ""));
      const tag = normalize(selectedTag);
      const filtered = allItems.filter(function (item) {
        if (tag && !item.tags.some(function (value) { return normalize(value).includes(tag); })) return false;
        return !search || catalogText(item).includes(search);
      });
      container.innerHTML = renderGroups(filtered) || '<p class="empty-result">Tomuto hledání neodpovídá žádná položka.</p>';
      count.textContent = search || tag
        ? `Nalezeno ${filtered.length} položek.`
        : `Tematický přehled všech ${allItems.length} položek.`;
    }

    form.addEventListener("input", update);
    form.addEventListener("submit", function (event) { event.preventDefault(); update(); });
    document.getElementById("dech-reset").addEventListener("click", function () {
      form.elements.q.value = "";
      selectedTag = "";
      update();
    });
    update();
  }

  function renderRules() {
    setTitle("Aplikace pravidel");
    const systemOrder = ["DrD 1.6", "Dračí hlídka", "DrD II", "DrD+", "D&D 5e", "Ostatní"];
    const items = data.catalog.filter(function (item) { return item.group === "Aplikace pravidel"; });
    const grouped = {};

    items.forEach(function (item) {
      const system = item.rule_system || "Ostatní";
      const module = item.rule_module || "Nezařazené";
      if (!grouped[system]) grouped[system] = {};
      if (!grouped[system][module]) grouped[system][module] = [];
      grouped[system][module].push(item);
    });

    const sections = systemOrder.filter(function (system) { return grouped[system]; }).map(function (system) {
      const modules = Object.keys(grouped[system]).sort(function (a, b) {
        const orderA = Math.min.apply(null, grouped[system][a].map(function (item) { return item.rule_order == null ? 999 : Number(item.rule_order); }));
        const orderB = Math.min.apply(null, grouped[system][b].map(function (item) { return item.rule_order == null ? 999 : Number(item.rule_order); }));
        return orderA - orderB || a.localeCompare(b, "cs");
      });
      const count = modules.reduce(function (sum, module) { return sum + grouped[system][module].length; }, 0);
      const rows = modules.map(function (module) {
        const files = grouped[system][module].sort(function (a, b) { return a.title.localeCompare(b.title, "cs"); }).map(function (item) {
          const href = safeHref(item.href);
          return `<div class="rule-file"><a href="${escapeHtml(href)}">${escapeHtml(item.title)}</a><span>${escapeHtml(item.extension.toUpperCase())}, ${escapeHtml(formatBytes(item.size))}</span></div>`;
        }).join("");
        return `<div class="rule-module-row"><h3>${escapeHtml(module)}</h3><div>${files}</div></div>`;
      }).join("");
      return `<section class="rules-system"><h2>${escapeHtml(system)} <span>${count} ${count === 1 ? "soubor" : (count < 5 ? "soubory" : "souborů")}</span></h2>${rows}</section>`;
    }).join("");

    main.innerHTML = `
      <h1>Aplikace pravidel</h1>
      <p>Nejprve jsou řazeny podle herního systému a uvnitř podle jednotlivých modulů. Staré pracovní názvy z InDesignu jsou nahrazené veřejnými názvy dokumentů.</p>
      ${sections}`;
  }

  function moduleApplications(module) {
    const moduleNames = [module.rule_module || module.name].concat(module.rule_modules || []);
    const systemOrder = ["DrD 1.6", "Dračí hlídka", "DrD II", "DrD+", "D&D 5e"];
    const candidates = data.catalog.filter(function (item) { return moduleNames.includes(item.rule_module); }).sort(function (a, b) {
      const preferredA = a.group === "Aplikace pravidel" ? 0 : 1;
      const preferredB = b.group === "Aplikace pravidel" ? 0 : 1;
      return preferredA - preferredB || Number(a.rule_order || 999) - Number(b.rule_order || 999) || a.title.localeCompare(b.title, "cs");
    });
    const bySystem = {};
    candidates.forEach(function (item) {
      const system = item.rule_system || "Další pravidla";
      if (!bySystem[system]) bySystem[system] = item;
    });
    return Object.keys(bySystem).sort(function (a, b) {
      const indexA = systemOrder.indexOf(a);
      const indexB = systemOrder.indexOf(b);
      return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB) || a.localeCompare(b, "cs");
    }).map(function (system) { return bySystem[system]; });
  }

  function moduleActionLinks(module, includeCatalog) {
    const actions = [];
    if (includeCatalog) actions.push(`<a href="#/materials?q=${encodeURIComponent(module.name)}">Soubory v katalogu (${module.count})</a>`);
    moduleApplications(module).forEach(function (item) {
      const href = safeHref(item.href);
      actions.push(`<a href="${escapeHtml(href)}">Aplikace ${escapeHtml(item.rule_system)}</a>`);
    });
    if (module.purchase_url) {
      const href = safeHref(module.purchase_url);
      actions.push(`<a class="purchase-link" href="${escapeHtml(href)}"${linkAttributes(href)}>${escapeHtml(module.purchase_label || "Koupit na Imagu")}</a>`);
    }
    (module.links || []).forEach(function (link) {
      const href = safeHref(link.href);
      actions.push(`<a${link.purchase ? ' class="purchase-link"' : ""} href="${escapeHtml(href)}"${linkAttributes(href)}>${escapeHtml(link.label)}</a>`);
    });
    return actions.join(" · ");
  }

  function moduleMissingSources(module) {
    if (!Array.isArray(module.missing_sources) || !module.missing_sources.length) return "";
    return module.missing_sources.map(function (source) {
      return `<p class="missing-source-note"><strong>${escapeHtml(source.title)}:</strong> ${escapeHtml(source.status)}. ${escapeHtml(source.recovery || "")}</p>`;
    }).join("");
  }

  function renderModules() {
    setTitle("Herní moduly");
    const rows = data.modules.map(function (module) {
      const cover = module.cover ? `<img src="${escapeHtml(safeHref(module.cover))}" alt="Obálka: ${escapeHtml(module.name)}" loading="lazy">` : "";
      const detailPage = data.pages.some(function (page) { return page.slug === module.slug; });
      const detailLink = detailPage ? `<a href="#/page/${encodeURIComponent(module.slug)}">Původní stránka modulu</a>` : "";
      const actions = moduleActionLinks(module, true);
      const missing = moduleMissingSources(module);
      return `<article class="module-row${cover ? "" : " no-cover"}">${cover}<div><h2>${escapeHtml(module.name)}</h2>${detailLink ? `<p>${detailLink}</p>` : ""}<p class="module-actions">${actions}</p>${missing}</div></article>`;
    }).join("");
    main.innerHTML = `
      <h1>Herní moduly</h1>
      <p>Přehled modulů propojuje zachované popisy, související soubory a přímo dostupné aplikace pravidel.</p>
      <p class="store-overview"><a href="https://www.imago.cz/asterion-moduly" target="_blank" rel="noopener noreferrer">Aktuální nabídka asterionských modulů na Imagu</a></p>
      <div class="module-list">${rows}</div>`;
  }

  function enhanceLegacyModuleTables(root) {
    root.querySelectorAll("table").forEach(function (table) {
      const headingCell = table.querySelector("tr:first-child td[colspan]");
      if (!headingCell) return;
      const heading = normalize(headingCell.textContent).replace(/^asterion\s*:?\s*/, "");
      const module = data.modules.find(function (item) {
        const name = normalize(item.name);
        return heading === name || heading.includes(name) || name.includes(heading);
      });
      if (!module) return;

      const coverCell = table.querySelector("tr:nth-child(2) td:first-child");
      if (coverCell && module.cover) {
        let cover = coverCell.querySelector("img");
        if (!cover) {
          cover = document.createElement("img");
          coverCell.insertBefore(cover, coverCell.firstChild);
        }
        cover.src = safeHref(module.cover);
        cover.alt = `Obálka: ${module.name}`;
        cover.width = 110;
        cover.height = 153;
        cover.loading = "lazy";
      }

      table.querySelectorAll('a[href*="fantasyobchod.cz"], a[href*="obchod.altar.cz"], a[href*="imago.cz"]').forEach(function (link) {
        const container = link.closest("div");
        if (container && normalize(container.textContent) === normalize(link.textContent)) container.remove();
        else link.remove();
      });

      const contentCell = table.querySelector("tr:nth-child(2) td:last-child");
      const actions = moduleActionLinks(module, false);
      if (!contentCell || !actions) return;
      const paragraph = document.createElement("p");
      paragraph.className = "legacy-module-actions";
      paragraph.innerHTML = actions;
      contentCell.insertBefore(paragraph, contentCell.firstChild);
      const missing = moduleMissingSources(module);
      if (missing) paragraph.insertAdjacentHTML("afterend", missing);
    });
  }

  function renderGallery() {
    setTitle("Galerie");
    const allowedGroups = new Set(["Galerie", "Fotogalerie", "Knihy a obálky"]);
    const images = data.catalog.filter(function (item) {
      return allowedGroups.has(item.group) && ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(item.extension);
    });
    const figures = images.slice(0, 150).map(function (item) {
      const href = safeHref(item.href);
      return `<figure class="gallery-item"><a href="${escapeHtml(href)}"><img src="${escapeHtml(href)}" alt="${escapeHtml(item.title)}" loading="lazy"></a><figcaption>${escapeHtml(item.title)}<br><span class="meta">${escapeHtml(item.group)}</span></figcaption></figure>`;
    }).join("");
    main.innerHTML = `<h1>Galerie a obrazový archiv</h1><p>Zobrazeno ${Math.min(150, images.length)} z ${images.length} dohledaných obrazových souborů. Další položky lze zvolit podle skupiny v <a href="#/materials">katalogu materiálů</a>.</p><div class="gallery-grid">${figures}</div>`;
  }

  function archivePageList(pages, summaries) {
    return `<ul class="archive-list">${pages.map(function (page) {
      return `<li><a href="#/page/${encodeURIComponent(page.slug)}">${escapeHtml(page.title)}</a>${summaries && page.summary ? `<small>${escapeHtml(page.summary)}</small>` : ""}</li>`;
    }).join("")}</ul>`;
  }

  function renderOtherArchive(query) {
    setTitle("Ostatní články a stránky");
    const search = normalize(query.get("q") || "");
    const pages = data.pages.filter(function (page) {
      const excludedGroups = new Set(["Moduly", "Profily autorů", "Časopis Dech draka", "Časopis Alduron", "Časopis Legenda"]);
      if (excludedGroups.has(page.group) || ["uvod"].includes(page.slug)) return false;
      return !search || normalize(page.title + " " + page.summary + " " + page.group).includes(search);
    });
    const groups = {};
    pages.forEach(function (page) {
      if (!groups[page.group]) groups[page.group] = [];
      groups[page.group].push(page);
    });
    const sections = Object.keys(groups).sort(function (a, b) { return a.localeCompare(b, "cs"); }).map(function (group) {
      return `<section class="archive-group"><h2>${escapeHtml(group)}</h2>${archivePageList(groups[group], true)}</section>`;
    }).join("");
    main.innerHTML = `<p class="archive-back"><a href="#/archive">← Zpět na rozcestník archivu</a></p><h1>Ostatní články a stránky</h1><p>Obecné texty o Asterionu, staré rozcestníky, galerie a další obsah, který nepatří k časopisům, profilům autorů ani jednotlivým modulům.</p>${sections || '<p class="empty-result">Nebyly nalezeny žádné stránky.</p>'}`;
  }

  function renderArchive(path, query) {
    const magazines = [
      { route: "dech-draka", title: "Dech draka", group: "Dech draka", description: "Rozsáhlý archiv povídek, článků a herních materiálů." },
      { route: "alduron", title: "Alduron", group: "Alduron", description: "Dva dochované články o světě Asterionu." },
      { route: "legenda", title: "Legenda", group: "Legenda", description: "Tři dochované části článku o Asterionu." }
    ].map(function (magazine) {
      magazine.count = data.catalog.filter(function (item) { return item.group === magazine.group; }).length;
      return magazine;
    });

    if (path === "archive/other") {
      renderOtherArchive(query);
      return;
    }

    setTitle("Archiv článků");
    const magazineLinks = magazines.map(function (magazine) {
      return `<li><a href="#/archive/${magazine.route}">${escapeHtml(magazine.title)}</a><span>${magazine.count} ${magazine.count === 1 ? "soubor" : (magazine.count < 5 ? "soubory" : "souborů")}</span><small>${escapeHtml(magazine.description)}</small></li>`;
    }).join("");
    main.innerHTML = `
      <h1>Archiv článků</h1>
      <p>Archiv je rozdělen podle původu textů. Časopisecké články už nejsou promíchané s podstránkami herních modulů. Přehled a profily tvůrců jsou dostupné přímo jako <a href="#/page/autori">Všichni autoři</a>.</p>
      <div class="archive-index">
        <section class="archive-card">
          <h2>Články v časopisech</h2>
          <ul class="magazine-list">${magazineLinks}</ul>
        </section>
        <section class="archive-card">
          <h2><a href="#/archive/other">Ostatní články a stránky</a></h2>
          <p>Obecné články, historické rozcestníky, zápisy z her, galerie a další zachovaný obsah.</p>
        </section>
        <section class="archive-card module-archive-note">
          <h2>Podstránky herních modulů</h2>
          <p>V tomto archivu se už neopakují. Zůstávají dostupné v samostatné sekci <a href="#/modules">Herní moduly</a>.</p>
        </section>
      </div>`;
  }

  function renderLegacyPage(slug) {
    const page = data.pages.find(function (item) { return item.slug === slug; });
    if (!page) {
      setTitle("Stránka nenalezena");
      main.innerHTML = '<h1>Stránka nebyla nalezena</h1><p><a href="#/archive">Přejít do archivu článků</a></p>';
      return;
    }
    setTitle(page.title);
    const isPublicationsPage = page.slug === "dosud-vyslo";
    const publicationOverview = isPublicationsPage ? renderPublicationOverview() : "";
    const legacyHeading = isPublicationsPage ? '<h2 class="legacy-section-title">Herní moduly</h2>' : "";
    const sourceNote = isPublicationsPage
      ? `Knižní část je doplněná z místní zálohy a vydavatelských záznamů · <a href="${escapeHtml(page.original)}" target="_blank" rel="noopener noreferrer">původní přehled modulů</a>`
      : `Zachovaný obsah původní stránky · <a href="${escapeHtml(page.original)}" target="_blank" rel="noopener noreferrer">veřejný originál</a>`;
    main.innerHTML = `<article class="legacy-page" data-page="${escapeHtml(page.slug)}"><h1>${escapeHtml(page.title)}</h1><p class="source-note">${sourceNote}</p>${publicationOverview}${legacyHeading}<div class="legacy-content">${page.html}</div></article>`;
    if (isPublicationsPage) enhanceLegacyModuleTables(main.querySelector(".legacy-content"));
  }

  function renderPublicationOverview() {
    const publications = data.publications;
    if (!publications || !Array.isArray(publications.groups)) return "";

    const groups = publications.groups.map(function (group) {
      const items = Array.isArray(group.items) ? group.items : [];
      const cards = items.map(function (item) {
        const cover = safeHref(item.cover);
        const note = item.note ? `<p class="publication-note">${escapeHtml(item.note)}</p>` : "";
        const purchase = item.purchase && item.purchase.url
          ? `<p class="publication-purchase"><a href="${escapeHtml(safeHref(item.purchase.url))}"${linkAttributes(item.purchase.url)}>${escapeHtml(item.purchase.label || "Koupit na Imagu")}</a></p>`
          : "";
        return `
          <article class="publication-card">
            <img src="${escapeHtml(cover)}" alt="Obálka knihy ${escapeHtml(item.title)}" loading="lazy">
            <div>
              <h4>${escapeHtml(item.title)}</h4>
              <p class="publication-author">${escapeHtml(item.author)}</p>
              <p class="publication-kind">${escapeHtml(item.kind)}</p>
              ${note}
              ${purchase}
            </div>
          </article>`;
      }).join("");
      return `
        <section class="publication-group" aria-labelledby="publication-${escapeHtml(group.id)}">
          <h3 id="publication-${escapeHtml(group.id)}">${escapeHtml(group.title)}</h3>
          <p>${escapeHtml(group.description)}</p>
          <div class="publication-grid">${cards}</div>
        </section>`;
    }).join("");

    return `
      <section class="publication-overview" aria-labelledby="publication-overview-title">
        <h2 id="publication-overview-title">${escapeHtml(publications.title)}</h2>
        <p>${escapeHtml(publications.intro)}</p>
        ${publications.store_url ? `<p class="store-overview"><a href="${escapeHtml(safeHref(publications.store_url))}"${linkAttributes(publications.store_url)}>Všechny dostupné asterionské knihy na Imagu</a></p>` : ""}
        ${groups}
      </section>`;
  }

  function renderRoute() {
    if (!data) {
      main.innerHTML = '<p class="error-message">Nepodařilo se načíst lokální datový soubor.</p>';
      return;
    }
    const route = routeInfo();
    updateActiveNavigation(route.path);
    if (route.path === "home") renderHome();
    else if (route.path === "dech-draka") renderDechDraka(route.query);
    else if (["materials", "maps", "adventures", "indexes", "archive/dech-draka", "archive/alduron", "archive/legenda"].includes(route.path)) renderCatalog(route.path, route.query);
    else if (route.path === "rules") renderRules();
    else if (route.path === "modules") renderModules();
    else if (route.path === "gallery") renderGallery();
    else if (route.path === "archive/authors") renderLegacyPage("autori");
    else if (route.path === "archive" || route.path === "archive/other") renderArchive(route.path, route.query);
    else if (route.path.startsWith("page/")) renderLegacyPage(route.path.slice(5));
    else renderHome();

    if (window.matchMedia("(max-width: 650px)").matches) {
      menu.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
    }
    main.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  menuToggle.addEventListener("click", function () {
    const open = menu.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(open));
  });

  themeToggle.addEventListener("click", function () {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(next, true);
  });

  searchForm.addEventListener("submit", function (event) {
    event.preventDefault();
    const value = searchInput.value.trim();
    location.hash = value ? "#/materials?q=" + encodeURIComponent(value) : "#/materials";
  });

  const requestedTheme = new URLSearchParams(location.search).get("theme");
  const initialTheme = requestedTheme === "dark" || requestedTheme === "light"
    ? requestedTheme
    : (storedTheme() === "dark" ? "dark" : "light");
  applyTheme(initialTheme, false);
  renderSidebar();
  window.addEventListener("hashchange", renderRoute);
  renderRoute();
}());
