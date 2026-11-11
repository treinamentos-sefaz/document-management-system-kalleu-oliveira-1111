# Especificação - Document Management System

> Especificação gerada a partir de `docs/specs/spec-template.md` para orientar o
> desenvolvimento guiado por especificação (Spec Driven Development). Este
> documento contém apenas o planejamento; a implementação de backend e frontend
> ocorre nos passos seguintes.

## 1. Objetivo

Entregar uma aplicação web simples que permita a cada usuário enviar, listar e
baixar seus documentos, armazenando os arquivos no filesystem local da
aplicação.

## 2. Escopo

### Dentro do escopo

- Upload de documentos
- Listagem de documentos
- Download de documentos
- Gestão simples por usuário (identificação do dono via cabeçalho `X-User-Id`)

### Fora do escopo

- Armazenamento externo ou em nuvem (S3, Blob Storage, serviços de upload de terceiros)
- Versionamento de documentos
- Autenticação/autorização completa (login, senha, tokens)
- Persistência de metadados em banco de dados
- Edição, renomeação ou exclusão de documentos
- Pré-visualização de documentos no navegador

## 3. Requisitos funcionais

| ID    | Requisito                                                                                 |
| ----- | ----------------------------------------------------------------------------------------- |
| RF-01 | O usuário pode enviar um documento                                                        |
| RF-02 | O usuário pode listar os documentos enviados                                              |
| RF-03 | O usuário pode baixar um documento pelo identificador                                     |
| RF-04 | Cada documento é associado ao usuário que o enviou (`owner`)                              |
| RF-05 | A listagem retorna apenas os documentos do usuário informado                              |
| RF-06 | O download só é permitido ao dono do documento                                            |
| RF-07 | O download preserva o nome original do arquivo (`Content-Disposition`)                    |
| RF-08 | O sistema rejeita uploads sem arquivo, sem usuário ou acima do tamanho máximo configurado |
| RF-09 | O frontend exibe formulário de upload, lista de documentos e ação de download             |
| RF-10 | O frontend exibe mensagens de sucesso e erro em português                                 |

## 4. Requisitos não funcionais

| ID     | Requisito                                                                             |
| ------ | ------------------------------------------------------------------------------------- |
| RNF-01 | Arquivos gravados no filesystem local via multer (`diskStorage`) em `backend/storage` |
| RNF-02 | Metadados mantidos em memória nesta fase                                              |
| RNF-03 | Configuração via variáveis de ambiente (12-Factor)                                    |
| RNF-04 | Nome do arquivo em disco gerado pelo servidor (UUID), nunca o nome enviado            |
| RNF-05 | Tamanho máximo de upload limitado por configuração (`MAX_FILE_SIZE_BYTES`)            |
| RNF-06 | Erros tratados nos limites do sistema com respostas JSON padronizadas                 |
| RNF-07 | Testes do backend com `node:test`                                                     |
| RNF-08 | Sem TypeScript e sem novas dependências além das presentes no `package.json`          |

### Variáveis de ambiente

| Variável              | Padrão             | Descrição                          |
| --------------------- | ------------------ | ---------------------------------- |
| `PORT`                | `3000`             | Porta HTTP do backend              |
| `STORAGE_DIR`         | `backend/storage`  | Diretório de gravação dos arquivos |
| `MAX_FILE_SIZE_BYTES` | `10485760` (10 MB) | Tamanho máximo por arquivo         |

## 5. Modelo de dados (metadados do documento)

| Campo        | Tipo   | Descrição                                           |
| ------------ | ------ | --------------------------------------------------- |
| id           | string | Identificador único do documento (UUID)             |
| originalName | string | Nome original do arquivo enviado                    |
| storedName   | string | Nome do arquivo em disco (uso interno, não exposto) |
| mimeType     | string | Tipo MIME informado no upload                       |
| size         | number | Tamanho em bytes                                    |
| uploadedAt   | string | Data/hora do upload (ISO 8601)                      |
| owner        | string | Identificador do usuário dono                       |

Os metadados ficam em um `Map` em memória no repositório, indexado por `id`.
`storedName` não é retornado nas respostas da API.

## 6. Contratos de API

Todas as rotas de documentos exigem o cabeçalho `X-User-Id`. No frontend as
chamadas usam o prefixo `/api`, removido pelo proxy do Vite.

### Formato de erro

```json
{ "error": "Mensagem descritiva em português" }
```

### POST /upload

- Entrada: `multipart/form-data` com o campo `file`; cabeçalho `X-User-Id`
- Saída `201 Created`:

