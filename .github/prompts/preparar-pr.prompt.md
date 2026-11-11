---
description: Prepara título e descrição de Pull Request a partir das mudanças da branch atual em relação à main.
name: preparar-pr
argument-hint: contexto adicional (opcional)
agent: agent
tools: ['search', 'codebase', 'changes', 'runCommands']
---

# Preparar Pull Request

Gere o título e a descrição de um Pull Request da branch atual para a `main`.

Contexto adicional: ${input:contexto:contexto opcional para o PR}

## Passos

1. Liste os commits com `git log --oneline main..HEAD` e os arquivos alterados com `git diff --stat main...HEAD`.
2. Agrupe as mudanças por área: `backend`, `frontend`, `docs`, `.github`.
3. Confira se as mudanças respeitam `docs/specs/dms-spec.md` e as camadas `routes -> controllers -> services -> repositories`.
4. Rode `cd backend && npm test` e registre o resultado.

## Saída esperada (em português)

- **Título** no formato Conventional Commits (ex.: `feat: upload de documentos`).
- **Resumo** em 1-3 frases.
- **Mudanças** em lista, agrupadas por área.
- **Como testar** com os comandos necessários.
- **Checklist**: testes passando, sem armazenamento externo, sem segredos no código.

Não crie o PR nem faça push; apenas apresente o texto para revisão.
