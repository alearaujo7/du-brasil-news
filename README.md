# DU BRASIL NEWS — MVP

Painel diário do mercado financeiro: dólar, euro, Bitcoin, Ethereum e outras criptomoedas, sentimento do mercado e indicadores econômicos do Brasil, numa única página, sem necessidade de conta ou backend.

Site 100% estático (HTML + CSS + JS puro) — sem build, sem servidor, sem dependências. Roda igual tanto localmente quanto no Vercel.

## Funcionalidades

- Dólar (USD/BRL) e Euro (EUR/BRL) — via AwesomeAPI, com card visual e mini-gráfico de tendência.
- Bitcoin, Ethereum, Solana, BNB, XRP, Cardano, Dogecoin — via CoinGecko, com logo, ranking por market cap e mini-gráfico de 7 dias em cada card.
- Índice de Medo e Ganância do mercado cripto — via alternative.me, com gauge visual.
- Economia Brasil: Selic (meta) e IPCA (12 meses) direto do Banco Central (API SGS, dado oficial), com cálculo simplificado de juro real (Selic − IPCA).
- Maiores altas e quedas do dia entre as criptomoedas monitoradas.
- Comparador & simulador de ativos: compara o desempenho normalizado (%) de até 2 ativos (cripto, câmbio ou 4 ações-teste da B3) num período de 7/30/90 dias, com gráfico (Chart.js) e simulação de quanto renderia um valor hipotético investido.
- Busca de ativos, favoritos (salvos no navegador), dark mode, modal de detalhes e layout responsivo.

Todas as chamadas de API rodam direto no navegador de quem acessa o site (sem backend). Isso é ótimo para um MVP, mas significa que, se o site crescer muito, o volume de chamadas cresce junto — os provedores usados (CoinGecko, AwesomeAPI, BCB, alternative.me) têm limites de taxa, e uma visita muito concorrida pode ocasionalmente esbarrar neles. Quando isso acontece, a tela mostra "Dados temporariamente indisponíveis" em vez de travar ou inventar números — nunca é exibido um valor fictício.

## Sobre ações da B3

O painel não traz mais uma tabela ao vivo de ações da B3 nem o Ibovespa: a brapi.dev (fonte usada) hoje só libera esses dados via plano pago (a partir de R$ 99,99/mês). Em vez de mostrar uma cobertura parcial e enganosa, o site focou no que consegue entregar por completo: câmbio, cripto e indicadores macro.

O comparador ainda permite comparar o histórico de 4 ações-teste (PETR4, VALE3, ITUB4, MGLU3), que a brapi.dev libera sem custo. Se um dia quiser assinar um plano pago para desbloquear mais ações e o Ibovespa, basta colar o token em `js/config.js`, no campo `BRAPI_TOKEN` — a função `fetchStockHistory` em `js/api.js` já usa esse token automaticamente quando presente.

**Atenção:** como o site não tem backend, um token colado ali ficaria visível no navegador de quem acessa o site. Aceitável para MVP/uso pessoal, mas não use um token de uma conta sensível. Se o projeto crescer, o próximo passo é mover essa chamada para uma função serverless (ex: Vercel Functions).

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
js/app.js              lógica da página (render, busca, favoritos, comparador, etc.)
```

O gráfico do comparador usa a biblioteca Chart.js, carregada por CDN (linha `<script src="https://cdnjs.cloudflare.com/...">` no `index.html`) — não precisa instalar nada.

## Próximos passos sugeridos

- Adicionar seção de notícias (exige um pequeno backend por causa de CORS/agregação de RSS — ex: uma Vercel Function, já que o site está hospedado lá).
- Gerar o resumo "Mercado hoje" com IA a partir dos dados já coletados (hoje é gerado por regras simples, sem inventar informação).
- Adicionar gráfico de preço no modal de detalhes usando o histórico da brapi.dev.
- Mover chamadas de API sensíveis (com token) para funções serverless, escondendo a chave do navegador.
- Ampliar o comparador para todas as ações da B3 quando/se um plano pago da brapi.dev for assinado.
