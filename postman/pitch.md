# Tokenized Assets — Pitch (PT-BR)

## Em uma frase

Plataforma para **tokenizar ativos do mundo real na Solana**, com emissão controlada, prova de reservas opcional, resgate com escrow on-chain e camada de **compliance por carteira** integrada ao **Token-2022** (transfer hook).

---

## O que é este projeto

É uma solução que une **contratos inteligentes em Anchor** a uma **API backend** (NestJS no monorepo) para operar o ciclo de vida de representações digitais de ativos reais: definição de classes de ativo, criação do mint, distribuição aos investidores, transferências sujeitas a regras, resgates e reconciliação com o mundo off-chain (liquidação, provas de lastro).

O núcleo on-chain é composto por **dois programas** que se complementam de forma deliberada.

---

## Os dois programas Solana

### 1. `tokenized_assets`

Programa principal que concentra a **lógica de negócio do ativo tokenizado**:

- Configuração global do programa (autoridade, pausa de emergência).
- **Classes de ativo** (`AssetClass`): templates com parâmetros como modo de mintagem, se permitem resgate, se são transferíveis e se exigem KYC.
- **Criação de ativos** com mint **Token-2022**: o PDA do ativo é **mint authority** e **freeze authority** — não é necessário guardar chave privada do mint após a criação.
- **Papéis por ativo** (`Roles`): administrador, minter e auditor, rotacionáveis sem depender apenas da autoridade global.
- **Mintagem** e **queima** (`mint_asset`, `burn_asset`), com espelhamento de supply on-chain e sincronização opcional com o mint (`sync_supply`).
- **Prova de reservas** (`init_reserve`, `update_reserve`): modo em que a mintagem respeita um teto lastreado por evidências publicadas (hash + totais) atualizadas pelo **auditor**.
- **Resgate em três passos**: pedido pelo usuário (`request_redemption`), cancelamento pelo usuário (`cancel_redemption`) e liquidação on-chain pelo auditor (`fulfill_redemption`), com **escrow** em conta de token associada ao PDA do ativo.

Em resumo: este programa é o **cérebro operacional** da tokenização — emissão, lastro comprovável, controle de papéis e fluxo de saída do investidor.

### 2. `compliance_hook`

Programa **companheiro** dedicado a **compliance em transferências** para classes que exigem KYC:

- Mantém **política por ativo** (`AssetCompliancePolicy`), incluindo vínculo com o programa `tokenized_assets`, o mint correto e a flag **`allow_escrow`**, essencial para permitir que tokens “pass pelo hook” ao irem para o **escrow de resgate**.
- Registra **aprovações por carteira** (`approve_wallet` / `revoke_wallet`): após processos off-chain (KYC, sanções, etc.), apenas carteiras aprovadas podem receber ou manter fluxos compatíveis com a política.
- Implementa o **Transfer Hook do Token-2022** (`execute`): a cada transferência elegível, o hook valida destino e política.

**Por que um segundo programa?** O Token-2022 invoca o hook durante CPIs de transferência. Separar o hook evita **reentrância no mesmo programa** quando `tokenized_assets` precisa chamar o SPL Token — cenário que, em desenhos anteriores, bloqueava o fluxo de **resgate com escrow** para mints com KYC. Arquitetura em dois programas é decisão de **segurança e compatibilidade**, não apenas organização.

---

## Fluxos principais (visão de alto nível)

### Mintagem (emissão)

1. Existe uma **classe de ativo** com regras definidas (incluindo modo _proof_ ou não, e se exige KYC).
2. O **minter** (papel on-chain) chama `mint_asset`, que credita tokens na ATA do destinatário.
3. Em modo **proof**, há um PDA de **reserva**: o supply emitido não pode ultrapassar o valor **lastreado** declarado e atualizado pelo auditor (`total_backed ≥ total_supply` no modelo do programa).
4. Para classes **com KYC**, a mintagem exige uma **entrada de aprovação** (`ApprovalEntry`) no `compliance_hook` para a carteira do recebedor — alinhando emissão a um cadastro prévio controlado pelo operador.

### Queima (`burn_asset`)

O **titular da conta de token** pode queimar voluntariamente parte do saldo. Isso reduz o supply no mint e o programa atualiza o espelho de supply no estado do ativo. Útil para encerramentos voluntários, ajustes ou fluxos em que a redução de tokens não passa pelo escrow de resgate.

