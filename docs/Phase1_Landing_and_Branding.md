# Phase 1: Global Layout & Landing Page

**Context:** We are rebuilding the frontend to match the EM3D.pt brand. 

**Tasks:**
1. **Global Layout (`app/layout.tsx`):**
   - Update metadata to EM3D (Title: "EM3D · Objetos úteis, impressão 3D em Portugal").
   - Create a premium Header (Logo left, Links: "Loja", "Mensagem por IA", "Pedido Personalizado", "Empresas").
   
2. **The Homepage (`app/page.tsx`):**
   - **Hero Section:** Headline "Objetos úteis, feitos à tua medida." CTA 1: "Criar Produto Personalizado" (routes to `/pedido-personalizado`). CTA 2: "Explorar Coleções" (scrolls down).
   - **Bestsellers Section:** Hardcode 3 elegant cards (e.g., Placa Casa Nova, Candeeiro com Nome). Route them to `/produto/[slug]`.
   - **The "AI Message" Hook Section:** Build a beautiful static UI showcasing the "Gerar Mensagem com IA" concept (select Occasion, Tone -> shows a pre-written message).
   - **Categories Grid:** Display aesthetic blocks for "Casa & Organização", "Secretária", "Empresas". Link them to `/loja`.
   - **The Process (4 Steps):** 1. Diz-nos o que queres, 2. Recebes proposta, 3. Aprovas detalhes, 4. Produzimos.

**Constraints:** Tailwind CSS. Black/white/grey palette with a single premium accent color. PT-PT only.