```json
{
  "id": "3f1c...",
  "originalName": "relatorio.pdf",
  "mimeType": "application/pdf",
  "size": 12345,
  "uploadedAt": "2026-11-11T12:00:00.000Z",
  "owner": "alice"
}
```

- Erros: `400` (arquivo ou `X-User-Id` ausente), `413` (arquivo acima do limite)

### GET /documents

- Entrada: cabeçalho `X-User-Id`
- Saída `200 OK`: lista de metadados do usuário, do mais recente ao mais antigo

```json
[
  {
    "id": "3f1c...",
    "originalName": "relatorio.pdf",
    "mimeType": "application/pdf",
    "size": 12345,
    "uploadedAt": "2026-11-11T12:00:00.000Z",
    "owner": "alice"
  }
]
```

- Erros: `400` (`X-User-Id` ausente)

### GET /documents/:id/download

- Entrada: parâmetro `id`; cabeçalho `X-User-Id`
- Saída `200 OK`: conteúdo binário do arquivo, com `Content-Type` igual ao
  `mimeType` e `Content-Disposition: attachment; filename="<originalName>"`
- Erros: `400` (`X-User-Id` ausente), `404` (documento inexistente ou de outro
  usuário, sem revelar a existência do recurso), `500` (falha de leitura do arquivo)

### GET /health

- Saída `200 OK`: `{ "status": "ok" }` (já existente)

## 7. Decisões arquiteturais

- Backend em Clean Architecture simples (routes, controllers, services, repositories)
  - Fluxo de dependência: `routes -> controllers -> services -> repositories`
  - `routes/documentRoutes.js`: define endpoints e configura o middleware do multer
  - `controllers/documentController.js`: lê `X-User-Id`, valida entrada e monta respostas HTTP
  - `services/documentService.js`: regras de negócio (criação de metadados, filtro por dono, verificação de posse)
  - `repositories/documentRepository.js`: `Map` em memória e resolução do caminho do arquivo em disco
  - `config.js`: leitura centralizada das variáveis de ambiente
  - Middleware de erro centralizado em `app.js` (incluindo `MulterError` `LIMIT_FILE_SIZE` → `413`)
- Frontend baseado em componentes (React)
  - `services/documentService.js`: chamadas `fetch` para `/api`
  - `components/UserSelector.jsx`, `components/UploadForm.jsx`, `components/DocumentList.jsx`
  - `pages/DocumentsPage.jsx`: compõe os componentes e gerencia estado com hooks
- Armazenamento local apenas
  - multer `diskStorage` com `destination` = `STORAGE_DIR` e `filename` = `crypto.randomUUID()`
  - Download via `res.download` a partir do caminho resolvido no repositório, evitando path traversal
- Identificação de usuário via cabeçalho `X-User-Id` (sem autenticação nesta fase)

## 8. Plano de execução

1. **Configuração**: criar `backend/src/config.js` com `PORT`, `STORAGE_DIR` e
   `MAX_FILE_SIZE_BYTES`; garantir a criação do diretório de storage na inicialização.
2. **Repositório**: implementar `documentRepository` (`save`, `findById`,
   `findByOwner`, `resolveFilePath`) com `Map` em memória.
3. **Serviço**: implementar `documentService` (`registerUpload`, `listByOwner`,
   `getForDownload` com verificação de dono).
4. **Controller**: implementar `documentController` (`upload`, `list`, `download`)
   com validação de `X-User-Id` e do arquivo.
5. **Rotas**: implementar `documentRoutes` com multer `diskStorage` e limite de
   tamanho; registrar as rotas em `app.js`.
6. **Tratamento de erros**: middleware centralizado com respostas JSON e
   mapeamento de erros do multer.
7. **Testes do backend** (`node:test`): upload válido, upload sem arquivo/usuário,
   listagem filtrada por dono, download pelo dono, `404` para outro usuário e id inexistente.
8. **Serviço do frontend**: `services/documentService.js` com `uploadDocument`,
   `listDocuments` e `downloadDocument` usando `fetch` e `/api`.
9. **Componentes do frontend**: `UserSelector`, `UploadForm`, `DocumentList`.
10. **Página**: `DocumentsPage` integrando os componentes; atualizar `App.jsx`.
11. **Integração e validação**: executar backend e frontend juntos, validar o fluxo
    completo de upload, listagem e download; atualizar o `README.md`.

## 9. Critérios de aceite

- Todos os endpoints respondem conforme os contratos da seção 6
- Arquivos aparecem em `backend/storage` com nome gerado pelo servidor
- Um usuário não vê nem baixa documentos de outro usuário
- `npm test` no backend passa sem falhas
- O frontend permite enviar, listar e baixar documentos sem recarregar a página
# Especificação - Document Management System

