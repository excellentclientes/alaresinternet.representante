# Site Alares + Painel Administrativo

Site de internet com painel para editar **tudo** em tempo real, usando Firebase (projeto `alares-internet`).
É um site estático (HTML/CSS/JS puro): não precisa instalar nada nem fazer build.

## Arquivos

| Arquivo | Para que serve |
|---|---|
| `index.html` | O site que o cliente vê |
| `style.css` | Visual do site |
| `site.js` | Lê tudo do Firebase em tempo real, WhatsApp, pedido de ligação |
| `defaults.js` | Conteúdo inicial (usado até você publicar pelo painel) |
| `firebase-config.js` | **Código do Firebase** (chaves do projeto) |
| `painel.html` / `admin.css` / `admin.js` | Painel administrativo (`/painel`) |
| `firestore.rules` | Regras de segurança do banco |
| `vercel.json` | Rotas da Vercel (`/` e `/painel`) |
| `assets/` | Logo e ícone |

## Endereços (Vercel)

Só existem dois endereços:

- Site: `https://alaresinternetrepresentante.vercel.app`
- Painel: `https://alaresinternetrepresentante.vercel.app/painel`

O arquivo `vercel.json` cuida disso (`/painel.html`, `/admin` e `/index` redirecionam). Para publicar:
suba tudo no GitHub e, na Vercel, importe o repositório (*Framework Preset: Other*, sem build).

## Configuração do Firebase (uma vez só)

Tudo no [Console do Firebase](https://console.firebase.google.com) > projeto **alares-internet**.

1. **Firestore Database**: *Criar banco de dados* > modo produção > região `southamerica-east1` (São Paulo).
2. **Authentication** > *Método de login* > ative **Google** (escolha um e-mail de suporte do projeto).
3. **Authentication** > *Configurações* > *Domínios autorizados* > adicione
   `alaresinternetrepresentante.vercel.app`.
4. **Regras**: copie o conteúdo de `firestore.rules` em *Firestore Database > Regras > Publicar*.
   Elas só deixam a conta `titanprimedistribuidora@gmail.com` alterar o site e ler os pedidos de ligação.
   > Este passo é o que realmente protege os dados. Sem ele o painel não consegue gravar.

## Segurança do painel

- O login é feito **somente com Google**. Qualquer outra conta é desconectada na hora, com aviso.
- A trava de verdade está nas regras do Firestore (passo 4): mesmo que alguém burle a tela, o banco recusa.
- Visitantes só conseguem **ler** o conteúdo do site e **criar** um pedido de ligação (com dados validados).

## Como usar o painel

- **Textos e números**: todos os títulos, textos e botões do site. Use `*palavra*` para destacar em azul.
- **Planos**: preço, velocidade, itens do cartão, aplicativos incluídos, regiões onde existe e os detalhes da janela do plano.
- **Regiões**: adicione/exclua cidades e escolha quais planos valem em cada uma.
- **Aplicativos**: cadastre streamings, antivírus, nuvem etc. e depois marque em cada plano.
- **Entretenimento**: troque a imagem (envie do computador ou cole um link), o texto e a descrição dos cartões.
- **Avaliações** e **Dúvidas**: adicione, edite, reordene e exclua.
- **WhatsApp**: número e mensagens. Ao clicar em *Contratar/Assinar*, o cliente vai para o WhatsApp com a mensagem
  pronta (`{plano}`, `{velocidade}`, `{preco}`, `{regiao}`).
- **Ligações recebidas**: nome e telefone de quem pediu ligação, em tempo real, com aviso sonoro,
  botão de WhatsApp e status (Novo / Em contato / Concluído).
- **Pré-visualização** (lado direito): mostra o site em modo **Computador** ou **Celular** com o que você está
  editando, **antes** de publicar.
- Clique em **Publicar** para o site mudar para todos os visitantes. O site atualiza sozinho, sem recarregar.
  *Descartar* volta ao último publicado.

## Observações

- Antes da primeira publicação o site usa o conteúdo de `defaults.js`. No primeiro acesso ao painel,
  clique em **Publicar** para gravar no Firebase.
- Imagens enviadas do computador são reduzidas e guardadas no Firestore (não precisa do Firebase Storage).
- A `apiKey` do Firebase pode ficar pública. Quem protege os dados são as **regras do Firestore** (passo 3).
- O login com Google não funciona abrindo o arquivo direto (`file://`). Use o endereço da Vercel.
- Se você já publicou conteúdo pelo painel antes, textos como o rodapé ficam salvos no Firebase: ajuste em
  *Textos e números > Rodapé* e clique em Publicar.
