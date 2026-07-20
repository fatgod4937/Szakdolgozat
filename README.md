## Floofs

# Tématerv

## Személyes adatok

Név: Dergecz Ákos

Neptun: CNYSPV

E-mail: dergeczakos1208@gmail.com

Szak: Programtervező informatika

Végzés várható ideje: 2026/27-1

## A szakdolgozat tárgya

A szakdolgozat célja egy „Floofs” nevű, többplatformos (web- és mobil-) alkalmazás tervezése és fejlesztése, amely az állatok örökbefogadásának folyamatát teszi átláthatóbbá, hatékonyabbá és felhasználóbarátabbá. Jelenleg az örökbefogadással kapcsolatos információk jelentős része közösségi médiafelületeken, elsősorban Facebook-csoportokban található meg, amelyek strukturálatlanok, nehezen kereshetők és gyakran átláthatatlanok. A dolgozat erre a problémára kínál egy korszerű digitális megoldást.

Az alkalmazás központi eleme egy könnyen kezelhető, intuitív felhasználói felület, amely lehetővé teszi az állatok közötti gyors és élményszerű böngészést. A rendszer tartalmaz egy „jobbra-balra húzás” alapú interakciós modellt, amely azonban nem az állatok „elutasítására” épül. A balra húzás ebben az esetben nem negatív döntést jelent, hanem azt, hogy az adott állat bizonyos preferenciák (például nem gyermekbarát, nem megfelelő méretű vagy energiaszintű) miatt nem kerül be a felhasználó „kedvencek” listájába. A jobbra húzás ezzel szemben az érdeklődés kifejezése, amely során az adott állat bekerül a kedvencek közé.

A rendszer egy többlépcsős kedvencek-kezelési mechanizmust is bevezet, amely segíti a felhasználókat a döntéshozatalban. A használat első szakaszában a felhasználók több állatot is megjelölhetnek kedvencként, így egy szélesebb lista alakul ki. Egy meghatározott időszak (például egy hét) után az alkalmazás értesítést küld, amely arra ösztönzi a felhasználót, hogy válogassa újra a kedvenceit. Ez a második szűrési lépés lehetővé teszi, hogy a kezdeti, nagyobb halmazból fokozatosan csak azok az állatok maradjanak meg, amelyek valóban a leginkább megfelelnek az adott felhasználó igényeinek és élethelyzetének. Ennek eredményeként a felhasználó végül néhány, számára ideális állat közül választhat.

Az alkalmazás emellett hagyományos keresési funkciókat is biztosít, így a felhasználók célzottan is kereshetnek különböző szempontok alapján. A tervezett funkciók közé tartozik a felhasználók közötti kommunikációt biztosító chatrendszer, az adminisztratív felület a tartalmak kezelésére, valamint menhelyek számára dedikált profilok létrehozása. A rendszer külön hangsúlyt fektet a felhasználók hitelesítésére: a magánszemélyek azonosítása külső API-n keresztül történik hivatalos igazolványok segítségével, biztosítva, hogy egy felhasználó csak egy profillal rendelkezzen.

A platform része egy intelligens chatbot is, amely segíti a felhasználókat az örökbefogadási folyamattal kapcsolatos kérdések megválaszolásában. Emellett a rendszer támogatja a többnyelvűséget (magyar és angol nyelven), valamint közösségi funkciókat is kínál, például az örökbefogadott állatok történeteinek megosztását.

A projekt további célja a menhelyek támogatása, amely integrált adományozási lehetőségeken (például Stripe) keresztül valósul meg. Az alkalmazás alapvetően ingyenesen használható, és minimális reklámmegjelenítést tartalmaz, kizárólag opcionális támogatási funkciókhoz kapcsolódóan.

A szakdolgozat során a rendszer tervezési folyamata, architektúrája, technológiai háttere, valamint a felhasználói élmény optimalizálása kerül bemutatásra, különös tekintettel a skálázhatóságra, adatbiztonságra és a modern webes és mobilfejlesztési megoldások alkalmazására.

## Használni kívánt technológiák

