# Camuflagem do botão Cancel da /up1

Registro de como a camuflagem estava implementada, para poder voltar atrás.

- **Arquivo afetado:** `public/up1/index.html`
- **Removida em:** 2026-09-10
- **Motivo:** remoção temporária, a pedido.

Este arquivo fica fora de `public/`, então **não é servido** — só `public/` vai para o
output estático. Não mover para lá.

---

## O que era a camuflagem

O botão Cancel da `/up1` é um `<a>` nosso (`#customCancel`), que substitui visualmente o
Cancel original do widget da Vendepay. Ele estava com **texto branco sobre fundo branco**,
numa página em que `body`, `.app-screen` e `.terms-modal` também são `#ffffff` — ou seja,
completamente invisível, mas continuando clicável e ocupando espaço no layout.

A camuflagem era uma única declaração: o `color: #ffffff` da classe `.upsell-btn--no`.

### CSS original (restaurar exatamente isto)

```css
    .upsell-btn--no {
      background: #ffffff;
      color: #ffffff;
      font-weight: 500;
    }
```

### Comentário original acima de `#customCancel`

```css
    /* Nosso botão Cancel próprio, logo abaixo do recorte. Cor/estilo sob nosso controle.
       Por ora fica branco no branco (invisível), igual ao Cancel original. */
    #customCancel {
      margin-top: 12px;
    }
```

---

## Como está agora

```css
    .upsell-btn--no {
      background: #ffffff;
      color: #6b6b6b;
      font-weight: 500;
    }
```

`#6b6b6b` não foi inventado: é o cinza que a própria página já usa em `.terms-helper`.
Como o fundo continua `#ffffff`, o botão aparece como um *text button* — só o texto
"Cancel" em cinza, sem caixa visível.

## Como restaurar

Trocar `color: #6b6b6b` de volta para `color: #ffffff` em `.upsell-btn--no` e devolver o
comentário original acima de `#customCancel`. Nada mais foi alterado.

---

# Parte 2 — recorte do widget desligado

**Removido em:** 2026-09-10 (logo após a parte 1).

## O que era o recorte

O `#vendepay-clip` envolve o container do widget e cortava a altura para mostrar só o
"Yes, confirm!", deixando o Cancel **original da Vendepay** fora da área visível.

O detalhe importante: **o CSS não define altura nenhuma**. Quem cortava era o script, que
media o iframe em runtime e fazia `clip.style.height = altura * 0.52`. Um `overflow: hidden`
num div de altura automática não corta nada — por isso desligar o script já basta, e o CSS
e o HTML puderam ficar intactos.

## Como desliguei

Uma flag no início do script do recorte:

```js
var CLIP_ENABLED = false;
...
if (!CLIP_ENABLED || !clip || !container) return;
```

## Como restaurar

Trocar `CLIP_ENABLED` para `true`. Nada mais precisa mudar — CSS (`#vendepay-clip`),
estrutura HTML e toda a lógica de medição (MutationObserver, listeners de resize /
orientationchange / postMessage, os timeouts escalonados e o poll de 800ms) continuam
exatamente como estavam.

---

# Parte 3 — nosso Cancel ocultado

**Aplicado em:** 2026-09-10.

Com o recorte desligado, os dois Cancel apareciam empilhados. O escolhido foi o da
Vendepay, então o nosso saiu de cena:

```css
    #customCancel {
      margin-top: 12px;
      display: none;
    }
```

Usei `display: none` e **não** a camuflagem branca de propósito: um botão branco-no-branco
continua clicável e ocupando espaço, encostado na área de toque do widget — ou seja, vira
clique acidental. `display: none` tira do layout de vez.

O `color: #6b6b6b` da parte 1 foi mantido: se um dia o `display: none` sair, o botão volta
visível, que foi o pedido original. Não desfiz aquilo por conta própria.

---

# Estado atual e consequências

Três desvios temporários ativos, todos em `public/up1/index.html`:

| # | Onde | Desvio | Original |
|---|---|---|---|
| 1 | `.upsell-btn--no` | `color: #6b6b6b` | `color: #ffffff` |
| 2 | script do recorte | `CLIP_ENABLED = false` | não existia — o recorte sempre rodava |
| 3 | `#customCancel` | `display: none` | não existia |

Na tela: aparece **só o Cancel original da Vendepay**, dentro do iframe.

Para voltar exatamente ao estado anterior a tudo isto: desfazer os três.

**Atenção ao destino do Cancel.** O nosso `#customCancel` aponta para
`https://withdraw-tiktok.lovable.app` (definido no HTML). O Cancel original da Vendepay
vai para onde estiver configurado **no painel deles**, que não necessariamente é o mesmo
lugar. Com o recorte desligado, o visitante que clicar no botão da Vendepay sai pelo
destino do painel, não pelo nosso href.
