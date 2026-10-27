# Fluxo de Autenticação e Cadastro - Claude

Este documento descreve as telas, diálogos e regras de validação para os fluxos de Login e Cadastro de usuários na plataforma.

---

## 1. Tela de Login (Entrar na Plataforma)

O usuário deve preencher as seguintes credenciais para acessar o sistema:

*   **Identificador:** E-mail ou Número de Telefone
*   **Senha:** Senha cadastrada

### Diálogo de Login
> **Sistema:** Bem-vindo de volta! Por favor, insira suas credenciais para acessar a plataforma.
> 
> **Usuário:** *[Informa o E-mail/Telefone e a Senha]*
> 
> **Sistema (Validação):**
> *   *Caso os dados estejam corretos:* O sistema autentica o usuário e direciona para o fluxo correspondente ao tipo de usuário.
> *   *Caso haja incongruência nos dados (Alerta de Erro):* 
>     ⚠️ **Erro:** Usuário ou senha incorretos. Por favor, verifique os dados informados e tente novamente.

---

Abaixo dos campos de login, o sistema exibe o seguinte link:

👉 **[Cadastre-se](#2-tela-de-cadastro)**  
*Não tem uma conta ainda? Junte-se a nós para mapear novas rotas e começar sua jornada hoje mesmo!*

---

## 2. Tela de Cadastro

Ao clicar no link "Cadastre-se", o usuário é direcionado para a tela de criação de conta com os seguintes campos:

1.  **Nome completo\***
2.  **Telefone/WhatsApp\***
    *   *Regra de preenchimento:* O sistema deve formatar o número automaticamente à medida que o usuário digita. O sistema organizará o número telefônico da seguinte forma: (XX) XXXXX-XXXX.
    *   *Regra de validação:* Espere o número telefônico ter a quantidade de dígitos necessária. Após isso verifique se o número de telefone é inválido. Caso o número seja inválido, não permita que o usuário avance para a próxima tela e exiba a mensagem: 
        ❌ **Erro:** O número de telefone informado é inválido. Por favor, insira um número válido com DDD.
3.  **E-mail**
    *   *Regra de preenchimento:* O sistema deve aplicar máscaras/formatação em tempo real à medida que o usuário digita.     
    *   *Regra de validação:* Caso o formato do e-mail seja inválido após o término da digitação, exibe a mensagem:
        ❌ **Erro:** O formato do e-mail inserido é inválido. (Exemplo correto: nome@dominio.com).

    *   *Regra de preenchimento:* O sistema deve checar se já existe outro e-mail semelhante cadastrado. 
    *   *Regra de validação:* Caso o e-mail já esteja cadastrado, exiba a mensagem:
        ❌ **Erro:** O e-mail inserido já está cadastrado.

4.  **Senha**
5.  **Quem é você na jornada?\*** (Seleção de perfil único)
    *   ( ) **Navegante** (pessoa)
    *   ( ) **Porto** (comunidade)
    *   ( ) **Trilha** (curso)
    *   ( ) **Destino** (empresa)
    *   ( ) **Apoiador** (mantenedor)

*\* Campos de preenchimento obrigatório.*

### Diálogo de Cadastro e Submissão
> **Usuário:** *[Preenche todos os campos obrigatórios e clica no botão "Cadastrar"]*
> 
> **Sistema:** *[Processando...]*
> 
> **Sistema (Persistência):** As informações são validadas e guardadas com sucesso no banco de dados.

---

## 3. Fluxos de Direcionamento Pós-Cadastro

Imediatamente após salvar os dados, o sistema adota um dos fluxos correspondentes ao papel selecionado pelo usuário na jornada:

```
                  [ Botão Cadastrar ]
                           |
            ( Salva no Banco de Dados )
                           |
         +-----------------+-----------------+
         | Quem é você na jornada?           |
         |                                   |
         v                                   v
   [ Navegante ]                        [ Porto ]
         |                                   |
         v                                   v
(Fluxo de Pessoa)                   (Fluxo de Comunidade)
         |                                   |
         +-----------------+-----------------+
                           |
         +-----------------+-----------------+
         |                                   |
         v                                   v
   [ Trilha ]                          [ Destino ]
         |                                   |
         v                                   v
  (Fluxo de Curso)                   (Fluxo de Empresa)
         |                                   |
         +-----------------+-----------------+
                           |
                           v
                     [ Apoiador ]
                           |
                           v
                 (Fluxo de Mantenedor)
```

*   **Fluxo Navegante:** Direciona o usuário para a trilha de desenvolvimento individual, preenchimento de perfil profissional e interesses.
*   **Fluxo Porto:** Direciona para a página de criação/vinculação de comunidade, regras de engajamento e ecossistema local.
*   **Fluxo Trilha:** Direciona para a estruturação de módulos de cursos, conteúdos programáticos e ferramentas de aprendizado.
*   **Fluxo Destino:** Direciona para o painel corporativo, publicação de oportunidades e critérios de busca de talentos.
*   **Fluxo Apoiador:** Direciona para a área de gestão de mantenedores, histórico de contribuições e relatórios de impacto da jornada.


