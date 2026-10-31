/* ============================================================
   PAINEL ADMINISTRATIVO ALARES
   - Login: Firebase Authentication (e-mail e senha)
   - Conteúdo do site: Firestore  site/content
   - Imagens enviadas:  Firestore  images/{id}
   - Pedidos de ligação: Firestore leads/{id} (tempo real)
   ============================================================ */
(function () {
  "use strict";
  var AL = window.AL;
  var $ = function (s, r) { return (r || document).querySelector(s); };

  /* ---------- helpers de DOM ---------- */
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === "class") el.className = v;
      else if (k.slice(0, 2) === "on") el[k] = v;
      else if (v === true) el.setAttribute(k, "");
      else el.setAttribute(k, v);
    });
    for (var i = 2; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }
  function add(el, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) c.forEach(function (x) { add(el, x); });
    else el.appendChild(typeof c === "object" ? c : document.createTextNode(String(c)));
  }
  var uid = function (p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); };
  var fm = function (v) { return Number(v || 0).toFixed(2).replace(".", ","); };
  var digits = function (s) { return String(s || "").replace(/\D/g, ""); };

  /* ---------- estado ---------- */
  var db, fs, auth, A;
  var draft = null, pubStr = "", published = false, dirty = false;
  var images = {}, imgDirty = true;
  var leads = [], leadsErr = "", leadsInit = false;
  var tab = "textos", started = false;
  var pvReady = false, pvMode = "d", thumbUpd = [];
  var OPEN = new WeakSet();

  var TABS = [
    ["textos", "Textos e números"], ["planos", "Planos"], ["regioes", "Regiões"], ["apps", "Aplicativos"],
    ["cards", "Entretenimento"], ["avaliacoes", "Avaliações"], ["faq", "Dúvidas"], ["whatsapp", "WhatsApp"],
    ["_"], ["leads", "Ligações recebidas"]
  ];
  var GOTO = { planos: "planos", regioes: "planos", apps: "planos", cards: "servicos", avaliacoes: "avaliacoes", faq: "duvidas" };
  var iconOpts = Object.keys(AL.ICONS).map(function (k) { return [k, AL.ICONS[k]]; });

  /* ---------- avisos ---------- */
  var toastT;
  function toast(msg, kind) {
    var t = $("#toast"); t.textContent = msg; t.className = "toast on " + (kind || "");
    clearTimeout(toastT); toastT = setTimeout(function () { t.className = "toast"; }, 3800);
  }
  function errMsg(e) {
    var c = e && e.code || "";
    if (c.indexOf("permission-denied") >= 0) return "Sem permissão. Confira as regras do Firestore e se o seu e-mail é o administrador (veja o README).";
    if (c.indexOf("unavailable") >= 0 || c.indexOf("network") >= 0) return "Sem conexão com o Firebase. Tente de novo.";
    return "Erro: " + (c || (e && e.message) || "desconhecido");
  }

  /* ---------- estado do rascunho ---------- */
  function changed() {
    dirty = !published || JSON.stringify(draft) !== pubStr;
    updState(); schedulePreview();
  }
  function updState() {
    var p = $("#state");
    if (!published) { p.textContent = "Conteúdo inicial – ainda não publicado"; p.className = "pill dirty"; }
    else if (dirty) { p.textContent = "Alterações não publicadas"; p.className = "pill dirty"; }
    else { p.textContent = "Tudo publicado ✓"; p.className = "pill ok"; }
    $("#bpub").disabled = published && !dirty;
    $("#bdisc").hidden = !(published && dirty);
  }
  window.addEventListener("beforeunload", function (e) { if (dirty && published) { e.preventDefault(); e.returnValue = ""; } });

  /* ---------- campos ---------- */
  function fText(o, k, label, opt) {
    opt = opt || {};
    var el = opt.area ? h("textarea", { rows: opt.rows || 3 }) : h("input", { type: "text", placeholder: opt.ph || "" });
    el.value = o[k] == null ? "" : o[k];
    el.oninput = function () { o[k] = el.value; changed(); };
    return h("label", { class: opt.cls || (opt.area ? "span2" : "") }, label, opt.hint ? h("span", { class: "hint" }, opt.hint) : null, el);
  }
  function fNum(o, k, label, opt) {
    opt = opt || {};
    var el = h("input", { type: "number", step: opt.step || 1, min: opt.min != null ? opt.min : 0, max: opt.max });
    el.value = o[k] == null ? "" : o[k];
    el.oninput = function () { var v = parseFloat(el.value); o[k] = isNaN(v) ? 0 : v; changed(); };
    return h("label", null, label, opt.hint ? h("span", { class: "hint" }, opt.hint) : null, el);
  }
  function fSelect(o, k, label, opts) {
    var el = h("select", null, opts.map(function (x) { return h("option", { value: x[0] }, x[1]); }));
    el.value = o[k] == null ? "" : o[k];
    el.onchange = function () { o[k] = el.value; changed(); };
    return h("label", null, label, el);
  }
  function fCheck(o, k, label) {
    var el = h("input", { type: "checkbox" }); el.checked = !!o[k];
    el.onchange = function () { o[k] = el.checked; changed(); };
    return h("label", { class: "chk" }, el, label);
  }
  function fColor(o, k, label) {
    var el = h("input", { type: "color" }); el.value = /^#[0-9a-f]{6}$/i.test(o[k] || "") ? o[k] : "#2563ff";
    el.oninput = function () { o[k] = el.value; changed(); };
    return h("label", null, label, el);
  }
  function sect(title, node, hint) {
    return h("div", { class: "sect" }, h("h4", null, title, hint ? h("span", { class: "hint" }, " – " + hint) : null), node);
  }
  function multi(arr, options, onToggle) {
    return h("div", { class: "chks" }, options.length ? options.map(function (o) {
      var cb = h("input", { type: "checkbox" }); cb.checked = arr.indexOf(o[0]) >= 0;
      cb.onchange = function () {
        var i = arr.indexOf(o[0]);
        if (cb.checked && i < 0) arr.push(o[0]); else if (!cb.checked && i >= 0) arr.splice(i, 1);
        onToggle && onToggle(); changed();
      };
      return h("label", { class: "chk" }, cb, o[1]);
    }) : h("span", { class: "muted" }, "Nada cadastrado ainda."));
  }
  function strList(arr, opt) {
    opt = opt || {};
    var box = h("div");
    function draw(focusLast) {
      box.innerHTML = "";
      arr.forEach(function (v, i) {
        var inp = h("input", { type: "text", placeholder: opt.ph || "" }); inp.value = v;
        inp.oninput = function () { arr[i] = inp.value; changed(); };
        box.appendChild(h("div", { class: "srow" }, inp,
          h("button", { class: "ib x", type: "button", title: "Remover", onclick: function () { arr.splice(i, 1); changed(); draw(); } }, "✕")));
      });
      box.appendChild(h("button", { class: "btn sm", type: "button", onclick: function () { arr.push(""); changed(); draw(true); } }, opt.addLabel || "+ Adicionar"));
      if (focusLast) { var ins = box.querySelectorAll("input"); if (ins.length) ins[ins.length - 1].focus(); }
    }
    draw();
    return box;
  }
  function itemList(arr, opt) {
    var box = h("div");
    function move(i, d) {
      var j = i + d; if (j < 0 || j >= arr.length) return;
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t; changed(); draw();
    }
    function draw() {
      box.innerHTML = "";
      if (!arr.length) box.appendChild(h("div", { class: "empty" }, opt.empty || "Nada cadastrado ainda."));
      arr.forEach(function (it, i) {
        var tt = h("span", { class: "tt" }, opt.title(it, i));
        var stop = function (fn) { return function (ev) { ev.preventDefault(); ev.stopPropagation(); fn(); }; };
        var sum = h("summary", null, tt, opt.badge ? opt.badge(it) : null,
          h("button", { class: "ib", type: "button", title: "Subir", disabled: i === 0, onclick: stop(function () { move(i, -1); }) }, "↑"),
          h("button", { class: "ib", type: "button", title: "Descer", disabled: i === arr.length - 1, onclick: stop(function () { move(i, 1); }) }, "↓"),
          h("button", { class: "ib x", type: "button", title: "Excluir", onclick: stop(function () {
            if (!confirm(opt.confirm || "Excluir este item?")) return;
            var r = arr.splice(i, 1)[0];
            if (opt.onRemove) opt.onRemove(r);
            changed(); draw(); if (opt.after) opt.after();
          }) }, "✕"));
        var det = h("details", { class: "item" }, sum, h("div", { class: "body" }, opt.body(it, i)));
        if (OPEN.has(it)) det.open = true;
        det.addEventListener("toggle", function () { if (det.open) OPEN.add(it); else OPEN.delete(it); });
        det.addEventListener("input", function () { tt.textContent = opt.title(it, i); });
        box.appendChild(det);
      });
      box.appendChild(h("button", { class: "btn", type: "button", onclick: function () {
        var n = opt.make(); arr.push(n); OPEN.add(n); changed(); draw(); if (opt.after) opt.after();
        var ds = box.querySelectorAll(":scope > details.item"); if (ds.length) ds[ds.length - 1].scrollIntoView({ block: "nearest", behavior: "smooth" });
      } }, opt.addLabel || "+ Adicionar"));
    }
    draw();
    return box;
  }
  function head(t, s) { return [h("h2", null, t), h("p", { class: "sub" }, s)]; }

  /* ============================================================
     VIEWS
     ============================================================ */
  function vTextos() {
    var out = head("Textos e números", "Edite qualquer texto do site. Dica: coloque *asteriscos* em volta de uma palavra para ela ficar em destaque azul.");
    var groups = [];
    AL.TEXT_FIELDS.forEach(function (f) { if (groups.indexOf(f.g) < 0) groups.push(f.g); });
    groups.forEach(function (g) {
      out.push(h("div", { class: "box" }, h("h3", null, g),
        h("div", { class: "grid2" }, AL.TEXT_FIELDS.filter(function (f) { return f.g === g; }).map(function (f) {
          return fText(draft.texts, f.k, f.l, { area: !!f.long, cls: f.long ? "span2" : "" });
        }))));
      if (g === "Início (topo do site)") {
        out.push(h("div", { class: "box" }, h("h3", null, "Números do topo (Clientes, Uptime, Cidades…)"),
          itemList(draft.stats, {
            title: function (s) { return (s.n || 0) + (s.s || "") + " " + (s.l || ""); },
            body: function (s) { return h("div", { class: "grid4" }, fNum(s, "n", "Número", { step: .1 }), fNum(s, "d", "Casas decimais"), fText(s, "s", "Depois do número", { ph: "% ou  mil" }), fText(s, "l", "Rótulo")); },
            make: function () { return { n: 100, d: 0, s: "", l: "Novo" }; }, addLabel: "+ Número", confirm: "Excluir este número?"
          })));
      }
      if (g === "Vantagens") {
        out.push(h("div", { class: "box" }, h("h3", null, "Cartões de vantagens"),
          itemList(draft.features, {
            title: function (f) { return f.title || "Sem título"; },
            body: function (f) { return h("div", { class: "grid2" }, fText(f, "title", "Título"), fSelect(f, "icon", "Ícone", iconOpts), fText(f, "text", "Texto", { area: true, rows: 2 })); },
            make: function () { return { icon: "check", title: "Nova vantagem", text: "" }; }, addLabel: "+ Vantagem", confirm: "Excluir esta vantagem?"
          })));
      }
    });
    return out;
  }

  function newPlan() {
    var p = { id: uid("p"), name: "Novo plano", mega: 500, price: 99.9, icon: "wifi", up: 250, choose: 0, popular: false, title: "",
      features: ["Wi-Fi 6 incluso", "Instalação grátis"], apps: ["wifi", "av"].filter(function (id) { return draft.apps.some(function (a) { return a.id === id; }); }) };
    p.benefits = AL.makeBenefits(p);
    draft.regions.forEach(function (r) { r.plans.push(p.id); });
    return p;
  }
  function planBody(p) {
    var regionBox = multi([], []);
    var regs = draft.regions;
    var rc = h("div", { class: "chks" }, regs.length ? regs.map(function (r) {
      var cb = h("input", { type: "checkbox" }); cb.checked = r.plans.indexOf(p.id) >= 0;
      cb.onchange = function () {
        var i = r.plans.indexOf(p.id);
        if (cb.checked && i < 0) r.plans.push(p.id); else if (!cb.checked && i >= 0) r.plans.splice(i, 1);
        changed();
      };
      return h("label", { class: "chk" }, cb, r.name);
    }) : h("span", { class: "muted" }, "Cadastre regiões primeiro."));
    var benBox = h("div");
    function drawBen() {
      benBox.innerHTML = "";
      benBox.appendChild(itemList(p.benefits, {
        title: function (b) { return b.title || "Item"; },
        body: function (b) { return h("div", { class: "grid2" }, fText(b, "title", "Título"), fSelect(b, "icon", "Ícone", iconOpts), fText(b, "sub", "Texto menor", { hint: "pode usar {mega} {up} {name} {price}" }), fCheck(b, "green", "Texto menor em verde")); },
        make: function () { return { icon: "check", title: "Novo item", sub: "", green: false }; }, addLabel: "+ Detalhe", confirm: "Excluir este detalhe?"
      }));
      benBox.appendChild(h("button", { class: "btn sm danger", type: "button", style: "margin-top:8px", onclick: function () {
        if (!confirm("Voltar os detalhes deste plano para o padrão?")) return;
        p.benefits = AL.makeBenefits(p); changed(); drawBen();
      } }, "Restaurar detalhes padrão"));
    }
    drawBen();
    return h("div", { class: "body-in", style: "display:grid;gap:14px" },
      h("div", { class: "grid3" }, fText(p, "name", "Nome do plano"), fNum(p, "mega", "Velocidade (Mega)"), fNum(p, "price", "Preço mensal (R$)", { step: .01 })),
      h("div", { class: "grid3" }, fNum(p, "up", "Upload (Mbps)"), fNum(p, "choose", "Streamings à escolha", { hint: "0 = nenhum" }), fSelect(p, "icon", "Ícone do cartão", iconOpts)),
      fCheck(p, "popular", "Destacar como plano popular (faixa azul)"),
      fText(p, "title", "Título da janela de detalhes", { hint: "vazio = automático, ex.: 500 MEGA + 1 STREAMING À ESCOLHA", cls: "span2" }),
      sect("Itens do cartão (lista com ✓)", strList(p.features, { addLabel: "+ Item", ph: "Ex.: Wi-Fi 6 incluso" })),
      sect("Aplicativos incluídos neste plano", multi(p.apps, draft.apps.map(function (a) { return [a.id, a.name]; }))),
      sect("Disponível nas regiões", rc),
      sect("Detalhes na janela do plano", benBox, "ícone, título e texto de cada benefício")
    );
  }
  function vPlanos() {
    return head("Planos", "Preço, velocidade, aplicativos incluídos e regiões de cada plano. A ordem aqui é a ordem no site.").concat([
      itemList(draft.plans, {
        title: function (p) { return (p.name || "Sem nome") + " · " + p.mega + " Mega · R$ " + fm(p.price); },
        body: planBody, make: newPlan, addLabel: "+ Novo plano",
        badge: function (p) { return p.popular ? h("span", { class: "tag g" }, "popular") : null; },
        onRemove: function (p) { draft.regions.forEach(function (r) { r.plans = r.plans.filter(function (id) { return id !== p.id; }); }); },
        confirm: "Excluir este plano? Ele some de todas as regiões."
      })]);
  }

  function vRegioes() {
    return head("Regiões", "Cidades que aparecem na busca do site e quais planos existem em cada uma. Exclua ou adicione quando quiser.").concat([
      itemList(draft.regions, {
        title: function (r) { return (r.name || "Sem nome") + " · " + r.plans.length + " plano(s)"; },
        body: function (r) {
          var chk = h("div", { class: "chks" });
          function draw() {
            chk.innerHTML = "";
            draft.plans.forEach(function (p) {
              var cb = h("input", { type: "checkbox" }); cb.checked = r.plans.indexOf(p.id) >= 0;
              cb.onchange = function () {
                var i = r.plans.indexOf(p.id);
                if (cb.checked && i < 0) r.plans.push(p.id); else if (!cb.checked && i >= 0) r.plans.splice(i, 1);
                changed();
              };
              chk.appendChild(h("label", { class: "chk" }, cb, p.name + " (" + p.mega + ")"));
            });
            if (!draft.plans.length) chk.appendChild(h("span", { class: "muted" }, "Cadastre planos primeiro."));
          }
          draw();
          return h("div", { style: "display:grid;gap:12px" },
            fText(r, "name", "Nome da região (aparece para o cliente)", { ph: "Ex.: Sorocaba – SP", cls: "span2" }),
            sect("Planos disponíveis nesta região", chk),
            h("div", { class: "bar" },
              h("button", { class: "btn sm", type: "button", onclick: function () { r.plans = draft.plans.map(function (p) { return p.id; }); changed(); draw(); } }, "Marcar todos"),
              h("button", { class: "btn sm", type: "button", onclick: function () { r.plans = []; changed(); draw(); } }, "Limpar")));
        },
        make: function () { return { id: uid("r"), name: "Nova cidade – UF", plans: draft.plans.map(function (p) { return p.id; }) }; },
        addLabel: "+ Nova região", confirm: "Excluir esta região?"
      })]);
  }

  function appSw(a) {
    var el = h("div", { class: "sw" });
    function upd() {
      el.style.background = "linear-gradient(135deg," + (a.c1 || "#2563ff") + "," + (a.c2 || "#7c3aed") + ")";
      el.textContent = a.symbol ? "★" : (a.glyph || "");
    }
    upd(); el.__upd = upd; return el;
  }
  function vApps() {
    return head("Aplicativos e benefícios", "Tudo o que pode ser incluído em um plano: streamings, antivírus, nuvem, equipamento… Depois você marca em cada plano quais valem.").concat([
      itemList(draft.apps, {
        title: function (a) { return (a.name || "Sem nome") + " · " + (a.kind || ""); },
        body: function (a) {
          var sw = appSw(a);
          var body = h("div", { style: "display:grid;gap:12px" },
            h("div", { class: "bar" }, sw, h("span", { class: "muted" }, "Prévia do ícone")),
            h("div", { class: "grid2" }, fText(a, "name", "Nome"), fText(a, "kind", "Categoria", { ph: "Streaming, Segurança…" })),
            h("div", { class: "grid4" }, fText(a, "glyph", "Letra/sigla do ícone", { ph: "G, D+, max" }),
              fSelect(a, "symbol", "…ou ícone", [["", "— usar a letra —"]].concat(iconOpts)), fColor(a, "c1", "Cor 1"), fColor(a, "c2", "Cor 2")),
            fText(a, "desc", "Descrição", { area: true, rows: 2 }),
            sect("O que está incluso", strList(a.items, { addLabel: "+ Item", ph: "Ex.: Até 4 telas ao mesmo tempo" })));
          body.addEventListener("input", function () { sw.__upd(); });
          body.addEventListener("change", function () { sw.__upd(); });
          return body;
        },
        make: function () { return { id: uid("a"), name: "Novo aplicativo", kind: "Streaming", c1: "#2563ff", c2: "#7c3aed", glyph: "N", symbol: "", desc: "", items: [] }; },
        addLabel: "+ Novo aplicativo",
        onRemove: function (a) {
          draft.plans.forEach(function (p) { p.apps = p.apps.filter(function (x) { return x !== a.id; }); });
          draft.cards.forEach(function (c) { if (c.app === a.id) c.app = ""; });
        },
        confirm: "Excluir este aplicativo? Ele sai de todos os planos."
      })]);
  }

  /* ---------- imagens dos cartões ---------- */
  function adminSrc(cd) {
    if (!cd.image) return "";
    if (String(cd.image).indexOf("fs:") === 0) return images[String(cd.image).slice(3)] || "";
    return /^https?:\/\//i.test(cd.image) ? cd.image : "";
  }
  function resizeToDataUrl(file) {
    return createImageBitmap(file).then(function (bmp) {
      var W = 520, H = 720, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
      var cx = cv.getContext("2d"), s = Math.max(W / bmp.width, H / bmp.height), w = bmp.width * s, hh = bmp.height * s;
      cx.fillStyle = "#000"; cx.fillRect(0, 0, W, H); cx.drawImage(bmp, (W - w) / 2, (H - hh) / 2, w, hh);
      var q = .82, url = cv.toDataURL("image/jpeg", q);
      while (url.length > 700000 && q > .4) { q -= .1; url = cv.toDataURL("image/jpeg", q); }
      return url;
    });
  }
  function imgBlock(cd) {
    var thumb = h("div", { class: "thumb" });
    var urlIn = h("input", { type: "text", placeholder: "Cole o link (https://…) de uma imagem vertical" });
    urlIn.value = (cd.image && String(cd.image).indexOf("fs:") !== 0) ? cd.image : "";
    var file = h("input", { type: "file", accept: "image/*", hidden: true });
    function upd() {
      var s = adminSrc(cd);
      thumb.style.backgroundImage = s ? 'url("' + s.replace(/"/g, "%22") + '")' : "";
      thumb.textContent = s ? "" : "Ilustração padrão";
    }
    thumbUpd.push(upd); upd();
    urlIn.oninput = function () { cd.image = urlIn.value.trim(); upd(); changed(); };
    file.onchange = function () {
      var f = file.files && file.files[0]; if (!f) return;
      toast("Enviando imagem…");
      resizeToDataUrl(f).then(function (url) {
        return fs.setDoc(fs.doc(db, "images", cd.id), { data: url }).then(function () {
          images[cd.id] = url; imgDirty = true; cd.image = "fs:" + cd.id; urlIn.value = ""; upd(); changed();
          toast("Imagem enviada! Ela já aparece no site ao publicar.", "ok");
        });
      }).catch(function (e) { toast(errMsg(e), "bad"); });
      file.value = "";
    };
    var rm = h("button", { class: "btn sm danger", type: "button", onclick: function () {
      var was = String(cd.image || "");
      cd.image = ""; urlIn.value = ""; delete images[cd.id]; imgDirty = true; upd(); changed();
      if (was.indexOf("fs:") === 0) fs.deleteDoc(fs.doc(db, "images", cd.id)).catch(function () {});
    } }, "Remover imagem");
    return h("div", { class: "imgrow" }, thumb, h("div", null,
      h("label", null, "Imagem do cartão", h("span", { class: "hint" }, "vertical, de preferência 520×720"), urlIn),
      h("div", { class: "bar" }, h("button", { class: "btn sm", type: "button", onclick: function () { file.click(); } }, "Enviar do computador"), rm, file),
      h("span", { class: "hint" }, "Sem imagem, o site mostra uma ilustração automática.")));
  }
  function vCards() {
    return head("Entretenimento incluso", "Os cartões que passam na faixa \"Entretenimento incluso no seu plano\". Troque a imagem, o texto sobre ela e a descrição.").concat([
      itemList(draft.cards, {
        title: function (c) {
          var a = draft.apps.find(function (x) { return x.id === c.app; });
          return (a ? a.name : "Sem app") + (c.title ? " · " + c.title : "");
        },
        body: function (c) {
          return h("div", { style: "display:grid;gap:12px" },
            h("div", { class: "grid3" },
              fSelect(c, "app", "Aplicativo (nome e ícone)", [["", "— nenhum —"]].concat(draft.apps.map(function (a) { return [a.id, a.name]; }))),
              fText(c, "tag", "Texto pequeno sobre a imagem", { ph: "Em cartaz" }),
              fText(c, "title", "Título sobre a imagem", { ph: "NOME DA SÉRIE" })),
            fText(c, "desc", "Descrição do cartão", { area: true, rows: 2 }),
            imgBlock(c));
        },
        make: function () { return { id: uid("c"), app: draft.apps[0] ? draft.apps[0].id : "", art: "", tag: "", title: "", image: "", desc: "" }; },
        addLabel: "+ Novo cartão",
        onRemove: function (c) { if (String(c.image || "").indexOf("fs:") === 0) fs.deleteDoc(fs.doc(db, "images", c.id)).catch(function () {}); },
        confirm: "Excluir este cartão?"
      })]);
  }

  function vAval() {
    return head("Avaliações", "Depoimentos que rolam na faixa \"Quem usa, recomenda\".").concat([
      itemList(draft.reviews, {
        title: function (r) { return (r.name || "Sem nome") + " — " + (r.city || "") + "  (" + (r.stars || 0) + "★)"; },
        body: function (r) {
          return h("div", { class: "grid3" }, fText(r, "name", "Nome"), fText(r, "city", "Cidade"), fNum(r, "stars", "Estrelas (0 a 5)", { step: .5, max: 5 }),
            fText(r, "text", "Depoimento", { area: true, rows: 3 }));
        },
        make: function () { return { name: "Novo cliente", city: "", text: "", stars: 5 }; }, addLabel: "+ Nova avaliação", confirm: "Excluir esta avaliação?"
      })]);
  }

  function vFaq() {
    return head("Dúvidas frequentes", "Perguntas e respostas que abrem e fecham no site.").concat([
      itemList(draft.faq, {
        title: function (f) { return f.q || "Pergunta sem título"; },
        body: function (f) { return h("div", { style: "display:grid;gap:12px" }, fText(f, "q", "Pergunta", { cls: "span2" }), fText(f, "a", "Resposta", { area: true, rows: 4 })); },
        make: function () { return { q: "Nova pergunta?", a: "" }; }, addLabel: "+ Nova pergunta", confirm: "Excluir esta pergunta?"
      })]);
  }

  function vWhats() {
    var w = draft.whatsapp, prev = h("div", { class: "hint", style: "margin-top:6px" });
    function sample() {
      var p = draft.plans[0] || { name: "Plano", mega: 500, price: 99.9 }, r = draft.regions[0] ? draft.regions[0].name : "Sua cidade";
      var v = { plano: p.name, velocidade: p.mega >= 1000 ? (p.mega / 1000) + " Giga" : p.mega + " Mega", preco: fm(p.price), regiao: r };
      prev.textContent = "Exemplo: " + String(w.planMsg || "").replace(/\{(plano|velocidade|preco|regiao)\}/g, function (m, k) { return v[k]; });
    }
    sample();
    var num = fNum(w, "number", "Número do WhatsApp", { hint: "só números: 55 + DDD + número. Ex.: 5515999999999", min: 0 });
    var numIn = num.querySelector("input"); numIn.type = "text"; numIn.inputMode = "numeric"; numIn.value = w.number || "";
    numIn.oninput = function () { w.number = digits(numIn.value); changed(); };
    var plan = fText(w, "planMsg", "Mensagem quando o cliente escolhe um plano", { area: true, rows: 3, hint: "use {plano} {velocidade} {preco} {regiao}" });
    plan.querySelector("textarea").addEventListener("input", sample);
    return head("WhatsApp", "O número vale para o botão flutuante e para todos os botões \"Contratar\" e \"Assinar\".").concat([
      h("div", { class: "box" }, h("div", { class: "grid2" }, num, fText(w, "tooltip", "Texto do balão do botão verde")),
        fText(w, "floatMsg", "Mensagem do botão verde flutuante", { area: true, rows: 2, cls: "span2" })),
      h("div", { class: "box" }, plan, prev,
        h("div", { class: "bar", style: "margin-top:12px" }, h("button", { class: "btn sm", type: "button", onclick: function () {
          var n = digits(w.number); if (n.length < 10) return toast("Digite o número primeiro.", "bad");
          var p = draft.plans[0]; var m = String(w.planMsg || "").replace(/\{(plano|velocidade|preco|regiao)\}/g, function (x, k) {
            return { plano: p ? p.name : "", velocidade: p ? p.mega + " Mega" : "", preco: p ? fm(p.price) : "", regiao: draft.regions[0] ? draft.regions[0].name : "" }[k];
          });
          window.open("https://wa.me/" + n + "?text=" + encodeURIComponent(m), "_blank", "noopener");
        } }, "Testar no WhatsApp"))),
      h("div", { class: "box" }, h("h3", null, "Zona de perigo"),
        h("p", { class: "muted", style: "margin-bottom:10px" }, "Volta todo o conteúdo para o modelo inicial do site. Só vale depois de você clicar em Publicar."),
        h("button", { class: "btn danger", type: "button", onclick: function () {
          if (!confirm("Restaurar TODO o conteúdo padrão? Você ainda poderá descartar antes de publicar.")) return;
          draft = AL.clone(AL.DEFAULTS); changed(); view(); toast("Conteúdo padrão carregado. Clique em Publicar para aplicar.");
        } }, "Restaurar conteúdo padrão"))]);
  }

  /* ---------- ligações recebidas ---------- */
  var leadFilter = "todos";
  var leadsBox = null;
  var ST = [["novo", "Novo"], ["contato", "Em contato"], ["concluido", "Concluído"]];
  function fmtDate(l) { return l.date ? l.date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "agora"; }
  function vLeads() {
    leadsBox = h("div");
    drawLeads();
    return head("Ligações recebidas", "Quem pediu ligação pelo site aparece aqui na hora. Mude o status conforme for atendendo.").concat([leadsBox]);
  }
  function drawLeads() {
    if (!leadsBox || tab !== "leads") return;
    leadsBox.innerHTML = "";
    if (leadsErr) { leadsBox.appendChild(h("div", { class: "box err" }, leadsErr)); return; }
    var today = new Date().toDateString();
    var nNew = leads.filter(function (l) { return l.status === "novo"; }).length;
    var nToday = leads.filter(function (l) { return l.date && l.date.toDateString() === today; }).length;
    var sel = h("select", { onchange: function () { leadFilter = sel.value; drawLeads(); } },
      [["todos", "Todos os status"]].concat(ST).map(function (o) { return h("option", { value: o[0] }, o[1]); }));
    sel.value = leadFilter;
    leadsBox.appendChild(h("div", { class: "stat" },
      h("div", null, h("b", null, leads.length), h("small", null, "total")),
      h("div", null, h("b", null, nNew), h("small", null, "novos")),
      h("div", null, h("b", null, nToday), h("small", null, "hoje")),
      h("div", { class: "bar" }, sel)));
    var list = leads.filter(function (l) { return leadFilter === "todos" || l.status === leadFilter; });
    if (!list.length) { leadsBox.appendChild(h("div", { class: "empty" }, "Nenhum pedido por aqui ainda.")); return; }
    leadsBox.appendChild(h("table", { class: "tbl" },
      h("thead", null, h("tr", null, ["Recebido", "Nome", "Telefone", "Região", "Status", ""].map(function (t) { return h("th", null, t); }))),
      h("tbody", null, list.map(function (l) {
        var d = digits(l.phone), wa = "https://wa.me/" + (d.length <= 11 ? "55" + d : d);
        var st = h("select", { onchange: function () {
          fs.updateDoc(fs.doc(db, "leads", l.id), { status: st.value }).catch(function (e) { toast(errMsg(e), "bad"); });
        } }, ST.map(function (o) { return h("option", { value: o[0] }, o[1]); }));
        st.value = l.status || "novo";
        return h("tr", { class: l.status === "novo" ? "new" : "" },
          h("td", null, fmtDate(l)), h("td", null, h("b", null, l.name)),
          h("td", null, h("a", { href: "tel:+" + (d.length <= 11 ? "55" + d : d), class: "link" }, l.phone)),
          h("td", null, l.region || "—"), h("td", null, st),
          h("td", null, h("div", { class: "bar" },
            h("a", { class: "btn sm", href: wa, target: "_blank", rel: "noopener" }, "WhatsApp"),
            h("button", { class: "ib x", type: "button", title: "Excluir", onclick: function () {
              if (confirm("Excluir este pedido de " + l.name + "?")) fs.deleteDoc(fs.doc(db, "leads", l.id)).catch(function (e) { toast(errMsg(e), "bad"); });
            } }, "✕"))));
      }))));
  }
  function beep() {
    try {
      var C = window.AudioContext || window.webkitAudioContext, c = new C(), o = c.createOscillator(), g = c.createGain();
      o.type = "sine"; o.frequency.value = 880; g.gain.value = .08; o.connect(g); g.connect(c.destination);
      o.start(); o.stop(c.currentTime + .18);
      setTimeout(function () { try { c.close(); } catch (e) {} }, 400);
    } catch (e) {}
  }
  function subscribeLeads() {
    var q = fs.query(fs.collection(db, "leads"), fs.orderBy("createdAt", "desc"));
    fs.onSnapshot(q, function (snap) {
      leadsErr = "";
      var fresh = [];
      if (leadsInit) snap.docChanges().forEach(function (c) { if (c.type === "added") fresh.push(c.doc.data()); });
      leads = [];
      snap.forEach(function (d) {
        var x = d.data(); x.id = d.id;
        x.date = x.createdAt && x.createdAt.toDate ? x.createdAt.toDate() : null;
        leads.push(x);
      });
      leadsInit = true;
      fresh.forEach(function (x) { toast("Nova ligação solicitada: " + x.name + " – " + x.phone, "ok"); beep(); });
      updBadge(); drawLeads();
    }, function (e) {
      leadsErr = errMsg(e); drawLeads();
    });
  }
  function updBadge() {
    var n = leads.filter(function (l) { return l.status === "novo"; }).length;
    var b = $("#tabs [data-t=leads] .bd");
    if (b) { b.textContent = n; b.hidden = !n; }
    document.title = (n ? "(" + n + ") " : "") + "Painel Alares";
  }

  /* ---------- navegação ---------- */
  var VIEWS = { textos: vTextos, planos: vPlanos, regioes: vRegioes, apps: vApps, cards: vCards, avaliacoes: vAval, faq: vFaq, whatsapp: vWhats, leads: vLeads };
  function drawTabs() {
    var nav = $("#tabs"); nav.innerHTML = "";
    TABS.forEach(function (t) {
      if (t[0] === "_") return nav.appendChild(h("hr"));
      var b = h("button", { "data-t": t[0], class: t[0] === tab ? "on" : "", onclick: function () { go(t[0]); } }, t[1],
        t[0] === "leads" ? h("span", { class: "bd", hidden: true }, "0") : null);
      nav.appendChild(b);
    });
    updBadge();
  }
  function view() {
    var y = window.scrollY;
    thumbUpd = [];
    var main = $("#main"); main.innerHTML = "";
    add(main, VIEWS[tab]());
    window.scrollTo(0, y);
  }
  function go(t) {
    tab = t; drawTabs(); view(); window.scrollTo(0, 0);
    if (GOTO[t]) gotoPreview(GOTO[t]);
  }
  function gotoPreview(id) {
    var f = $("#pvf"); if (f && f.contentWindow && pvReady) f.contentWindow.postMessage({ type: "alares-goto", id: id }, "*");
  }

  /* ---------- pré-visualização ---------- */
  var pvT;
  function schedulePreview() { clearTimeout(pvT); pvT = setTimeout(sendPreview, 250); }
  function sendPreview() {
    var f = $("#pvf"); if (!f || !f.contentWindow || !pvReady || !draft) return;
    var msg = { type: "alares-preview", content: draft };
    if (imgDirty) { msg.images = images; imgDirty = false; }
    f.contentWindow.postMessage(msg, "*");
  }
  function fitPreview() {
    var box = $("#pvbox"), w = $("#pvwrap"), f = $("#pvf");
    var avW = box.clientWidth - 28, avH = box.clientHeight - 8;
    if (avW <= 0 || avH <= 0) return;
    var mob = pvMode === "m", W, H, sc, left;
    if (mob) { W = 410; H = 864; sc = Math.min(avW / W, avH / H, 1); left = 14 + (avW - W * sc) / 2; }
    else { W = 1280; sc = avW / W; H = Math.round(avH / sc); left = 14; }
    w.className = "pvwrap" + (mob ? " m" : "");
    w.style.width = W + "px"; w.style.height = H + "px";
    w.style.left = left + "px"; w.style.top = "0px";
    w.style.transform = "scale(" + sc + ")";
  }
  window.addEventListener("resize", fitPreview);
  window.addEventListener("message", function (e) {
    var f = $("#pvf");
    if (f && e.source === f.contentWindow && e.data && e.data.type === "alares-ready") {
      pvReady = true; imgDirty = true; sendPreview();
      if (GOTO[tab]) gotoPreview(GOTO[tab]);
    }
  });

  /* ---------- publicar / descartar ---------- */
  function publish() {
    var n = digits(draft.whatsapp.number);
    if (n.length < 10 || n.length > 15) { toast("Número de WhatsApp inválido. Use só números, com 55 + DDD.", "bad"); go("whatsapp"); return; }
    draft.whatsapp.number = n;
    var btn = $("#bpub"); btn.disabled = true; btn.textContent = "Publicando…";
    var data = JSON.parse(JSON.stringify(draft));
    fs.setDoc(fs.doc(db, "site", "content"), data).then(function () {
      pubStr = JSON.stringify(draft); published = true; dirty = false;
      toast("Publicado! O site já foi atualizado para todo mundo.", "ok");
    }).catch(function (e) { toast(errMsg(e), "bad"); })
      .then(function () { btn.textContent = "Publicar"; updState(); });
  }
  function discard() {
    if (!confirm("Descartar tudo o que ainda não foi publicado?")) return;
    draft = JSON.parse(pubStr); dirty = false; updState(); view(); schedulePreview();
  }

  /* ---------- login (Google) ---------- */
  var ALLOWED = "excellentservices.excel@gmail.com";
  var denied = false;
  function showLogin(msg) { $("#app").hidden = true; $("#login").hidden = false; if (msg) $("#lerr").textContent = msg; }
  function authErr(e) {
    var c = (e && e.code) || "";
    if (/popup-closed|cancelled-popup/.test(c)) return "";
    if (/popup-blocked/.test(c)) return "O navegador bloqueou a janela do Google. Libere pop-ups para este site e tente de novo.";
    if (/unauthorized-domain/.test(c)) return "Este endereço ainda não está autorizado no Firebase (Authentication > Configurações > Domínios autorizados).";
    if (/operation-not-allowed/.test(c)) return "O login com Google não está ativado no Firebase (Authentication > Método de login).";
    if (/network/.test(c)) return "Sem conexão. Verifique a internet.";
    if (/operation-not-supported/.test(c)) return "O login não funciona abrindo o arquivo direto. Use o endereço publicado.";
    return "Não foi possível entrar (" + (c || "erro") + ").";
  }
  $("#lgoogle").onclick = function () {
    var btn = $("#lgoogle"); $("#lerr").textContent = ""; denied = false;
    btn.disabled = true; $("#lgtxt").textContent = "Abrindo o Google…";
    var provider = new A.GoogleAuthProvider(); provider.setCustomParameters({ prompt: "select_account" });
    A.signInWithPopup(auth, provider).catch(function (er) { $("#lerr").textContent = authErr(er); })
      .then(function () { btn.disabled = false; $("#lgtxt").textContent = "Entrar com Google"; });
  };
  $("#bout").onclick = function () { if (dirty && published && !confirm("Há alterações não publicadas. Sair mesmo assim?")) return; A.signOut(auth); };
  $("#bpub").onclick = publish;
  $("#bdisc").onclick = discard;
  $("#bpv").onclick = function () {
    var sh = $(".shell");
    if (window.innerWidth > 1180) sh.classList.toggle("nopv"); else sh.classList.toggle("pvopen");
    setTimeout(fitPreview, 60);
  };
  $("#pvclose").onclick = function () { $(".shell").classList.remove("pvopen"); };
  $("#pvmode").onclick = function (e) {
    var b = e.target.closest("button"); if (!b) return;
    pvMode = b.dataset.m;
    Array.prototype.forEach.call($("#pvmode").children, function (x) { x.classList.toggle("on", x === b); });
    fitPreview();
  };
  $("#pvf").addEventListener("load", function () { setTimeout(fitPreview, 30); });

  /* ---------- entrada ---------- */
  function enter() {
    $("#login").hidden = true; $("#app").hidden = false;
    fs.getDoc(fs.doc(db, "site", "content")).then(function (snap) {
      published = snap.exists();
      draft = AL.withDefaults(published ? snap.data() : null);
      pubStr = published ? JSON.stringify(draft) : "";
      dirty = !published;
      drawTabs(); view(); updState(); fitPreview();
      if (!started) {
        started = true;
        fs.onSnapshot(fs.collection(db, "images"), function (s) {
          var m = {}; s.forEach(function (d) { m[d.id] = d.data().data; });
          images = m; imgDirty = true; thumbUpd.forEach(function (f) { f(); }); schedulePreview();
        }, function () {});
        subscribeLeads();
      }
      if (!published) toast("Este é o conteúdo inicial. Edite o que quiser e clique em Publicar.");
    }).catch(function (e) { toast(errMsg(e), "bad"); });
  }

  var F = window.alaresFirebase;
  Promise.all([F.firestore(), F.auth()]).then(function (r) {
    db = r[0].db; fs = r[0].fs; auth = r[1].auth; A = r[1].a;
    A.onAuthStateChanged(auth, function (user) {
      if (!user) { showLogin(denied ? $("#lerr").textContent : ""); return; }
      if (String(user.email || "").toLowerCase() !== ALLOWED || user.emailVerified === false) {
        denied = true;
        showLogin("A conta " + (user.email || "") + " não tem permissão para acessar este painel.");
        A.signOut(auth); return;
      }
      denied = false; enter();
    });
  }).catch(function (e) {
    console.error(e);
    $("#lerr").textContent = "Não foi possível carregar o Firebase. Verifique a internet e tente de novo.";
  });
})();
