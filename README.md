# DU BRASIL NEWS — MVP

Painel diário do mercado financeiro: dólar, Bitcoin, Ethereum, criptomoedas e ações da B3 em uma única página, sem necessidade de conta ou backend.

Site 100% estático (HTML + CSS + JS puro) — sem build, sem servidor, sem dependências. Roda igual tanto localmente quanto no Vercel.

## O que já funciona sem nenhuma configuração

- Dólar (USD/BRL) e Euro (EUR/BRL) — via AwesomeAPI (grátis, sem cadastro).
- Bitcoin, Ethereum, Solana, BNB, XRP, Cardano, Dogecoin — via CoinGecko (grátis, sem cadastro).
- 4 ações da B3 — PETR4, VALE3, ITUB4, MGLU3 — via brapi.dev (liberadas gratuitamente para teste, sem token).
- Busca de ativos, favoritos (salvos no navegador), maiores altas/quedas, dark mode, modal de detalhes e layout responsivo.

## O que precisa de um token gratuito (opcional)

O Ibovespa e as demais ações da lista original (BBAS3, WEGE3, BBDC4, ABEV3, PRIO3, RENT3) exigem um token da brapi.dev, que é gratuito:

1. Crie uma conta em https://brapi.dev/dashboard
2. Copie seu token na seção "Chaves de API"
3. Abra `js/config.js` e cole o token em `BRAPI_TOKEN: ""`

Sem o token, o painel funciona normalmente, só que com a lista reduzida de ações e sem o card do Ibovespa (aparece "Dados indisponíveis").

**Atenção:** como o site não tem backend, esse token fica visível no navegador de quem acessar o site. Para uso pessoal/MVP isso é aceitável, mas não coloque um token de uma conta com dados sensíveis. Se o projeto crescer, o próximo passo é mover essas chamadas para uma função serverless (ex: Vercel Functions) para esconder o token — a estrutura em `js/api.js` já foi isolada pensando nisso.

## Rodar localmente

Basta abrir `index.html` no navegador. Se preferir um servidor local simples:

```bash
npx serve .
```

## Publicar no GitHub + Vercel

1. **Criar o repositório no GitHub**
   - Crie um repositório novo (ex: `du-brasil-news`) em https://github.com/new
   - No terminal, dentro desta pasta:
     ```bash
     git init
     git add .
     git commit -m "MVP do DU BRASIL NEWS"
     git branch -M main
     git remote add origin https://github.com/SEU-USUARIO/du-brasil-news.git
     git push -u origin main
     ```

2. **Publicar no Vercel**
   - Acesse https://vercel.com e faça login (pode usar sua conta do GitHub)
   - Clique em "Add New… → Project"
   - Selecione o repositório `du-brasil-news`
   - Como é um site estático, o Vercel não pede nenhuma configuração de build — clique em "Deploy"
   - Em menos de 1 minuto você recebe uma URL pública (ex: `du-brasil-news.vercel.app`)

Qualquer novo `git push` para `main` gera um novo deploy automático.

## Estrutura do projeto

```
index.html          página única
css/style.css        estilos (dark mode + responsivo)
js/config.js          configurações e chaves (edite aqui)
js/api.js             camada de integração com as APIs externas
js/app.js              lógica da página (render, busca, favoritos, etc.)
```

## Próximos passos sugeridos

- Adicionar seção de notícias (exige um pequeno backend por causa de CORS/agregação de RSS — ex: uma Vercel Function).
- Gerar o resumo "Mercado hoje" com IA a partir dos dados já coletados (hoje é gerado por regras simples, sem inventar informação).
- Adicionar gráfico de preço no modal de detalhes usando o histórico da brapi.dev.
- Mover chamadas de API sensíveis (com token) para funções serverless, escondendo a chave do navegador.
