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
| `admin.html` / `admin.css` / `admin.js` | Painel administrativo (`/admin.html`) |
| `firestore.rules` | Regras de segurança do banco |
| `assets/` | Logo e ícone |

## Configuração (uma vez só, 5 minutos)

Tudo no [Console do Firebase](https://console.firebase.google.com) > projeto **alares-internet**.

1. **Firestore Database**: *Criar banco de dados* > modo produção > região `southamerica-east1` (São Paulo).
2. **Authentication** > *Começar* > *Método de login* > ative **E-mail/senha**.
   Depois, na aba **Users** > *Adicionar usuário*: crie o e-mail e a senha que você vai usar no painel.
3. **Regras**: abra `firestore.rules`, troque `SEU_EMAIL_AQUI` pelo e-mail do passo 2 e cole em
   *Firestore Database > Regras > Publicar*.
   > Sem essa regra o banco fica aberto ou bloqueado, então não pule este passo.
4. **Domínio do site**: em *Authentication > Settings > Domínios autorizados*, adicione o endereço onde o
   site vai ficar (ex.: `seuusuario.github.io`). `localhost` já vem liberado.
5. Suba os arquivos no GitHub e ative o **GitHub Pages** (*Settings > Pages > Deploy from a branch > main / root*).

O painel fica em `https://SEU-ENDERECO/admin.html`.

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
- O login não funciona abrindo o arquivo direto (`file://`). Para testar local:
  `python3 -m http.server 8000` e abra `http://localhost:8000/admin.html`.
