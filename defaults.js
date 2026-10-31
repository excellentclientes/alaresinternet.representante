/* ============================================================
   CONTEÚDO PADRÃO DO SITE
   Usado enquanto o Firestore não tem nada salvo (ou está offline)
   e pelo botão "Restaurar padrão" do painel.
   Depois que você publicar pelo painel, o que vale é o Firestore.
   ============================================================ */
(function () {
  var clone = function (o) { return JSON.parse(JSON.stringify(o)); };

  /* ---------- ilustrações dos cartões (SVG) ---------- */
  var rays = function (x, y, n) {
    return Array.from({ length: n }, function (_, i) {
      var a = i / n * 6.283;
      return '<line x1="' + x + '" y1="' + y + '" x2="' + (x + Math.cos(a) * 420 | 0) + '" y2="' + (y + Math.sin(a) * 420 | 0) + '"/>';
    }).join("");
  };
  var stars = function (n) {
    return Array.from({ length: n }, function (_, i) {
      return '<circle cx="' + ((i * 73) % 300) + '" cy="' + ((i * 131) % 250) + '" r="' + ((i % 3) * .5 + .7) + '" fill="#fff" opacity="' + (.35 + (i % 4) * .18) + '"/>';
    }).join("");
  };
  var ART = {
    tc: ["linear-gradient(160deg,#16308f,#06091f 70%)", '<g stroke="rgba(255,255,255,.13)" stroke-width="2">' + rays(150, 170, 20) + '</g><circle cx="150" cy="170" r="100" fill="rgba(255,70,70,.22)"/><circle cx="150" cy="170" r="58" fill="none" stroke="#ff4d4d" stroke-width="4"/><circle cx="150" cy="170" r="34" fill="#ff4d4d"/><path d="M0 330V292h28v-42h26v62h22v-84h30v96h22v-52h26v74h30v-34h26V420H0z" fill="#050716"/>'],
    hbo: ["linear-gradient(170deg,#4c1d95,#0b0618 75%)", '<circle cx="210" cy="120" r="78" fill="rgba(255,255,255,.1)"/><circle cx="210" cy="120" r="46" fill="rgba(255,255,255,.92)"/><path d="M0 300l50-60 40 40 60-90 60 80 40-40 50 70v120H0z" fill="#1a0c3d" opacity=".9"/><path d="M0 350l70-50 60 40 70-60 100 70v70H0z" fill="#0b0618"/>'],
    atv: ["linear-gradient(160deg,#4b5563,#030712 65%)", '<g fill="none" stroke="rgba(255,255,255,.55)" stroke-width="2.5"><path d="M-20 380C80 250 200 330 330 110"/><path d="M-20 400C90 280 210 360 330 150" opacity=".6"/><path d="M-20 420C100 310 220 390 330 190" opacity=".35"/></g><circle cx="230" cy="110" r="70" fill="rgba(255,255,255,.08)"/><circle cx="230" cy="110" r="3" fill="#fff"/>'],
    dz: ["linear-gradient(170deg,#1d4ed8,#0b1240 80%)", stars(46) + '<path d="M20 60Q120 40 280 150" stroke="rgba(255,255,255,.7)" stroke-width="3" fill="none"/><g fill="#080d2e"><rect x="60" y="280" width="180" height="140"/><rect x="40" y="240" width="34" height="180"/><rect x="226" y="240" width="34" height="180"/><rect x="130" y="210" width="40" height="210"/><path d="M36 240l21-44 21 44zM222 240l21-44 21 44zM126 210l24-56 24 56z"/></g>'],
    nf: ["linear-gradient(170deg,#7f1d1d,#050505 75%)", '<g fill="none" stroke-linecap="round"><path d="M60 -20C110 120 90 260 150 440" stroke="#e11d2e" stroke-width="34" opacity=".9"/><path d="M130 -20C170 120 160 260 210 440" stroke="#b91c1c" stroke-width="34" opacity=".75"/><path d="M200 -20C230 120 230 260 270 440" stroke="#e11d2e" stroke-width="34" opacity=".55"/></g><circle cx="230" cy="110" r="60" fill="rgba(255,255,255,.07)"/>'],
    gp: ["linear-gradient(170deg,#ff7a3c,#b4123c 60%,#3b0a2a)", '<circle cx="150" cy="190" r="110" fill="rgba(255,220,120,.2)"/><circle cx="150" cy="190" r="66" fill="#ffd36e"/><g fill="none" stroke="rgba(255,255,255,.35)" stroke-width="3"><path d="M0 300q38-22 75 0t75 0 75 0 75 0"/><path d="M0 335q38-22 75 0t75 0 75 0 75 0"/><path d="M0 370q38-22 75 0t75 0 75 0 75 0"/></g>'],
    pv: ["linear-gradient(170deg,#38bdf8,#0c4a8a)", '<ellipse cx="70" cy="90" rx="60" ry="20" fill="rgba(255,255,255,.25)"/><ellipse cx="230" cy="140" rx="70" ry="22" fill="rgba(255,255,255,.2)"/><circle cx="150" cy="210" r="62" fill="rgba(255,255,255,.18)"/><circle cx="150" cy="210" r="44" fill="#fff"/><path d="M140 190v40l36-20z" fill="#0c4a8a"/>'],
    cl: ["linear-gradient(170deg,#8b5cf6,#be185d 90%)", '<g fill="rgba(255,255,255,.92)"><circle cx="110" cy="200" r="40"/><circle cx="158" cy="180" r="52"/><circle cx="205" cy="205" r="38"/><rect x="80" y="200" width="155" height="43" rx="21"/></g><g stroke="rgba(255,255,255,.4)" stroke-width="2"><path d="M60 80l50 60M250 70l-50 70M150 60v70"/></g><g fill="#fff"><circle cx="60" cy="80" r="5"/><circle cx="250" cy="70" r="5"/><circle cx="150" cy="60" r="5"/></g>']
  };
  /* arte automática para cartões novos (usa as cores do app) */
  function autoArt(c1, c2) {
    return ["linear-gradient(170deg," + c1 + "," + c2 + ")",
      '<circle cx="220" cy="110" r="90" fill="rgba(255,255,255,.12)"/><circle cx="90" cy="230" r="120" fill="rgba(0,0,0,.14)"/><circle cx="150" cy="170" r="52" fill="rgba(255,255,255,.2)"/><circle cx="150" cy="170" r="28" fill="#fff" opacity=".9"/>'];
  }

  /* ---------- ícones disponíveis (symbols do index.html) ---------- */
  var ICONS = {
    bolt: "Raio", wifi: "Wi-Fi", shield: "Escudo", tv: "TV", game: "Controle", head: "Fone",
    rocket: "Foguete", globe: "Globo", chat: "Chat", check: "Check", call: "Telefone",
    dn: "Download", up: "Upload", user: "Pessoa", pin: "Local"
  };

  /* ---------- benefícios do modal "Detalhes do plano" ----------
     Tokens: {mega} {up} {name} {price}                                  */
  function makeBenefits(p) {
    var wifiTitle = (p && p.mega >= 2000) ? "Wi-Fi 7 incluso" : "Wi-Fi 6 incluso";
    return [
      { icon: "dn", title: "Download", sub: "{mega} Mbps", green: true },
      { icon: "up", title: "Upload", sub: "{up} Mbps", green: true },
      { icon: "wifi", title: wifiTitle, sub: "Roteador sem custo extra", green: false },
      { icon: "bolt", title: "Instalação grátis", sub: "Você economiza R$ 150", green: true },
      { icon: "shield", title: "Sem fidelidade", sub: "Cancele quando quiser", green: false },
      { icon: "chat", title: "Suporte 24h", sub: "Atendimento humano", green: false }
    ];
  }

  /* ---------- campos de texto editáveis no painel ----------
     Use *palavra* para deixar em destaque (gradiente azul).           */
  var TEXT_FIELDS = [
    { g: "Geral", k: "pageTitle", l: "Título da página (aba do navegador)" },
    { g: "Menu do topo", k: "nav1", l: "Link 1" }, { g: "Menu do topo", k: "nav2", l: "Link 2" },
    { g: "Menu do topo", k: "nav3", l: "Link 3" }, { g: "Menu do topo", k: "nav4", l: "Link 4" },
    { g: "Menu do topo", k: "nav5", l: "Link 5" }, { g: "Menu do topo", k: "navBtn", l: "Botão do menu" },
    { g: "Início (topo do site)", k: "heroTag", l: "Etiqueta verde" },
    { g: "Início (topo do site)", k: "heroTitle", l: "Título principal (use *destaque*)", long: true },
    { g: "Início (topo do site)", k: "heroText", l: "Texto abaixo do título", long: true },
    { g: "Início (topo do site)", k: "btnPlans", l: "Botão 1" },
    { g: "Início (topo do site)", k: "btnWhy", l: "Botão 2" },
    { g: "Início (topo do site)", k: "btnCall", l: "Botão 3 (abre o pedido de ligação)" },
    { g: "Início (topo do site)", k: "chip1", l: "Selo flutuante 1" },
    { g: "Início (topo do site)", k: "chip2", l: "Selo flutuante 2" },
    { g: "Início (topo do site)", k: "gaugeSpeed", l: "Velocidade mostrada no medidor (Mbps)" },
    { g: "Busca de planos", k: "finderRegion", l: "Rótulo da região" },
    { g: "Busca de planos", k: "finderSearch", l: "Rótulo da busca" },
    { g: "Busca de planos", k: "finderPlaceholder", l: "Exemplo dentro da busca" },
    { g: "Busca de planos", k: "btnConsult", l: "Botão consultar" },
    { g: "Busca de planos", k: "btnContract", l: "Botão contratar (nos cartões)" },
    { g: "Busca de planos", k: "btnDetails", l: "Botão de detalhes (nos cartões)" },
    { g: "Busca de planos", k: "popularBadge", l: "Faixa do plano popular" },
    { g: "Busca de planos", k: "noPlans", l: "Mensagem quando não há planos", long: true },
    { g: "Vantagens", k: "vantTitle", l: "Título (use *destaque*)" },
    { g: "Vantagens", k: "vantText", l: "Subtítulo", long: true },
    { g: "Entretenimento", k: "servTitle", l: "Título (use *destaque*)" },
    { g: "Entretenimento", k: "servText", l: "Subtítulo", long: true },
    { g: "Entretenimento", k: "servBtn1", l: "Botão 1" },
    { g: "Entretenimento", k: "servBtn2", l: "Botão 2 (abre o pedido de ligação)" },
    { g: "Avaliações", k: "revTitle", l: "Título (use *destaque*)" },
    { g: "Avaliações", k: "revText", l: "Subtítulo", long: true },
    { g: "Dúvidas frequentes", k: "faqTitle", l: "Título (use *destaque*)" },
    { g: "Dúvidas frequentes", k: "faqText", l: "Subtítulo", long: true },
    { g: "Faixa final (azul)", k: "ctaTitle", l: "Título" },
    { g: "Faixa final (azul)", k: "ctaText", l: "Texto", long: true },
    { g: "Faixa final (azul)", k: "ctaBtn1", l: "Botão 1" },
    { g: "Faixa final (azul)", k: "ctaBtn2", l: "Botão 2 (abre o pedido de ligação)" },
    { g: "Pedido de ligação (janela)", k: "callTitle", l: "Título" },
    { g: "Pedido de ligação (janela)", k: "callText", l: "Texto", long: true },
    { g: "Pedido de ligação (janela)", k: "callNameLabel", l: "Rótulo do nome" },
    { g: "Pedido de ligação (janela)", k: "callNamePh", l: "Exemplo dentro do nome" },
    { g: "Pedido de ligação (janela)", k: "callPhoneLabel", l: "Rótulo do telefone" },
    { g: "Pedido de ligação (janela)", k: "callBtn", l: "Botão enviar" },
    { g: "Pedido de ligação (janela)", k: "callNote", l: "Aviso de privacidade" },
    { g: "Pedido de ligação (janela)", k: "callOkTitle", l: "Título após enviar (use {nome})" },
    { g: "Pedido de ligação (janela)", k: "callOkText", l: "Texto após enviar", long: true },
    { g: "Detalhes do plano (janela)", k: "subscribeBtn", l: "Botão assinar" },
    { g: "Detalhes do plano (janela)", k: "installBadge", l: "Selo verde" },
    { g: "Detalhes do plano (janela)", k: "appsTitle", l: "Título dos aplicativos" },
    { g: "Detalhes do plano (janela)", k: "appsHint", l: "Dica dos aplicativos" },
    { g: "Detalhes do plano (janela)", k: "appBack", l: "Botão voltar" },
    { g: "Detalhes do plano (janela)", k: "appIncluded", l: "Título 'o que está incluso'" },
    { g: "Detalhes do plano (janela)", k: "appActivateTitle", l: "Título 'como ativar'" },
    { g: "Detalhes do plano (janela)", k: "appActivateText", l: "Texto 'como ativar'", long: true },
  ];

  var TEXTS = {
    pageTitle: "Alares – Internet ultrarrápida",
    nav1: "Planos", nav2: "Vantagens", nav3: "Serviços", nav4: "Avaliações", nav5: "Dúvidas", navBtn: "Assinar",
    heroTag: "Fibra 100% óptica disponível na sua cidade",
    heroTitle: "Internet que *acompanha* a velocidade da sua vida.",
    heroText: "Até 2 Gbps simétricos, Wi-Fi 6 incluso e instalação em 24 horas. Sem fidelidade e sem taxa surpresa.",
    btnPlans: "Ver planos", btnWhy: "Por que Alares?", btnCall: "Solicitar ligação",
    chip1: "Ping 2 ms", chip2: "Wi-Fi 6 seguro", gaugeSpeed: "2000",
    finderRegion: "Sua região", finderSearch: "Buscar plano", finderPlaceholder: "Ex.: 500 mega, gamer, streaming…",
    btnConsult: "Consultar", btnContract: "Contratar", btnDetails: "Detalhes do plano", popularBadge: "POPULAR",
    noPlans: "Nenhum plano encontrado. Tente outra região ou termo de busca.",
    vantTitle: "Tecnologia que você *sente*", vantText: "Infraestrutura de ponta para você esquecer que a internet existe.",
    servTitle: "Entretenimento *incluso* no seu plano", servText: "Streaming, música e segurança para aproveitar ao máximo a sua conexão.",
    servBtn1: "Conheça todos os planos", servBtn2: "Assinar plano",
    revTitle: "Quem usa, *recomenda*", revText: "Nota 4,9 em mais de 38 mil avaliações.",
    faqTitle: "Conheça as *dúvidas frequentes*", faqText: "Tudo o que você precisa saber antes de assinar.",
    ctaTitle: "Pronto para navegar sem limites?", ctaText: "Instalação em até 24h e 30 dias de satisfação garantida.",
    ctaBtn1: "Assinar agora", ctaBtn2: "Solicitar ligação",
    callTitle: "Solicitar ligação", callText: "Deixe seus dados e um consultor liga para você em até 5 minutos.",
    callNameLabel: "Seu nome", callNamePh: "Como podemos te chamar?", callPhoneLabel: "Telefone com DDD",
    callBtn: "Quero receber a ligação", callNote: "Usamos seu número apenas para este contato.",
    callOkTitle: "Pronto, {nome}!", callOkText: "Um consultor da Alares vai ligar para você em instantes.",
    subscribeBtn: "Assinar", installBadge: "Instalação grátis",
    appsTitle: "Aplicativos inclusos", appsHint: "Toque em um app para ver os detalhes.",
    appBack: "Voltar aos detalhes", appIncluded: "O que está incluso", appActivateTitle: "Como ativar",
    appActivateText: "Depois de assinar, você recebe o link de ativação por SMS e e-mail em até 24 horas."
  };

  /* ---------- planos ---------- */
  var plans = [
    { id: "start", name: "Start", mega: 100, price: 69.9, icon: "wifi", up: 50, choose: 0, popular: false,
      features: ["Wi-Fi 6 incluso", "Instalação grátis", "Ideal para 1–3 dispositivos"], apps: ["wifi", "av"] },
    { id: "casa", name: "Casa", mega: 300, price: 89.9, icon: "tv", up: 150, choose: 1, popular: false,
      features: ["Wi-Fi 6 incluso", "Streaming 4K sem travar", "Antivírus incluso"], apps: ["gp", "tc", "wifi", "av"] },
    { id: "familia", name: "Família", mega: 500, price: 109.9, icon: "head", up: 250, choose: 1, popular: true,
      features: ["Mesh Wi-Fi 6 (2 unidades)", "Até 15 dispositivos", "Suporte prioritário"], apps: ["gp", "tc", "hbo", "nf", "atv", "wifi", "av"] },
    { id: "gamer", name: "Gamer", mega: 800, price: 139.9, icon: "game", up: 400, choose: 2, popular: false,
      features: ["Ping ultrabaixo", "IP dedicado opcional", "Roteador gamer incluso"], apps: ["gp", "tc", "hbo", "nf", "atv", "dz", "wifi", "av"] },
    { id: "pro", name: "Pro", mega: 1000, price: 169.9, icon: "bolt", up: 1000, choose: 2, popular: false,
      features: ["1 Gbps simétrico", "Mesh Wi-Fi 6E", "IP fixo incluso"], apps: ["gp", "tc", "hbo", "nf", "atv", "dz", "pv", "wifi", "av", "cl"] },
    { id: "ultra", name: "Ultra", mega: 2000, price: 249.9, icon: "rocket", up: 2000, choose: 3, popular: false,
      features: ["2 Gbps simétricos", "Wi-Fi 7 incluso", "Técnico VIP 4h"], apps: ["gp", "tc", "hbo", "nf", "atv", "dz", "pv", "wifi", "av", "cl"] }
  ];
  plans.forEach(function (p) { p.title = ""; p.benefits = makeBenefits(p); });

  /* ---------- regiões (e quais planos existem em cada uma) ---------- */
  var EXCL = {
    start: ["Salvador – BA"],
    pro: ["Porto Alegre – RS", "Salvador – BA"],
    ultra: ["Salvador – BA", "Porto Alegre – RS", "Curitiba – PR", "Belo Horizonte – MG"]
  };
  var regionNames = ["Sorocaba – SP", "São Paulo – SP", "Campinas – SP", "Rio de Janeiro – RJ", "Belo Horizonte – MG", "Curitiba – PR", "Porto Alegre – RS", "Salvador – BA"];
  var regions = regionNames.map(function (n, i) {
    return { id: "r" + (i + 1), name: n,
      plans: plans.filter(function (p) { return (EXCL[p.id] || []).indexOf(n) < 0; }).map(function (p) { return p.id; }) };
  });

  /* ---------- aplicativos / benefícios ---------- */
  var apps = [
    { id: "gp", name: "Globoplay", kind: "Streaming", c1: "#ff5a3c", c2: "#e11d48", glyph: "G", symbol: "", desc: "Novelas, séries, filmes, esportes e programas ao vivo em um só lugar.", items: ["Catálogo completo de novelas e séries", "Canais ao vivo e conteúdo exclusivo", "Até 4 telas ao mesmo tempo"] },
    { id: "tc", name: "Telecine", kind: "Streaming", c1: "#f97316", c2: "#dc2626", glyph: "T", symbol: "", desc: "Os melhores filmes, clássicos e lançamentos, com novidades toda semana.", items: ["Lançamentos e clássicos do cinema", "Imagem em alta definição", "Assista na TV, no celular e no computador"] },
    { id: "hbo", name: "HBO Max", kind: "Streaming", c1: "#7c3aed", c2: "#4c1d95", glyph: "max", symbol: "", desc: "Séries premiadas, filmes de grandes estúdios e documentários.", items: ["Séries originais premiadas", "Grandes estreias do cinema", "Perfis para toda a família"] },
    { id: "atv", name: "Apple TV", kind: "Streaming", c1: "#374151", c2: "#030712", glyph: "tv", symbol: "", desc: "Produções originais com qualidade de cinema e histórias premiadas.", items: ["Séries e filmes originais", "Qualidade 4K com som imersivo", "Compartilhe com a família"] },
    { id: "dz", name: "Disney+", kind: "Streaming", c1: "#2563ff", c2: "#1e3a8a", glyph: "D+", symbol: "", desc: "Clássicos, animações e grandes sucessos para todas as idades.", items: ["Animações e clássicos", "Séries e filmes originais", "Perfis infantis seguros"] },
    { id: "pv", name: "Prime Video", kind: "Streaming", c1: "#0ea5e9", c2: "#0369a1", glyph: "P", symbol: "", desc: "Filmes, séries e produções exclusivas, com novidades toda semana.", items: ["Originais exclusivos", "Download para ver offline", "Vários perfis"] },
    { id: "nf", name: "Netflix", kind: "Streaming", c1: "#e11d2e", c2: "#7f1d1d", glyph: "N", symbol: "", desc: "Séries, filmes, documentários e animações originais, com estreias toda semana.", items: ["Séries e filmes originais", "Download para assistir offline", "Perfis para toda a família"] },
    { id: "wifi", name: "Wi-Fi 6 incluso", kind: "Equipamento", c1: "#2563ff", c2: "#00c2ff", glyph: "", symbol: "wifi", desc: "Roteador de última geração, sem custo adicional, com sinal forte em todos os cômodos.", items: ["Mais estabilidade com vários aparelhos", "Até 3x mais rápido que o Wi-Fi 5", "Instalação e configuração inclusas"] },
    { id: "av", name: "Antivírus Alares Safe", kind: "Segurança", c1: "#16a34a", c2: "#15803d", glyph: "", symbol: "shield", desc: "Proteção contra vírus, golpes e sites perigosos em todos os seus aparelhos.", items: ["Até 5 dispositivos protegidos", "Controle parental", "Alertas de golpes em tempo real"] },
    { id: "cl", name: "Alares Cloud 200 GB", kind: "Armazenamento", c1: "#7c3aed", c2: "#ec4899", glyph: "", symbol: "globe", desc: "Guarde fotos, vídeos e arquivos na nuvem e acesse de qualquer lugar.", items: ["200 GB de espaço", "Backup automático do celular", "Compartilhamento seguro"] }
  ];

  /* ---------- cartões "Entretenimento incluso" ---------- */
  var cards = [
    { id: "c_tc", app: "tc", art: "tc", tag: "Em cartaz", title: "ECLIPSE FINAL", image: "", desc: "Os maiores lançamentos do cinema, clássicos e sucessos de bilheteria, com estreias toda semana." },
    { id: "c_hbo", app: "hbo", art: "hbo", tag: "Nova temporada", title: "A COROA DE CINZAS", image: "", desc: "Séries premiadas, grandes produções e documentários que todo mundo comenta." },
    { id: "c_atv", app: "atv", art: "atv", tag: "Original", title: "VELOCIDADE ZERO", image: "", desc: "Séries e filmes originais com qualidade de cinema, em imagem 4K e som imersivo." },
    { id: "c_dz", app: "dz", art: "dz", tag: "Grande estreia", title: "REINO DAS ESTRELAS", image: "", desc: "Animações, clássicos e grandes sucessos para assistir com toda a família." },
    { id: "c_nf", app: "nf", art: "nf", tag: "Série original", title: "NOITE VERMELHA", image: "", desc: "Séries, filmes e documentários originais, com estreias e lançamentos toda semana." },
    { id: "c_gp", app: "gp", art: "gp", tag: "Nova novela", title: "TERRA DE OURO", image: "", desc: "Novelas, séries, esportes e programas ao vivo, tudo o que você já conhece." },
    { id: "c_pv", app: "pv", art: "pv", tag: "Original", title: "ÚLTIMA FRONTEIRA", image: "", desc: "Filmes, séries e originais exclusivos, com novidades toda semana." },
    { id: "c_cl", app: "cl", art: "cl", tag: "", title: "", image: "", desc: "200 GB para guardar fotos, vídeos e arquivos, com backup automático." }
  ];

  var features = [
    { icon: "bolt", title: "Velocidade real", text: "Entregamos até 100% da velocidade contratada, medida em tempo real." },
    { icon: "wifi", title: "Wi-Fi 6 incluso", text: "Roteador de última geração sem custo extra e cobertura para toda a casa." },
    { icon: "shield", title: "Proteção digital", text: "Antivírus e controle parental inclusos em todos os planos." },
    { icon: "chat", title: "Suporte 24h", text: "Atendimento humano por chat e telefone, a qualquer hora." }
  ];

  var stats = [
    { n: 480, d: 0, s: " mil", l: "Clientes" },
    { n: 99.9, d: 1, s: "%", l: "Uptime" },
    { n: 120, d: 0, s: "", l: "Cidades" }
  ];

  var reviews = [
    { name: "Marina Souza", city: "Sorocaba", text: "Instalaram no mesmo dia e a velocidade é exatamente a contratada. Impecável!", stars: 5 },
    { name: "Rafael Lima", city: "Campinas", text: "Jogo online todo dia e o ping caiu pela metade. Melhor provedor que já tive.", stars: 5 },
    { name: "Camila Duarte", city: "São Paulo", text: "Home office sem queda nenhuma. O suporte respondeu em segundos.", stars: 5 },
    { name: "Bruno Alves", city: "Curitiba", text: "Wi-Fi 6 cobriu a casa toda, até o quintal. Valeu cada centavo.", stars: 5 },
    { name: "Juliana Prado", city: "Belo Horizonte", text: "Preço justo e sem pegadinha na fatura. Recomendo a todos.", stars: 4 },
    { name: "Thiago Rocha", city: "Rio de Janeiro", text: "Assisto em 4K em três TVs ao mesmo tempo sem travar nada.", stars: 5 },
    { name: "Larissa Mendes", city: "Salvador", text: "Técnico educado e rápido. Internet estável desde o primeiro dia.", stars: 5 },
    { name: "Diego Martins", city: "Porto Alegre", text: "Migrei de outra operadora e a diferença é gritante. Nota dez!", stars: 5 }
  ];

  var faq = [
    { q: "Em quanto tempo a internet é instalada?", a: "A instalação acontece em até 24 horas após a confirmação do pedido, em horário combinado com você. Em algumas regiões, o técnico pode chegar no mesmo dia." },
    { q: "Existe fidelidade ou multa de cancelamento?", a: "Não. Todos os planos são sem fidelidade e sem multa. Você pode cancelar quando quiser, sem burocracia." },
    { q: "A velocidade contratada é a que eu recebo de verdade?", a: "Sim. Garantimos no mínimo 90% da velocidade contratada o tempo todo, com medição em tempo real disponível no app." },
    { q: "O roteador Wi-Fi está incluso?", a: "Sim. Todos os planos incluem roteador Wi-Fi 6 em comodato, sem custo adicional. Os planos maiores trazem sistema Mesh para cobrir a casa toda." },
    { q: "Quais são as formas de pagamento?", a: "Você paga por boleto, Pix, cartão de crédito ou débito automático. Quem escolhe débito automático ainda ganha desconto na mensalidade." },
    { q: "Como falo com o suporte?", a: "Nosso atendimento funciona 24 horas por dia, todos os dias, por telefone, chat e WhatsApp. É só clicar no botão verde no canto da tela." }
  ];

  var whatsapp = {
    number: "5515999999999",
    tooltip: "Fale conosco",
    floatMsg: "Olá! Quero conhecer os planos da Alares"
  };

  var DEFAULTS = {
    texts: TEXTS, stats: stats, features: features,
    plans: plans, regions: regions, apps: apps, cards: cards,
    reviews: reviews, faq: faq, whatsapp: whatsapp,
    brand: { logo: "", icon: "" }
  };

  /* completa um conteúdo salvo com o que faltar (campos novos, etc.) */
  function withDefaults(c) {
    var d = clone(DEFAULTS);
    if (!c || typeof c !== "object") return d;
    var out = {};
    ["texts", "whatsapp", "brand"].forEach(function (k) {
      out[k] = Object.assign({}, d[k], (c[k] && typeof c[k] === "object") ? c[k] : {});
    });
    ["stats", "features", "plans", "regions", "apps", "cards", "reviews", "faq"].forEach(function (k) {
      out[k] = Array.isArray(c[k]) ? c[k] : d[k];
    });
    out.plans.forEach(function (p) {
      if (!Array.isArray(p.features)) p.features = [];
      if (!Array.isArray(p.apps)) p.apps = [];
      if (!Array.isArray(p.benefits)) p.benefits = makeBenefits(p);
      if (p.title == null) p.title = "";
    });
    out.regions.forEach(function (r) { if (!Array.isArray(r.plans)) r.plans = []; });
    out.apps.forEach(function (a) { if (!Array.isArray(a.items)) a.items = []; });
    return out;
  }


  /* ---------- mensagem automática do WhatsApp (monta sozinha pelo plano) ---------- */
  function planMessage(c, p, regionName) {
    var spd = function (m) { return m >= 1000 ? String(m / 1000).replace(".", ",") + " Giga" : m + " Mega"; };
    var money = function (v) { return Number(v || 0).toFixed(2).replace(".", ","); };
    var apps = (p.apps || []).map(function (id) { return (c.apps || []).filter(function (a) { return a.id === id; })[0]; }).filter(Boolean);
    var streams = apps.filter(function (a) { return a.kind === "Streaming"; }).map(function (a) { return a.name; });
    var others = apps.filter(function (a) { return a.kind !== "Streaming"; }).map(function (a) { return a.name; });
    var ch = +p.choose || 0;
    var L = ["Olá! Quero contratar o plano *" + p.name + "* da Alares.", ""];
    L.push("📶 Velocidade: " + spd(p.mega) + (p.up ? " (upload " + spd(p.up) + ")" : ""));
    L.push("💰 Valor: R$ " + money(p.price) + "/mês");
    if (regionName) L.push("📍 Região: " + regionName);
    var feats = (p.features || []).filter(function (f) { return String(f).trim(); });
    if (feats.length) L.push("✅ Inclui: " + feats.join(", "));
    if (streams.length) L.push("🎬 Streamings: " + streams.join(", ") + (ch ? " (" + ch + " à escolha)" : ""));
    if (others.length) L.push("🎁 Benefícios: " + others.join(", "));
    L.push("", "Pode me ajudar a finalizar a assinatura?");
    return L.join("\n");
  }

  window.AL = {
    DEFAULTS: DEFAULTS, withDefaults: withDefaults, planMessage: planMessage, clone: clone,
    ART: ART, autoArt: autoArt, ICONS: ICONS, TEXT_FIELDS: TEXT_FIELDS, makeBenefits: makeBenefits
  };
})();
