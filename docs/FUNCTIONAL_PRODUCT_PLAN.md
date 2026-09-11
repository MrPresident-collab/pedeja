# Plano Funcional do Pedejá

> Objectivo: transformar o Pedejá num marketplace de entregas **funcional** de ponta a ponta — do navegar ao avaliar — preservando identidade visual, navegação, arquitectura e fronteiras de segurança já estabelecidas. Referências comportamentais: DoorDash (cliente, Dasher, commerce/tablet), Uber Eats (cliente, entregador), Deliveroo (tablet do comerciante) e dashboards internos de operações. **Não** copiamos marca nem design visual.

- Última actualização: Setembro 2026
- Estado: em implementação (Batch 1: gestão de endereços do cliente + dados pessoais)

---

## 1. Guarda-rail (não negociável)

- Identidade e marca: nome **Pedejá**, tagline **"A promessa que se move."**, identidade roxa, tipografia actual.
- Navegação do cliente inalterada: rodapé **Início · Explorar · Pedidos · Perfil**. **Compras** e **Lojas** continuam categorias separadas.
- **Operations** é uma fronteira interna, nunca autenticada com o marketplace: sem selector de "papel" no cliente, sem flags de admin no cliente, sem chaves de serviço no bundle.
- **Identidade ≠ papel**: capability não é autoridade interna. Nenhuma auto-atribuição de papéis no cliente.
- **Sem redesenho visual**, sem novo framework, sem reescritas gigantes. Novos componentes CSS reutilizam os tokens existentes.
- Autenticação e segurança (fase 3C) ficam intactas: demo OTP 1234, sessão demo em `localStorage "pedeja:demo-session"`, gate de `/estafeta` e `/merchant` sem identidade.

## 2. Referências de pesquisa

### Externas
- **DoorDash — Address Validation Best Practices** (`developer.doordash.com/en-US/docs/drive/how_to/Parcel/address_validation`): pedir o endereço completo, validar a linha de endereço, nunca pedir pontos GPS; pedir endereço o mais cedo possível no fluxo; permite actualizar no último momento.
- **DoorDash — Checkout/External Checkout API** (`developer.doordash.com/en-US/api/external_checkout/`): ciclo de vida pedido `delivery_created → confirmed → in-progress → delivered` com `cancelled`/`failed` (cancelamento possível até certos pontos), entrega fora do horário, gorjetas seroparadas do subtotal.
- **Uber Eats — entregador** (`uber.com/us/en/deliver/earnings`): ir online num raio, oferta mostra *valor + percurso + tempo estimado antes de aceitar*, aceitar/recusar, confirmar recolha, confirmar entrega, Earnings Hub (sessões e resumo semanal), cash-out para carteira.
- **Snappy Shopper / tablet de loja** (guia PDF): aceitar/recusar pedido com motivo, lista de pedidos actuais com número/estado/valor, ajustar tempo de preparação, marcar item esgotado (substituir/refundir), ecrã do dispatcher com entregadores.
- **Deliveroo Tablet**: aceitar/recusar com motivo, auto-recusa ~10 min, ajustar tempo de entrega, "modo ocupado" (pausa), tag de pagamento na entrega, marcar saído para entrega.
- **Uber Eats — cliente**: pesquisa por nome e prato, acompanhamento em tempo real com ETA, agendamento, avaliação pós-entrega (1–5 e comentário).

### Internas (já no repo)
- `docs/IMPLEMENTATION_PLAN.md`, `docs/DOMAIN_MODEL.md`, `docs/SECURITY_ARCHITECTURE.md` — fronteiras, domínio e segurança.
- Fase 3C — fundação de autenticação e identidade (commit `bc46eba`).

## 3. Arquitectura funcional requerida

```
UI (views) → componente lógico / feature service → repositório (interface) → adapter mock (→ Supabase)
```

- **UI** não muta estado de domínio directamente; usa os repositórios.
- **Repositórios** expõem contratos (`repositories/types.ts`) sinceros e prontos para Supabase.
- **Adapter mock** comporta-se de forma realista; estado sobrevive a navegação, voltar, fechar sheets e trocar de tab. Persistência entre *reloads* aceitável onde prático (demo).
- **Ciclos de vida completos**, não apenas "primeiro clique": cada estado tem acções, estados desactivados explicados, erros, cancelamento e feedback.
- **UX**: resultados significativos; validação de formulários; confirmação de acções destrutivas; sucesso/erro visíveis; estados de carregamento e vazio com próxima acção; falhas recuperáveis; campos restritos → suporte; navegação de regresso correcta; totais/estados/contadores consistentes; sem botões decorativos.

## 4. Comparação ecrã-a-ecrã

Legenda estado: 🟩 funcional · 🟨 parcial / placeholder · 🟥 "Em breve" / vazio / bloqueado.

### 4.1 Cliente

