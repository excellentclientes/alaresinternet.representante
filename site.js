/* ============================================================
   SITE ALARES – lê tudo do Firestore em tempo real.
   Documento principal:  site/content
   Imagens enviadas:     images/{id}
   Pedidos de ligação:   leads/{id}   (o site só escreve aqui)
   ============================================================ */
(function () {
  "use strict";
  var AL = window.AL;
  var $ = function (s) { return document.querySelector(s); };
  var ic = function (n) { return '<svg class="i"><use href="#' + n + '"/></svg>'; };
  var PREVIEW = /[?&]preview=1/.test(location.search);
  var CACHE_KEY = "alares_content_v1";
  var S = { c: null, images: {}, region: null, spd: 0, first: true, locked: false, cur: null };

  /* ---------- utilidades ---------- */
  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (m) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m];
    });
  };
  var hl = function (s) { return esc(s).replace(/\*([^*]+)\*/g, '<span class="g">$1</span>'); };
  var fm = function (v) { return Number(v || 0).toFixed(2).replace(".", ","); };
  var color = function (c, d) { return /^#[0-9a-f]{3,8}$/i.test(c || "") ? c : d; };
  var safeUrl = function (u) { return /^(https?:\/\/|data:image\/|assets\/|\.\/)/i.test(u || "") ? u : ""; };
  var tok = function (str, p) {
    return String(str || "").replace(/\{(mega|up|name|price)\}/g, function (m, k) {
      return { mega: p.mega, up: p.up, name: p.name, price: fm(p.price) }[k];
    });
  };
  var speedLabel = function (p) { return p.mega >= 1000 ? String(p.mega / 1000).replace(".", ",") + " Giga" : p.mega + " Mega"; };
  var T = function (k) { return (S.c && S.c.texts[k]) || ""; };
  var regionObj = function () { return S.c.regions.find(function (r) { return r.id === S.region; }) || S.c.regions[0] || null; };
  var appById = function (id) { return S.c.apps.find(function (a) { return a.id === id; }); };

  /* ---------- WhatsApp ---------- */
  function waUrl(msg) {
    var n = String(S.c.whatsapp.number || "").replace(/\D/g, "");
    return "https://wa.me/" + n + (msg ? "?text=" + encodeURIComponent(msg) : "");
  }
  function planMsg(p) {
    var r = regionObj();
    return AL.planMessage(S.c, p, r ? r.name : "");
  }
  function openWA(msg) { window.open(waUrl(msg), "_blank", "noopener"); }

  /* ---------- render ---------- */
  function setContent(c) { S.c = c; renderAll(); }

  function renderAll() {
    applyTexts();
    renderStats();
    renderRegions();
    draw();
    renderFeatures();
    renderServices();
    renderReviews();
    renderFaq();
    applyBrand();
    var wa = $("#wa");
    wa.href = waUrl(S.c.whatsapp.floatMsg);
    $("#wat").textContent = S.c.whatsapp.tooltip || "";
    S.first = false;
  }

  function applyBrand() {
    var b = (S.c && S.c.brand) || {};
    var logo = /^data:image\//.test(b.logo || "") ? b.logo : "assets/logo.png";
    var icon = /^data:image\//.test(b.icon || "") ? b.icon : "assets/icone.png";
    var customLogo = /^data:image\//.test(b.logo || ""), customIcon = /^data:image\//.test(b.icon || "");
    document.querySelectorAll(".logo img").forEach(function (i) { if (i.getAttribute("src") !== logo) i.src = logo; i.style.filter = customLogo ? "none" : ""; });
    document.querySelectorAll(".mas image").forEach(function (i) { i.setAttribute("href", logo); });
    document.querySelectorAll("footer img").forEach(function (i) { if (i.getAttribute("src") !== icon) i.src = icon; i.style.filter = customIcon ? "none" : ""; });
    var fv = document.querySelector('link[rel="icon"]');
    if (fv && fv.getAttribute("href") !== icon) fv.setAttribute("href", icon);
  }

  function applyTexts() {
    document.querySelectorAll("[data-t]").forEach(function (e) {
      var v = S.c.texts[e.dataset.t];
      if (v != null) e.innerHTML = hl(v);
    });
    document.querySelectorAll("[data-tp]").forEach(function (e) {
      var v = S.c.texts[e.dataset.tp];
      if (v != null) e.placeholder = v;
    });
    document.title = T("pageTitle") || "Alares";
  }

  function counter(el, to, dec, suf, ms) {
    var s = performance.now();
    (function f(n) {
      var p = Math.min(1, (n - s) / ms);
      el.textContent = (to * (1 - Math.pow(1 - p, 3))).toFixed(dec).replace(".", ",") + suf;
      if (p < 1) requestAnimationFrame(f);
    })(s);
  }

  function renderStats() {
    var first = S.first;
    $("#stats").innerHTML = S.c.stats.map(function (s) {
      return "<div><b>0</b><small>" + esc(s.l) + "</small></div>";
    }).join("");
    $("#stats").querySelectorAll("b").forEach(function (b, i) {
      var s = S.c.stats[i], n = +s.n || 0, d = +s.d || 0, suf = s.s || "";
      if (first) counter(b, n, d, suf, 1800);
      else b.textContent = n.toFixed(d).replace(".", ",") + suf;
    });
    var sp = $("#sp"), target = Math.round(+T("gaugeSpeed")) || 0;
    if (first) {
      var s0 = performance.now();
      (function f(n) {
        var p = Math.max(0, Math.min(1, (n - s0 - 300) / 2400));
        sp.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(f);
      })(s0);
    } else sp.textContent = target;
  }

  function renderRegions() {
    var rs = S.c.regions;
    if (!rs.some(function (r) { return r.id === S.region; })) S.region = rs[0] ? rs[0].id : null;
    $("#dl").innerHTML = rs.map(function (r) {
      return '<li role="option" data-v="' + esc(r.id) + '" class="' + (r.id === S.region ? "sel" : "") + '">' + ic("pin") + "<span>" + esc(r.name) + "</span>" + ic("check") + "</li>";
    }).join("");
    var r = regionObj();
    $("#dv").textContent = r ? r.name : "—";
  }

  function draw() {
    var c = S.c, rg = regionObj(), t = $("#q").value.trim().toLowerCase();
    var list = c.plans;
    if (rg) list = list.filter(function (p) { return rg.plans.indexOf(p.id) >= 0; });
    list = list
      .filter(function (p) { return S.spd === 0 || (S.spd === 300 ? p.mega <= 300 : p.mega >= S.spd); })
      .filter(function (p) {
        return !t || (p.name + " " + p.mega + " mega " + (p.features || []).join(" ")).toLowerCase().indexOf(t) >= 0 || (t === "giga" && p.mega >= 1000);
      });
    $("#res").innerHTML = "<b>" + list.length + "</b> plano(s) disponível(is) em <b>" + esc(rg ? rg.name : "—") + "</b>";
    $("#gd").innerHTML = list.length ? list.map(function (p, k) {
      var big = p.mega >= 1000;
      return '<div class="card ' + (p.popular ? "pop" : "") + '" style="animation-delay:' + (k * .08) + 's">' +
        (p.popular ? '<span class="badge">' + esc(T("popularBadge")) + "</span>" : "") +
        '<div class="ico">' + ic(AL.ICONS[p.icon] ? p.icon : "wifi") + "</div><h3>" + esc(p.name) + "</h3>" +
        '<div class="mb">' + (big ? esc(String(p.mega / 1000).replace(".", ",")) + " G" : esc(p.mega)) + "<small> " + (big ? "bps" : "Mega") + "</small></div>" +
        '<div class="bar"><i style="width:' + Math.min(100, p.mega / 20) + '%"></i></div>' +
        "<ul>" + (p.features || []).map(function (f) { return "<li>" + ic("check") + esc(f) + "</li>"; }).join("") + "</ul>" +
        '<div class="pr">R$ ' + fm(p.price) + "<small> /mês</small></div>" +
        '<button class="btn" data-buy="' + esc(p.id) + '">' + esc(T("btnContract")) + "</button>" +
        '<button class="btn o det" data-i="' + esc(p.id) + '">' + esc(T("btnDetails")) + ' <svg class="i" style="transform:rotate(-90deg)"><use href="#chev"/></svg></button></div>';
    }).join("") : '<div class="empty">' + esc(T("noPlans")) + "</div>";
    $("#gd").querySelectorAll(".card").forEach(function (cd) {
      cd.onmousemove = function (e) {
        var r = cd.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
        cd.style.setProperty("--mx", x + "px"); cd.style.setProperty("--my", y + "px");
        cd.style.transform = "rotateX(" + ((.5 - y / r.height) * 10) + "deg) rotateY(" + ((x / r.width - .5) * 10) + "deg) translateY(-6px)";
      };
      cd.onmouseleave = function () { cd.style.transform = ""; };
    });
  }

  function renderFeatures() {
    $("#feat").innerHTML = S.c.features.map(function (f) {
      return '<div class="f"><div class="ico">' + ic(AL.ICONS[f.icon] ? f.icon : "check") + "</div><h3>" + esc(f.title) + "</h3><p>" + esc(f.text) + "</p></div>";
    }).join("");
  }

  var aic = function (a) {
    var inner = (a.symbol && AL.ICONS[a.symbol]) ? ic(a.symbol) : esc(a.glyph);
    return '<span class="ai" style="background:linear-gradient(135deg,' + color(a.c1, "#2563ff") + "," + color(a.c2, "#7c3aed") + ')">' + inner + "</span>";
  };

  function imgSrc(cd) {
    if (!cd.image) return "";
    if (String(cd.image).indexOf("fs:") === 0) return S.images[String(cd.image).slice(3)] || "";
    return safeUrl(cd.image);
  }

  function renderServices() {
    var html = S.c.cards.map(function (cd) {
      var a = appById(cd.app);
      var art = AL.ART[cd.art] || AL.autoArt(color(a && a.c1, "#2563ff"), color(a && a.c2, "#7c3aed"));
      var src = imgSrc(cd);
      return '<article class="sv" style="background:' + art[0] + '"><svg class="art" viewBox="0 0 300 420" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' + art[1] + "</svg>" +
        (src ? '<img class="pic" src="' + esc(src) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">' : "") +
        ((cd.title || cd.tag) ? '<div class="pt"><small>' + esc(cd.tag) + "</small><b>" + esc(cd.title) + "</b></div>" : "") +
        (a && a.name ? '<span class="sp">' + esc(a.name) + "</span>" : "") +
        '<div class="sb2">' + (a ? aic(a) : "") + "<p>" + esc(cd.desc) + "</p></div></article>";
    }).join("");
    var sv = $("#sv");
    sv.innerHTML = html + html;
    sv.querySelectorAll(".pic").forEach(function (i) {
      var ok = function () { i.classList.add("ok"); i.parentElement.classList.add("has"); };
      i.onload = ok; i.onerror = function () { i.remove(); };
      if (i.complete && i.naturalWidth) ok();
    });
  }

  var cols = [["#2563ff", "#00c2ff"], ["#7c3aed", "#ec4899"], ["#0ea5e9", "#22c55e"], ["#f97316", "#facc15"]];
  function avatar(n, k) {
    var ini = String(n || "?").split(" ").filter(Boolean).slice(0, 2).map(function (w) { return w[0]; }).join("");
    return '<svg width="46" height="46" viewBox="0 0 46 46"><defs><linearGradient id="a' + k + '"><stop offset="0" stop-color="' + cols[k % 4][0] + '"/><stop offset="1" stop-color="' + cols[k % 4][1] + '"/></linearGradient></defs><circle cx="23" cy="23" r="23" fill="url(#a' + k + ')"/><text x="23" y="29" text-anchor="middle" fill="#fff" font-family="Sora,sans-serif" font-weight="700" font-size="16">' + esc(ini) + "</text></svg>";
  }
  function renderReviews() {
    var h = S.c.reviews.map(function (r, k) {
      var st = Math.max(0, Math.min(5, Number(r.stars) || 0));
      return '<div class="rv"><div class="u">' + avatar(r.name, k) + "<div><b>" + esc(r.name) + "</b><small>" + esc(r.city) + '</small></div></div><div class="stars" style="--r:' + st + '" aria-label="Nota ' + st + ' de 5"><span class="sb">★★★★★</span><span class="sf">★★★★★</span></div><p>“' + esc(r.text) + "”</p></div>";
    }).join("");
    $("#tr").innerHTML = h + h;
  }

  function renderFaq() {
    $("#faq").innerHTML = S.c.faq.map(function (f) {
      return '<div class="q"><button aria-expanded="false">' + esc(f.q) + '<span class="pl"><svg class="i" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg></span></button><div class="ans"><div><p>' + esc(f.a) + "</p></div></div></div>";
    }).join("");
  }

  /* ---------- eventos fixos ---------- */
  var q = $("#q"), gd = $("#gd"), fl = $("#fl");
  [["Todos", 0], ["Até 300", 300], ["500+", 500], ["1 Giga+", 1000]].forEach(function (a, k) {
    var b = document.createElement("button");
    b.textContent = a[0]; if (!k) b.className = "on";
    b.onclick = function () {
      S.spd = a[1];
      Array.prototype.forEach.call(fl.children, function (x) { x.className = ""; });
      b.className = "on"; draw();
    };
    fl.appendChild(b);
  });
  q.addEventListener("input", draw);
  $("#go").onclick = function () { draw(); gd.scrollIntoView({ behavior: "smooth", block: "center" }); };

  var dd = $("#dd"), dt = $("#dt"), dl = $("#dl");
  function tg(o) { dd.classList.toggle("open", o); dt.setAttribute("aria-expanded", o); }
  dt.onclick = function (e) { e.stopPropagation(); tg(!dd.classList.contains("open")); };
  dl.onclick = function (e) {
    var li = e.target.closest("li"); if (!li) return;
    S.region = li.dataset.v;
    try { localStorage.setItem("alares_region", S.region); } catch (x) {}
    renderRegions(); draw(); tg(false);
  };
  document.addEventListener("click", function (e) { if (!dd.contains(e.target)) tg(false); });

  $("#faq").addEventListener("click", function (e) {
    var b = e.target.closest(".q button"); if (!b) return;
    var q1 = b.parentElement, o = q1.classList.contains("open");
    document.querySelectorAll(".q").forEach(function (x) { x.classList.remove("open"); x.firstElementChild.setAttribute("aria-expanded", "false"); });
    if (!o) { q1.classList.add("open"); b.setAttribute("aria-expanded", "true"); }
  });

  /* ---------- modal: detalhes do plano ---------- */
  var pm = $("#pm"), pb = $("#pb"), apn = $("#apn");
  function lk(v) { document.body.style.overflow = v ? "hidden" : ""; document.documentElement.style.overflow = v ? "hidden" : ""; }
  function pcl() { pm.classList.remove("on"); apn.classList.remove("on"); lk(0); }
  function pd(id) {
    var p = S.c.plans.find(function (x) { return x.id === id; }); if (!p) return;
    S.cur = p;
    var mg = p.mega >= 1000 ? String(p.mega / 1000).replace(".", ",") + " GIGA" : p.mega + " MEGA";
    var ch = +p.choose || 0;
    var ttl = p.title || (mg + (ch ? " + " + ch + " STREAMING" + (ch > 1 ? "S" : "") + " À ESCOLHA" : ""));
    var apps = (p.apps || []).map(appById).filter(Boolean);
    pb.innerHTML = '<div class="ph"><h3 id="pt">' + esc(ttl) + '</h3><span class="fr">' + ic("bolt") + esc(T("installBadge")) + "</span></div>" +
      '<div class="bg2">' + (p.benefits || []).map(function (b) {
        return '<div class="bn"><span class="bi">' + ic(AL.ICONS[b.icon] ? b.icon : "check") + "</span><div><b>" + esc(tok(b.title, p)) + '</b><small class="' + (b.green ? "gn" : "") + '">' + esc(tok(b.sub, p)) + "</small></div></div>";
      }).join("") + "</div>" +
      '<div class="pr2"><div><small>' + esc(p.name) + " · mensalidade</small><b>R$ " + fm(p.price) + "</b><span> /mês</span></div><button class=\"btn\" id=\"pas\">" + esc(T("subscribeBtn")) + "</button></div>" +
      (apps.length ? "<h4>" + esc(T("appsTitle")) + '</h4><p class="nt2">' + (ch ? "Escolha " + ch + " streaming" + (ch > 1 ? "s" : "") + " entre os disponíveis. " : "") + esc(T("appsHint")) + "</p>" +
        '<div class="al">' + apps.map(function (a) {
          return '<button class="ac" data-a="' + esc(a.id) + '">' + aic(a) + '<span class="nm">' + esc(a.name) + "</span>" + ic("chev").replace('class="i"', 'class="i cv"') + "</button>";
        }).join("") + "</div>" : "");
    apn.classList.remove("on"); pb.scrollTop = 0; pm.classList.add("on"); lk(1);
    setTimeout(function () { $("#px").focus(); }, 300);
  }
  function ad(id) {
    var a = appById(id); if (!a) return;
    apn.innerHTML = '<button class="bk">' + ic("chev") + esc(T("appBack")) + '</button><div class="ah">' + aic(a) + "<div><h3>" + esc(a.name) + "</h3><small>" + esc(a.kind) + "</small></div></div><p>" + esc(a.desc) + "</p>" +
      "<h4>" + esc(T("appIncluded")) + "</h4><ul>" + (a.items || []).map(function (t) { return "<li>" + ic("check") + esc(t) + "</li>"; }).join("") + "</ul>" +
      "<h4>" + esc(T("appActivateTitle")) + "</h4><p>" + esc(T("appActivateText")) + "</p>";
    apn.scrollTop = 0; apn.classList.add("on");
  }
  gd.addEventListener("click", function (e) {
    var b = e.target.closest("[data-buy]");
    if (b) { var p = S.c.plans.find(function (x) { return x.id === b.dataset.buy; }); if (p) openWA(planMsg(p)); return; }
    var d = e.target.closest(".det"); if (d) pd(d.dataset.i);
  });
  pb.onclick = function (e) {
    var a = e.target.closest(".ac"); if (a) return ad(a.dataset.a);
    if (e.target.closest("#pas") && S.cur) { openWA(planMsg(S.cur)); pcl(); }
  };
  apn.onclick = function (e) { if (e.target.closest(".bk")) apn.classList.remove("on"); };
  $("#px").onclick = pcl;
  pm.addEventListener("click", function (e) { if (e.target === pm) pcl(); });

  /* ---------- modal: pedido de ligação ---------- */
  var md = $("#md"), cp = $("#cp"), cn = $("#cn");
  function op() {
    $("#mf").style.display = ""; $("#ok").style.display = "none"; $("#fe").textContent = "";
    md.classList.add("on"); document.body.style.overflow = "hidden";
    setTimeout(function () { cn.focus(); }, 300);
  }
  function cl() { md.classList.remove("on"); document.body.style.overflow = ""; }
  document.querySelectorAll("[data-call]").forEach(function (b) { b.onclick = op; });
  $("#mx").onclick = cl; $("#mo").onclick = cl;
  md.onclick = function (e) { if (e.target === md) cl(); };
  addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    tg(false);
    if (apn.classList.contains("on")) apn.classList.remove("on");
    else if (pm.classList.contains("on")) pcl();
    else if (md.classList.contains("on")) cl();
  });
  cp.oninput = function () {
    var d = cp.value.replace(/\D/g, "").slice(0, 11), k = d.length > 10 ? 7 : 6;
    cp.value = d.length > 2 ? "(" + d.slice(0, 2) + ") " + d.slice(2, k) + (d.length > k ? "-" + d.slice(k) : "") : d.length ? "(" + d : "";
  };

  function saveLead(data) {
    var job = window.alaresFirebase.firestore().then(function (r) {
      return r.fs.addDoc(r.fs.collection(r.db, "leads"), {
        name: data.name, phone: data.phone, region: data.region,
        status: "novo", createdAt: r.fs.serverTimestamp()
      });
    });
    var timeout = new Promise(function (_, rej) { setTimeout(function () { rej(new Error("timeout")); }, 12000); });
    return Promise.race([job, timeout]);
  }

  $("#cf").onsubmit = function (e) {
    e.preventDefault();
    var ok = 1, n = cn.value.trim(), d = cp.value.replace(/\D/g, "");
    var f = function (el, m, er, bad) { el.parentElement.classList.toggle("bad", bad); er.textContent = bad ? m : ""; if (bad) ok = 0; };
    f(cn, "Informe seu nome", $("#en"), n.length < 2);
    f(cp, "Informe um telefone válido com DDD", $("#ep"), d.length < 10);
    if (!ok) return;
    var btn = $("#cs"), r = regionObj();
    btn.disabled = true; $("#fe").textContent = "";
    var job = PREVIEW ? Promise.resolve() : saveLead({ name: n, phone: cp.value, region: r ? r.name : "" });
    job.then(function () {
      $("#okt").textContent = T("callOkTitle").replace("{nome}", n.split(" ")[0]);
      $("#mf").style.display = "none"; $("#ok").style.display = "block";
      cn.value = ""; cp.value = "";
    }).catch(function (err) {
      console.warn("Lead:", err);
      var link = waUrl("Olá! Meu nome é " + n + ". Gostaria de receber uma ligação neste número: " + cp.value);
      $("#fe").innerHTML = 'Não foi possível enviar agora. <a href="' + esc(link) + '" target="_blank" rel="noopener">Fale conosco pelo WhatsApp</a>.';
    }).then(function () { btn.disabled = false; });
  };

  /* ---------- rede de pontos no topo ---------- */
  (function () {
    var cv = $("#net"), cx = cv.getContext && cv.getContext("2d"), hr = $(".hero");
    if (!cx) return;
    var M = { x: 0, y: 0, a: 0, t: 0 }, SZ = 34, RAD = 170, W, H;
    function rs() { var d = devicePixelRatio || 1; W = cv.offsetWidth; H = cv.offsetHeight; cv.width = W * d; cv.height = H * d; cx.setTransform(d, 0, 0, d, 0, 0); }
    rs(); addEventListener("resize", rs);
    function mv(e) { var p = e.touches ? e.touches[0] : e, r = cv.getBoundingClientRect(); M.x = p.clientX - r.left; M.y = p.clientY - r.top; M.t = 1; }
    hr.addEventListener("mousemove", mv); hr.addEventListener("touchmove", mv, { passive: true }); hr.addEventListener("touchstart", mv, { passive: true });
    hr.addEventListener("mouseleave", function () { M.t = 0; }); hr.addEventListener("touchend", function () { M.t = 0; });
    function an() {
      M.a += (M.t - M.a) * .08; cx.clearRect(0, 0, W, H);
      if (M.a > .01) {
        var P = [];
        for (var i = Math.max(0, Math.floor((M.x - RAD) / SZ)); i <= Math.ceil((M.x + RAD) / SZ); i++)
          for (var j = Math.max(0, Math.floor((M.y - RAD) / SZ)); j <= Math.ceil((M.y + RAD) / SZ); j++) {
            var gx = i * SZ, gy = j * SZ, dx = gx - M.x, dy = gy - M.y, d = Math.hypot(dx, dy);
            if (d > RAD) continue;
            var k = 1 - d / RAD, u = k * k * 14, px = gx + (d ? dx / d * u : 0), py = gy + (d ? dy / d * u : 0);
            P.push([px, py]);
            cx.beginPath(); cx.arc(px, py, 1 + k * 1.6, 0, 7); cx.fillStyle = "rgba(255,255,255," + (k * M.a * .9) + ")"; cx.fill();
          }
        P.forEach(function (p) {
          var d = Math.hypot(p[0] - M.x, p[1] - M.y);
          if (d < RAD * .45) { cx.strokeStyle = "rgba(255,255,255," + ((1 - d / (RAD * .45)) * M.a * .5) + ")"; cx.beginPath(); cx.moveTo(p[0], p[1]); cx.lineTo(M.x, M.y); cx.stroke(); }
        });
      }
      requestAnimationFrame(an);
    }
    requestAnimationFrame(an);
  })();

  /* ---------- início: cache → Firestore (ou preview do painel) ---------- */
  var initial = null;
  if (!PREVIEW) { try { initial = JSON.parse(localStorage.getItem(CACHE_KEY) || "null"); } catch (e) {} }
  try { S.region = localStorage.getItem("alares_region"); } catch (e) {}
  setContent(AL.withDefaults(initial));

  if (PREVIEW) {
    addEventListener("message", function (e) {
      var d = e.data || {};
      if (d.type === "alares-preview") {
        if (d.images) S.images = d.images;
        var st = window.scrollY;
        setContent(AL.withDefaults(d.content));
        window.scrollTo(0, st);
      } else if (d.type === "alares-goto") {
        var el = document.getElementById(d.id);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
    try { parent.postMessage({ type: "alares-ready" }, "*"); } catch (e) {}
  } else if (window.alaresFirebase) {
    window.alaresFirebase.firestore().then(function (r) {
      var fs = r.fs, db = r.db;
      fs.onSnapshot(fs.doc(db, "site", "content"), function (snap) {
        if (snap.exists()) {
          try { localStorage.setItem(CACHE_KEY, JSON.stringify(snap.data())); } catch (e) {}
          setContent(AL.withDefaults(snap.data()));
        } else setContent(AL.withDefaults(null));
      }, function (err) { console.warn("Firestore (conteúdo):", err && err.code); });
      fs.onSnapshot(fs.collection(db, "images"), function (snap) {
        var m = {};
        snap.forEach(function (d) { m[d.id] = d.data().data; });
        S.images = m; renderServices();
      }, function (err) { console.warn("Firestore (imagens):", err && err.code); });
    }).catch(function (err) { console.warn("Firebase indisponível, usando conteúdo padrão.", err); });
  }
})();
