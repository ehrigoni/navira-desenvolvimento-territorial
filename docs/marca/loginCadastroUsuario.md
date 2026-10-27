# Entrada e direcionamento de usuários — NAVIRA

Esta especificação cobre somente a escolha de perfil e o direcionamento para a área correspondente. Os campos e etapas de autenticação e cadastro serão definidos posteriormente.

---

## 1. Entrada na plataforma

Na entrada, o usuário encontra somente estas duas opções clicáveis, em escolha única:

1. **Navegante**
2. **Porto**

Não devem ser exibidos outros perfis nesta etapa. A seleção é obrigatória e não permite escolher as duas opções ao mesmo tempo.

## 2. Direcionamento

Após a autenticação ou o cadastro, a opção escolhida encaminha o usuário para a área correspondente:

```
                   [ Entrada NAVIRA ]
                           |
             +-------------+-------------+
             |                           |
             v                           v
       [ Navegante ]                  [ Porto ]
             |                           |
             v                           v
     [ Página Navegante ]         [ Dashboard do Porto ]
```

* **Navegante:** direciona para sua página, com seus portos, cursos e vagas.
* **Porto:** direciona para o dashboard do porto, com suas vagas, cursos e iniciativas, além de um mapa com os demais portos.
* A opção escolhida deve corresponder ao perfil do usuário autenticado. O usuário não deve acessar a área de outro perfil apenas alterando a opção da entrada.