| Ecrã | Actual | Referência (DoorDash/Uber Eats) | Recomendado MVP | Prioridade |
|---|---|---|---|---|
| Início (localização) | Sabonete com endereço fixo; sheet só lista 1 endereço fixo 🔶 | Geopin adapta-se ao teu lugar; "Entregar em" escolhível | Sheet de endereços **real** (listar/escolher/adicionar/editar/eliminar); label "Entregar em {endereço}" dinâmico | P0 |
| Início (categorias/promo) | Grid + banner funcional 🟩 | — | manter | — |
| Explorar | Lista de negócios + pesquisa por nome 🟨 | Pesquisa por nome e prato, filtros | (mais tarde) pesquisa por prato/categoria, filtros preço/razão/tempo | P1 |
| Negócio | Menu, adicionar ao carrinho, promo 🟩 | Cardápio com esgotados, valor min | esgotados assinalados; valor mínimo no checkout | P1 |
| Carrinho/Checkout | Checkout funcional 🟩; sem endereço no pedido; pagamentos de cartão "Em breve" | Endereço + método + gorjeta; validar endereço antes de ordernar | Endereço real ligado ao pedido + "Trocar" (Batch 1); validação se sem endereço | P0 |
| Perfil | Identidade + listas; quase tudo → toast "Estamos a preparar isso" 🟥 | Endereços editáveis; dados pessoais; pagamentos; encerramento de conta | Endereços CRUD (Batch 1); dados pessoais protegidos → suporte (Batch 1); restante mais tarde | P0 |
| Pedidos | Activo/histórico, timeline, recibo, repetir, avaliar, chat, suporte 🟨 | Acompanhamento em tempo real, ETA, cancelamento explicado | Cancelamento com confirmação e regras claras; recibo com endereço de entrega (Batch 1); tracking mais rico mais tarde | P1 |
| Categoria/Enviar | Enviar com estimativas 🟩 (parcela) | tracking de parcela | integrado em estafeta/ops mais tarde | P1 |

### 4.2 Estafeta

| Ecrã | Actual | Referência | Recomendado MVP | Prioridade |
|---|---|---|---|---|
| Online/Offline | Interruptor funcional 🟩 | Ir online num raio | manter; presença raio mais tarde | P0 |
| Oferta | Card único hardcoded; aceitar + countdown 15 s 🟨 | Oferta mostra valor + percurso + tempo **antes** de decidir; **aceitar OU recusar** | Recusar + repartição do valor (base/percurso/gorjeta) + nova oferta | P0 |
| Entrega activa | Pickup → entregue com steps; lugar/ligar parcial 🔶 | Confirmar recolha, confirmar entrega (foto/assinatura) | excepções (atraso, problema), confirmar com prova | P1 |
| Carteira/Ganhos | Resumo simples 🟨 | Earnings Hub: sessão, semanal, cash-out | repartição por entrega; fluxo de cash-out (mock); histórico | P1 |
| Veículos e perfil | Veículo fixo; verificação "a aprovar" 🔶 | Adicionar/editar/remover veículos, escolher default | CRUD veículos; campos restritos → suporte; logout | P0 |

### 4.3 Comerciante

| Ecrã | Actual | Referência | Recomendado MVP | Prioridade |
|---|---|---|---|---|
| Pedidos | Aceitar/recusar com password; estados de preparação 🟨 | Aceitar/recusar com motivo; ajustar tempo; "pronto"; item esgotado; saído para entrega | motivo de recusa; ajustar tempo de preparação; percurso do estado com acções correctas | P0 |
| Cardápio | CRUD produtos + disponibilidade 🟨 | esgotados visíveis; categorias; preços | disponibilidade/item esgotado no fluxo do cliente; CRUD completo | P1 |
| Config | Pausa/resumo, password mock, horário 🟨 | modo ocupado; abertura/fecho | pausa geral e parcial; horário com validação | P1 |
| Relatórios | Estáticos ⬜ | vendas por período | métricas sem alterar design; filtros de período | P2 |

### 4.4 Operações (fronteira interna)

| Ecrã | Actual | Referência | Recomendado MVP | Prioridade |
|---|---|---|---|---|
| Visão geral | Métricas globais ⬜ | KPIs por mercado | manter estático; dados já do mock | P2 |
| Pedidos/Entregadores/Clientes | Listas + filtros estáticos ⬜ | drill-down com estado | detalhe e filtros funcionais mais tarde | P2 |
| Relatórios/Receita | Estáticos ⬜ | períodos, motivos de recusa | filtros de período/receita | P2 |
| Config/Notif/Support | Canais presentes ⬜ | — | confirmar acções não decorativas | P2 |

## 5. Falta implementar (resumo por papel)

**Cliente (P0 para MVP funcional):**
- Gestão de endereços completa: listar, escolher como actual, adicionar, editar, eliminar (com confirmação e invariante do endereço actual).
- Endereço fluir de Início → Checkout → Pedido (recibo) e persistir no pedido.
- Dados pessoais protegidos → suporte (não editáveis pelo utilizador).
- Checkout sem endereço → validação e orientação (não pode "order" no ar).
- (P1) pesquisa por prato, filtros, esgotados, cancelamento com regras, tracking/ETA.

**Estafeta (P0):** recusar oferta; repartição do valor da oferta antes de aceitar; CRUD de veículos + default; perfil restrito → suporte; logout real (já existe).

