# 7 Communication — Mobile Accessories Shop Panel (One-time)

Ye **alag standalone website/app** folder hai: `D:\Rizwan Work\7communication-mobile`  
Ismein **mobile accessories** ka shop panel hai (POS/Sell, Inventory/Stock, Serial/IMEI, Brands, Categories, Sales/Invoices, Service Jobs, Suppliers, Settings waghera) aur **alag login** hai.

## Important (Database)
- **Purana database bilkul use/touch nahi kiya gaya.**
- Maine `.env` aur `.env.example` mein sirf **placeholder** `DATABASE_URL` rakha hai.
- Aap apna **naya cloud database (7communication)** bana kar uska connection string dein — main aakhri step mein sirf wahi URL set karne ko kahunga. Jab tak aap naya URL nahi dalenge aur `db:push` nahi chalenge, naya DB create/populate nahi hoga.

## UI/Behavior (aapki request ke mutabiq)
- One-time panel (monthly subscription/trial flow nahi).
- Login alag: `/login`
- Sidebar **top** par **shop ka name/logo** (platform owner ki jagah).
- Sidebar **bottom** par profile card nahi (sirf Log out).

## Setup (naye 7communication database ke sath)
1. **Node.js** (18.17+ recommended) install ho.
2. Folder open karein: `D:\Rizwan Work\7communication-mobile`
3. Dependencies install:
   ```powershell
   npm install
   ```
4. `.env` mein **naya** `DATABASE_URL` paste karein (sirf 7communication wala, purana nahi) aur `AUTH_SECRET` ko strong random value kar dein.
5. Database schema push (naye DB par):
   ```powershell
   npm run db:push
   ```
6. Initial shop + owner login seed:
   ```powershell
   npm run db:seed
   ```
7. Run:
   ```powershell
   npm run dev
   ```
   phir open karein: http://localhost:3000 (login par redirect hoga)

## Default login (seed ke baad) — baad mein change kar lein
- **Email:** `owner@7communication.com`
- **Password:** `ChangeMe123!`

> Security: pehli login ke baad password/owner details Settings ya DB se update kar lein. Agar aap chahen to main seed values (email/password/shop name/logo) aapki details se change kar deta hoon.

## Aapse chahiye (aakhri step)
Mujhe apne **naye 7communication cloud database ka `DATABASE_URL` (PostgreSQL connection string)** bhej dein.  
Main verify kar dunga ke `.env` sirf usi par point kare (purane DB ka koi reference nahi), aur agar aap bolein to `db:push`/`db:seed` ke exact commands bata/suggest kar dunga.