### Resgate e escrow

1. **`request_redemption`** (assinado pela **carteira do usuário**): transfere os tokens do usuário para uma **ATA de escrow cuja autoridade é o PDA do ativo**, abre (ou usa) um registro **`Redemption`** por par (ativo × usuário) e emite evento para indexadores/backends. Assim os tokens ficam **bloqueados on-chain** enquanto o operador processa a liquidação off-chain (ex.: wire, custódia).
2. Para ativos com **transfer hook**, o caminho até o escrow só funciona se a política permitir **`allow_escrow`** — caso contrário o hook rejeitaria o destino.
3. **`cancel_redemption`**: o mesmo usuário pode **reaver os tokens** do escrow se desistir antes da liquidação final.
4. **`fulfill_redemption`** (papel **auditor**): após confirmação off-chain do pagamento/devolução do lastro, o auditor **queima** os tokens em escrow, fecha o PDA de resgate e atualiza supply — encerrando o ciclo on-chain.

**Ponto de compliance e confiança:** a liquidação em fiat ou ativo físico é **off-chain**; o protocolo amarra o que é verificável na cadeia (escrow, queima, eventos, papéis). Operadores precisam de processos e contratos legais claros para o que acontece fora da Solana.

### Transferências entre carteiras (KYC)

Para mints “com hook”, cada **transferência** passa pelo **`compliance_hook::execute`**: destinos que não são o escrow permitido exigem **aprovação ativa** da carteira de destino (e regras como expiração podem ser representadas nos parâmetros de aprovação). Isso implementa uma forma de **whitelist por ativo** compatível com transferências peer-to-peer supervisionadas.

---

## Compliance e governança — detalhes que importam

| Tema                       | Comportamento relevante                                                                                                                                                                               |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **KYC e whitelist**        | Aprovações/revogações ficam no `compliance_hook`; mint e transfers dependem delas conforme a classe do ativo.                                                                                         |
| **Escrow de resgate**      | Política com `allow_escrow: true` é obrigatória para o fluxo de resgate com tokens sujeitos ao hook.                                                                                                  |
| **Separação de programas** | Hook fora de `tokenized_assets` evita bloqueio técnico (reentrância) no resgate — requisito de arquitetura para compliance + CPI ao Token-2022.                                                       |
| **Prova de reservas**      | Modo _proof_ liga emissão a evidências on-chain (hashes e totais), com papel dedicado de **auditor** para atualizar o lastro declarado.                                                               |
| **Papéis segregados**      | Admin / minter / auditor por ativo reduzem concentração de poder em uma única chave operacional.                                                                                                      |
| **Pausa global**           | `set_paused` funciona como **circuit breaker** para emergências.                                                                                                                                      |
| **Ativo inativo**          | `set_asset_active` pode impedir novas mintagens mesmo com o restante do sistema operacional.                                                                                                          |
| **Rastreabilidade**        | Eventos Anchor (`MintEvent`, `BurnEvent`, resgates, políticas, reservas, etc.) alimentam **indexadores** e auditoria off-chain.                                                                       |
| **API e assinaturas**      | O backend documentado suporta rotas administrativas com idempotência, construção de transações e — no resgate — padrão **usuário assina / backend envia**, alinhado a UX regulatória e logs em banco. |

---

## O que mais existe no repositório (para completar a visão do produto)

- **Testes de integração** Anchor/TypeScript cobrindo fluxos críticos (incluindo KYC, escrow e resgate).
- **Documentação** em `docs/integration/`, `docs/backend/` e `docs/development/` (fluxos ponta a ponta, signer, workers de confirmação e indexação).
- **Docker** e variáveis de ambiente para subir API com Redis em ambiente de desenvolvimento.

---

## Mensagem para investidores e parceiros

Este projeto posiciona a tokenização de RWA **com separação clara entre emissão/reserva/resgate** e **camada de compliance transferível**, usando padrões modernos da Solana (Token-2022 + transfer hook) sem sacrificar o fluxo de **resgate com escrow**. A governança é explicitamente **multipartida** (config global, papéis por ativo, auditor de reservas e de resgate), o que conversa com exigências de **transparência operacional** e **controles** típicas de produtos financeiros tokenizados.

---

_Documento derivado do estado atual dos programas `tokenized_assets` e `compliance_hook` e da documentação do repositório. IDs de programa e detalhes de deploy devem ser confirmados no ambiente alvo._