**Comerciante (P0):** motivo de recusa; ajustar tempo de preparação; percurso de estado correcto (aceite→preparando→pronto→recolhido) com acções/desactivadas; disponibilidade por item visível no cliente.

**Operações (P2):** estáticos podem ficar; nada vaza para o marketplace.

## 6. Prioridades

- **P0 — fundação do cliente:** endereços (Batch 1), checkout com endereço (Batch 1), dados pessoais → suporte (Batch 1).
- **P0 — estafeta:** oferta completa (recusar + repartição), veículos CRUD.
- **P0 — comerciante:** fluxo de pedido completo (aceitar/recusar com motivo, tempo, estados).
- **P1 — cliente:** pesquisa/filtros, esgotados, cancelamento/tracking, repetir/apagar conta.
- **P1 — estafeta:** carteira/ganhos/cash-out.
- **P1 — comerciante:** cardápio completo.
- **P2 — operações:** detalhe e filtros.

## 7. Dependências

- **Endereços** dependem do contrato `LocationRepository` (addAddress existe; faltam update/remove/setDefault) → mock module-level (sobrevive à navegação).
- **Checkout com endereço** depende de endereços + `CreateOrderInput` (depende de adicionar `deliveryTo`/`deliveryAddressId` ao `Order`).
- **Oferta estafeta** depende de `riderTypes/riderMock` (nova oferta, recusa, repartição).
- **Veículos** dependem do contrato rider (novo `VehicleRepository`).
- **Comerciante** depende de `merchantTypes/merchantMock`.
- Nada depende de Supabase nesta fase; contratos ficam Supabase-ready.

## 8. Faseamento (batches)

### Batch 1 — Fundação do cliente: endereços + dados pessoais ✅ (este batch)
1. Contrato `LocationRepository`: `updateAddress`, `removeAddress`, `setDefault` (+ `addAddress` invariante: primeiro endereço vira actual).
2. `Order`/`CreateOrderInput`: `deliveryTo` + `deliveryAddressId`.
3. Componentes novos: `ConfirmDialog` (modal de confirmação reutilizável), `AddressSheet` (lista + escolher + adicionar + editar + eliminar, com formulário validado e confirmação de eliminação; invariante: não eliminar o endereço actual), `PersonalInfoSheet` (dados protegidos → suporte).
4. Fiar: Home (label dinâmico + picker), Checkout (endereço + "Trocar" + validação), recibo (linha "Entregar em"), Perfil (gestão + dados pessoais).
5. CSS novo reutilizando tokens existentes.

### Batch 2 (proposto) — Cliente: carrinho/checkout profundidade + cancelamento
- Valor mínimo, esgotados, nota, cancelamento com regras e confirmação, tracking/ETA mais rico, repetir/Avaliar já existentes. Persistência de carrinho entre sessões (mock localStorage) e endereços/ordens (localStorage demo) se prático.

### Batch 3 (proposto) — Estafeta: ofertas e veículos
- Recusar oferta; repartição do valor; nova oferta depois de recusar; CRUD veículos + default; perfil restrito → suporte.

### Batch 4 (proposto) — Estafeta: ciclo de entrega e carteira
- Confirmação de recolha, excepções, finalizar com prova; Earnings Hub (sessão/semana), cash-out mock, histórico ligado a carteira.

### Batch 5 (proposto) — Comerciante: pedidos e cardápio
- Aceitar/recusar com motivo, ajustar tempo, percurso de estado correcto, disponibilidade por item refletida no cliente.

### Batch 6+ (proposto) — Parcelas ligadas, operações, QA transversal, persistência demo.

## 9. Adiamentos explícitos (fora deste âmbito)

- PostgreSQL / RLS / realtime / pagamentos reais (multicaixa) — **não começar** sem instrução.
- Redesenho visual, novos frameworks, reescritas.
- Autenticação email/password (estamos em OTP + demo).
- Pesquisa avançada, agendamento, múltiplos mercados, notificações push, tracking GPS real.
- Métricas avançadas de operações.
- Validar `Address` com geocodificação (usamos campo de texto `line`, nunca coordenadas do utilizador — alinhado com DoorDash).

## 10. Validação

- **Manually verified:** que consigo fazer via UI real no dev server (5174) quando aplicável.
- **Source-traced:** proveniente da leitura directa de código (contratos, fluxos, estados).
- **Statics-inferred:** inferido de estática/tipos sem executar.
- **Not yet testable:** depende de backend/credenciais (pagamentos reais, tracking GPS real).
- Comandos: `npm run typecheck` (`tsc --noEmit -p tsconfig.app.json`), `npm run lint` (`eslint .`), `npm run build` (`vite build`).
- Regras de aceitação do batch: mock mode sem credenciais, auth intacta, todas as rotas renderizam, nenhuma capability de ops a vaza, nada de redesenho, fluxos não partem.

## 11. Critério de feito por batch

Todas as funcionalidades declaradas funcionam via repositório (sem mutação directa na UI), com feedback de sucesso/erro, estados vazio/explicado, confirmações de acções destrutivas, campos restritos → suporte, navegação de regresso correcta, e typecheck+lint+build verdes. Commit pequeno e descritivo; push para `origin/main`.