- Frontend:
  - React (PWA, TypeScript)

- Backend:
  - NestJS (Node.js, TypeScript)
  - Prisma ORM
  - REST API és WebSocket (Socket.IO)
- Adatbázis:
  - PostgreSQL

- Gyorsítótár és session kezelés:
  - Redis

- Valós idejű kommunikáció:
  - Socket.IO

- Értesítések:
  - Firebase Cloud Messaging

- Külső szolgáltatások:
  - Stripe API (adományozás)
  - Stripe Identity (felhasználó azonosítás)

## Tervezett ütemezés

### 1. fázis – Tervezés és előkészítés

**Időszak:** 2026.05.11 – 2026.05.31

Ebben a szakaszban a projekt alapjainak lefektetése történik meg.  
Feladatok:

- Tématerv véglegesítése
- Követelmények részletes meghatározása
- Technológiai stack véglegesítése

**Eredmény:** dokumentált rendszerterv ✅

---

### 2. fázis – Backend alapok kialakítása

**Időszak:** 2026.06.01 – 2026.06.30

A backend rendszer alapjainak implementálása történik.  
Feladatok:

- NestJS projekt inicializálása és struktúra kialakítása ✅
- Adatbázis kapcsolat beállítása (PostgreSQL + Prisma ORM) ✅
- Felhasználói rendszer (regisztráció, bejelentkezés, JWT alapú autentikáció) ✅
- Alap entitások létrehozása (felhasználók, menhelyek) ✅
- Alap CRUD API-k implementálása ✅
- Redis integráció (session/cache alapok) ❌

**Eredmény:** működő backend alapfunkciókkal ❌

---

### 3. fázis – Alap funkciók implementálása

**Időszak:** 2026.07.01 – 2026.07.31

A rendszer központi funkcionalitásának fejlesztése.  
Feladatok:

- Állatok kezelésének implementálása (CRUD, képek, adatok) ❌
- Swipe alapú böngészési logika kialakítása ❌
- Kedvencek rendszer implementálása (többlépcsős logika) ❌
- Alap keresési és szűrési funkciók ❌
- Backend oldali preferencia- és szűrési logika ❌

**Eredmény:** működő böngészési és kiválasztási rendszer

---

### 4. fázis – Haladó funkciók fejlesztése

**Időszak:** 2026.08.01 – 2026.08.31

Komplexebb funkciók és integrációk megvalósítása.  
Feladatok:

- Valós idejű chat rendszer implementálása (Socket.IO) ❌
- Push értesítések bevezetése (Firebase Cloud Messaging) ❌
- Felhasználó-azonosítás külső API-val ❌
- Adományozási rendszer integrálása (Patreon vagy Stripe) ❌
- Adminisztrációs felület backend támogatása ❌
- Rendszer biztonsági és jogosultsági finomhangolása ❌

**Eredmény:** teljes funkcionalitású backend rendszer

---

### 5. fázis – Frontend fejlesztés és integráció

**Időszak:** 2026.09.01 – 2026.09.15

A felhasználói felület és a backend integrációja.  
Feladatok:

- React alapú PWA alkalmazás fejlesztése ❌
- UI/UX kialakítása (swipe felület, profilok, listák) ❌
- API integráció a backenddel ❌
- Chat és értesítések frontend oldali kezelése ❌
- Reszponzív működés biztosítása ❌

**Eredmény:** működő webes (PWA) alkalmazás

---

### 6. fázis – Tesztelés, dokumentáció és befejezés

**Időszak:** 2026.09.15 – 2026.09.30

A projekt lezárása és dokumentálása.  
Feladatok:

- Funkcionális és integrációs tesztelés ❌
- Hibajavítások ❌
- Szakdolgozat megírása ❌
- Architektúra és technológiai döntések dokumentálása ❌
- Diagramok és illusztrációk elkészítése ❌
- Végső ellenőrzés és leadás ❌

**Eredmény:** kész szakdolgozat és bemutatható alkalmazás

tematerv.md
tematerv.md megjelenítése.