> Especificação gerada a partir de `docs/specs/spec-template.md` para orientar o
> desenvolvimento guiado por especificação (Spec Driven Development). Este
> documento contém apenas o planejamento; a implementação de backend e frontend
> ocorre nos passos seguintes.

## 1. Objetivo

Entregar uma aplicação web simples que permita a cada usuário enviar, listar e
baixar seus documentos, armazenando os arquivos no filesystem local da
aplicação.

## 2. Escopo

### Dentro do escopo

- Upload de documentos
- Listagem de documentos
- Download de documentos
- Gestão simples por usuário (identificação do dono via cabeçalho `X-User-Id`)

### Fora do escopo

- Armazenamento externo ou em nuvem (S3, Blob Storage, serviços de upload de terceiros)
- Versionamento de documentos
- Autenticação/autorização completa (login, senha, tokens)
- Persistência de metadados em banco de dados
- Edição, renomeação ou exclusão de documentos
- Pré-visualização de documentos no navegador

## 3. Requisitos funcionais

| ID    | Requisito                                                                                   |
| ----- | ------------------------------------------------------------------------------------------- |
| RF-01 | O usuário pode enviar um documento                                                          |
| RF-02 | O usuário pode listar os documentos enviados                                                |
| RF-03 | O usuário pode baixar um documento pelo identificador                                       |
| RF-04 | Cada documento é associado ao usuário que o enviou (`owner`)                                |
| RF-05 | A listagem retorna apenas os documentos do usuário informado                                |
| RF-06 | O download só é permitido ao dono do documento                                              |
| RF-07 | O download preserva o nome original do arquivo (`Content-Disposition`)                      |
| RF-08 | O sistema rejeita uploads sem arquivo, sem usuário ou acima do tamanho máximo configurado   |
| RF-09 | O frontend exibe formulário de upload, lista de documentos e ação de download               |
| RF-10 | O frontend exibe mensagens de sucesso e erro em português                                   |

## 4. Requisitos não funcionais

| ID     | Requisito                                                                       |
| ------ | ------------------------------------------------------------------------------- |
| RNF-01 | Arquivos gravados no filesystem local via multer (`diskStorage`) em `backend/storage` |
| RNF-02 | Metadados mantidos em memória nesta fase                                        |
| RNF-03 | Configuração via variáveis de ambiente (12-Factor)                              |
| RNF-04 | Nome do arquivo em disco gerado pelo servidor (UUID), nunca o nome enviado      |
| RNF-05 | Tamanho máximo de upload limitado por configuração (`MAX_FILE_SIZE_BYTES`)      |
| RNF-06 | Erros tratados nos limites do sistema com respostas JSON padronizadas           |
| RNF-07 | Testes do backend com `node:test`                                               |
| RNF-08 | Sem TypeScript e sem novas dependências além das presentes no `package.json`    |

### Variáveis de ambiente

| Variável              | Padrão                | Descrição                          |
| --------------------- | --------------------- | ---------------------------------- |
| `PORT`                | `3000`                | Porta HTTP do backend              |
| `STORAGE_DIR`         | `backend/storage`     | Diretório de gravação dos arquivos |
| `MAX_FILE_SIZE_BYTES` | `10485760` (10 MB)    | Tamanho máximo por arquivo         |

## 5. Modelo de dados (metadados do documento)

| Campo        | Tipo   | Descrição                                          |
| ------------ | ------ | -------------------------------------------------- |
| id           | string | Identificador único do documento (UUID)            |
| originalName | string | Nome original do arquivo enviado                   |
| storedName   | string | Nome do arquivo em disco (uso interno, não exposto)|
| mimeType     | string | Tipo MIME informado no upload                      |
| size         | number | Tamanho em bytes                                   |
| uploadedAt   | string | Data/hora do upload (ISO 8601)                     |
| owner        | string | Identificador do usuário dono                      |

Os metadados ficam em um `Map` em memória no repositório, indexado por `id`.
`storedName` não é retornado nas respostas da API.

## 6. Contratos de API

Todas as rotas exigem o cabeçalho `X-User-Id` (identificador do usuário). No
frontend as chamadas usam o prefixo `/api`, removido pelo proxy do Vite.

### Formato de erro

```json
{ "error": "Mensagem descritiva em português" }
```

### POST /upload

- Entrada: `multipart/form-data` com o campo `file`; cabeçalho `X-User-Id`
- Saída `201 Created`:

```json
{
  "id": "3f1c...",
  "originalName": "relatorio.pdf",
  "mimeType": "application/pdf",
  "size": 12345,
  "uploadedAt": "2026-11-11T12:00:00.000Z",
  "owner": "alice"
}
```

