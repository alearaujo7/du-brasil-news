# DU BRASIL NEWS

Painel de criptomoedas e câmbio: dólar, euro, Bitcoin, Ethereum e outras criptomoedas, mais o sentimento do mercado cripto, numa única página, sem necessidade de conta ou backend.

Site 100% estático (HTML + CSS + JS puro) — sem build, sem servidor, sem dependências. Roda igual tanto localmente quanto no Vercel.

## Funcionalidades

- Dólar (USD/BRL) e Euro (EUR/BRL) — via AwesomeAPI, com card visual e mini-gráfico de tendência dos últimos 7 dias.
- Bitcoin, Ethereum, Solana, BNB, XRP, Cardano, Dogecoin — via CoinGecko, com logo, ranking por market cap e mini-gráfico de 7 dias em cada card.
- Índice de Medo e Ganância do mercado cripto — via alternative.me, com anel de progresso visual (0 = medo extremo, 100 = ganância extrema).
- Maiores altas e quedas do dia entre as criptomoedas monitoradas.
- Busca de ativos, favoritos (salvos no navegador), dark mode, modal de detalhes e layout responsivo.

Todas as chamadas de API rodam direto no navegador de quem acessa o site (sem backend). Isso é ótimo para um site simples, mas significa que, se o site crescer muito, o volume de chamadas cresce junto — os provedores usados (CoinGecko, AwesomeAPI, alternative.me) têm limites de taxa, e uma visita muito concorrida pode ocasionalmente esbarrar neles. Quando isso acontece, a tela mostra "Dados temporariamente indisponíveis" em vez de travar ou inventar números — nunca é exibido um valor fictício.

## Sobre ações da B3

O painel não traz uma tabela ao vivo de ações da B3 nem o Ibovespa: a fonte que seria usada (brapi.dev) hoje só libera esses dados via plano pago. O site é focado exclusivamente em criptomoedas e câmbio, onde consegue entregar dados 100% confiáveis e gratuitos.

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
js/config.js          configurações (edite aqui)
js/api.js             camada de integração com as APIs externas
js/app.js              lógica da página (render, busca, favoritos, etc.)
```

Todos os gráficos (sparklines, anel de sentimento) são feitos com SVG/CSS puro — sem biblioteca externa, sem CDN, sem risco de travar por causa de uma dependência de terceiros.

## Próximos passos sugeridos

- Adicionar seção de notícias (exige um pequeno backend por causa de CORS/agregação de RSS — ex: uma Vercel Function, já que o site está hospedado lá).
- Gerar o resumo "Mercado hoje" com IA a partir dos dados já coletados (hoje é gerado por regras simples, sem inventar informação).
- Adicionar gráfico de preço no modal de detalhes usando histórico das criptomoedas.
- Se algum dia fizer sentido trazer ações da B3, avaliar um provedor com plano gratuito de verdade antes de reintroduzir a seção.