- Erros: `400` (arquivo ausente ou `X-User-Id` ausente), `413` (arquivo acima do limite)

### GET /documents

- Entrada: cabeçalho `X-User-Id`
- Saída `200 OK`: lista de metadados do usuário, ordenada do mais recente ao mais antigo

```json
[
  {
    "id": "3f1c...",
    "originalName": "relatorio.pdf",
    "mimeType": "application/pdf",
    "size": 12345,
    "uploadedAt": "2026-11-11T12:00:00.000Z",
    "owner": "alice"
  }
]
```

- Erros: `400` (`X-User-Id` ausente)

### GET /documents/:id/download

- Entrada: parâmetro `id`; cabeçalho `X-User-Id`
- Saída `200 OK`: conteúdo binário do arquivo, com `Content-Type` igual ao
  `mimeType` e `Content-Disposition: attachment; filename="<originalName>"`
- Erros: `400` (`X-User-Id` ausente), `404` (documento inexistente ou de outro
  usuário — não revela a existência do recurso), `500` (falha de leitura do arquivo)

### GET /health

- Saída `200 OK`: `{ "status": "ok" }` (já existente)

## 7. Decisões arquiteturais

- Backend em Clean Architecture simples (routes, controllers, services, repositories)
  - Fluxo de dependência: `routes -> controllers -> services -> repositories`
  - `routes/documentRoutes.js`: define endpoints e configura o middleware do multer
  - `controllers/documentController.js`: lê `X-User-Id`, valida entrada, monta respostas HTTP
  - `services/documentService.js`: regras de negócio (criação de metadados, filtro por dono, verificação de posse)
  - `repositories/documentRepository.js`: `Map` em memória para metadados e resolução do caminho do arquivo em disco
  - `config.js`: leitura centralizada das variáveis de ambiente
  - Middleware de erro centralizado em `app.js` (incluindo `MulterError` `LIMIT_FILE_SIZE` → `413`)
- Frontend baseado em componentes (React)
  - `services/documentService.js`: chamadas `fetch` para `/api`
  - `components/UploadForm.jsx`, `components/DocumentList.jsx`, `components/UserSelector.jsx`
  - `pages/DocumentsPage.jsx`: compõe os componentes e gerencia estado com hooks
- Armazenamento local apenas
  - multer `diskStorage` com `destination` = `STORAGE_DIR` e `filename` = UUID gerado por `crypto.randomUUID()`
  - Download com `res.download`/`res.sendFile` a partir do caminho resolvido no repositório, evitando path traversal
- Identificação de usuário via cabeçalho `X-User-Id` (simplicidade; sem autenticação nesta fase)

## 8. Plano de execução

1. **Configuração**: criar `backend/src/config.js` com `PORT`, `STORAGE_DIR` e
   `MAX_FILE_SIZE_BYTES`; garantir a criação do diretório de storage na inicialização.
2. **Repositório**: implementar `documentRepository` (save, findById, findByOwner,
   resolveFilePath) com `Map` em memória.
3. **Serviço**: implementar `documentService` (registerUpload, listByOwner,
   getForDownload com verificação de dono).
4. **Controller**: implementar `documentController` (upload, list, download) com
   validação de `X-User-Id` e de arquivo.
5. **Rotas**: implementar `documentRoutes` com multer `diskStorage` e limite de
   tamanho; registrar as rotas em `app.js`.
6. **Tratamento de erros**: middleware centralizado com respostas JSON e
   mapeamento de erros do multer.
7. **Testes do backend** (`node:test`): upload válido, upload sem arquivo/usuário,
   listagem filtrada por dono, download do dono, `404` para outro usuário e id inexistente.
8. **Serviço do frontend**: `services/documentService.js` com `uploadDocument`,
   `listDocuments` e `downloadDocument` usando `fetch` e `/api`.
9. **Componentes do frontend**: `UserSelector`, `UploadForm`, `DocumentList`.
10. **Página**: `DocumentsPage` integrando os componentes; atualizar `App.jsx`.
11. **Integração e validação**: rodar backend e frontend juntos, validar fluxo
    completo de upload, listagem e download; atualizar o `README.md`.

## 9. Critérios de aceite

- Todos os endpoints respondem conforme os contratos da seção 6
- Arquivos aparecem em `backend/storage` com nome gerado pelo servidor
- Um usuário não vê nem baixa documentos de outro usuário
- `npm test` no backend passa sem falhas
- O frontend permite enviar, listar e baixar documentos sem recarregar a página
