# Flashcard Quiz Master → "Tower Climb" тоглоом — Бизнес шаардлагын баримт (BRD)

**Огноо:** 2026-07-29
**Хувилбар:** v3 (давхрууд materialize болно, зөвхөн admin эрхтэй)
**Зорилго:** Одоогийн quiz апп-ыг хүүхдэд (мөн насанд хүрэгчдэд тохиромжтой, хэт хүүхэлдэйн бус) зориулсан, 2 талдаа sidebar-тай, тулаан-суурьтай "tower climb" сургалтын тоглоом болгон хөгжүүлэх төлөвлөгөө.

> **v2 → v3 өөрчлөлт:** Давхрууд цаашид **dynamically (тухай бүрд нь) тооцоологдохгүй** — DB-д **materialize** (тогтмол бичигдэж хадгалагдана). Энэ materialize (үүсгэх/дахин үүсгэх) үйлдлийг **зөвхөн системийн админ** хийх эрхтэй, ердийн категори эзэмшигч (агуулга үүсгэгч) биш. Энэ нь v2-т дурдсан "давхрын хил шилжих эрсдэл"-ийг бүрэн арилгана — доор 10-р хэсэгт шинэ trade-off тайлбарласан.

---

## 1. Тойм ба алсын хараа

Хэрэглэгчийн үүсгэсэн **категори бүр — тусдаа цамхаг (tower)**. Сурагч Tower Select дэлгэцээс сонирхсон сэдвийн цамхгаа сонгож, тэр сэдвээрээ гүнзгийрүүлж суралцана.

Цамхаг тус бүрийн дотор **давхрууд урьдчилан бэлтгэгдсэн (materialized) байна** — үүнийг **зөвхөн системийн админ** үүсгэх/шинэчлэх эрхтэй. Давхрыг бэлтгэхдээ асуултууд хялбар → дунд → хэцүү гэсэн 3 түвшинд ангилагдаж, түвшин тус бүр ~10 асуултаар багцлагдан дараалсан давхар болно. Давхар бүрт нэг дайсан байрлана, дайсны HP = давхрын асуултын тоо × коэффициент. Сурагч зөв хариулах тутам дайсанд цохилт өгч, HP 0 болоход дараагийн (илүү хэцүү) давхар нээгдэнэ.

**Зорилтот хэрэглэгч:** үндсэндээ хүүхдүүд (сургалтын зорилготой) — гэхдээ **насанд хүрэгчдэд ч тохиромжтой, хэт "хүүхэлдэйн кино" биш**, цэвэрхэн adventure/RPG өнгө аястай байх ёстой (4-р хэсэг).

---

## 2. Одоогийн байдал (baseline)

- **Auth**: Supabase Auth (имэйл/нууц үг), session persist хийгддэг.
- **Өгөгдлийн загвар**: `categories(id, name, user_id)`, `quiz_items(id, category_id, user_id, quiz_question, question_image_url, correct_answer, answer_image_url)`. RLS идэвхтэй, owner-only.
- **UI урсгал**: Login/Register → Lobby (категори сонгох) → Quiz → Result → Lobby.
- **Дутагдаж буй зүйлс**: асуултад difficulty шошго байхгүй, давхрын materialize/unlock/cleared прогресс байхгүй, admin эрхийн систем байхгүй, HP/damage тооцоолол, animation, дуу чимээ огт байхгүй.

---

## 3. Гол ойлголт: Цамхаг ба Давхар

### 3.1 Давхар материалжуулах дүрэм (зөвхөн admin эрхтэй)

Систем **өмнө нь бэлдээгүй** цамхагт тоглох боломжгүй. Админ тухайн цамхагт зориулж "Давхар үүсгэх" (regenerate) үйлдэл дуудахад дараах алгоритмаар ажиллаж, үр дүнг DB-д **бичиж хадгална**:

1. Асуулт бүр `difficulty` шошготой: `easy` / `normal` / `hard`.
2. Түвшин доторх асуултуудыг (үүсгэсэн дарааллаар) **10 ширхэгээр** багцална (сүүлийн багц цөөн байж болно).
3. Эцсийн дараалал: **бүх easy давхрууд → бүх normal давхрууд → бүх hard давхрууд**. Нэг давхарт хоёр түвшин холилдохгүй.
4. Түвшинд асуулт огт байхгүй бол тэр түвшин алгасагдана.
5. Давхрын дайсны HP = давхрын асуултын тоо × 10.
6. **Энэ үйлдлийг зөвхөн `app_admins` хүснэгтэд бүртгэлтэй хэрэглэгч дуудах боломжтой** — ердийн категори эзэмшигч (агуулга үүсгэгч) шууд эрхгүй.
7. Категори эзэмшигч шинэ асуулт нэмэх/устгах/difficulty өөрчлөх үед **одоо байгаа давхрууд шууд өөрчлөгдөхгүй** — админ дахин "Давхар үүсгэх" хийх хүртэл хуучин давхар бүтэц хэвээр үлдэж, тоглогчдын прогресс тасалдахгүй.
8. Давхар regenerate хийх үеийн прогрессийн зохицуулалт — 10-р хэсэгт дэлгэрэнгүй.

### 3.2 Дайсан ба HP

- **Зөв хариулт** = дайсанд −10 HP.
- **Буруу хариулт** = дайсанд хохирол өгөхгүй, **тоглогчийн HP −1**.
- Тоглогч давхар бүрд тогтмол тооны HP-тэй (жиш. 3 зүрх) эхэлнэ — давхар бүрийн тулаан эхлэхэд дахин 100% сэргэнэ.

### 3.3 Ялах / Ялагдах, дараагийн давхар руу шилжих

- **Давхар ялагдсан** (дайсны HP 0): дараагийн давхар unlock болно.
- **Тоглогч ялагдсан** (тоглогчийн HP 0): **Lobby (Tower Select) руу шууд буцна**, давхар unlock болохгүй.
- **Давхарт дахин орох үед**: асуултын багц хэвээрээ (materialized тул тогтмол), гэхдээ харагдах дараалал **дахин random холилдоно**.

### 3.4 Sidebar-ийн агуулга (2 талдаа)

- **Зүүн sidebar**: тоглогчийн дүр, HP bar, одоогийн цамхаг/давхрын нэр-дугаар.
- **Баруун sidebar**: дайсны дүрс, HP bar, автомат нэршил.
- **Animation triggers**: зөв хариулт → довтолгоо + HP bar буурах + hit-flash + цохилтын дуу; буруу → hurt animation + алдсан дуу; дайсан устсан → victory animation + ялалтын дуу + unlock мэдэгдэл.

### 3.5 Дэлгэцийн урсгал

```
Login/Register
     │
     ▼
Tower Select (Lobby)  ── цамхаг бүрийг (категори) карт байдлаар,
     │                    "N/M давхар дийлсэн" прогресстой харуулна
     │  (цамхаг сонгох — materialize хийгдээгүй бол "бэлдэгдэж байна" гэж харуулна)
     ▼
Tower View  ── давхруудыг locked / current / cleared төлөвтэй харуулна
     │  (тоглох боломжтой давхар сонгох)
     ▼
Battle (Quiz)  ── HP bar-тай тулаан
     │
     ├─ Ялсан → Tower View руу буцна (дараагийн давхар unlock)
     └─ Ялагдсан → Tower Select (Lobby) руу буцна
```

- **Цамхгууд хоорондоо unlock хамааралгүй** — сурагч дурын сэдвээ чөлөөтэй сонгоно. Зөвхөн **нэг цамхгийн дотор** давхрууд дараалан unlock болно.

### 3.6 Шийдвэрлэсэн асуултууд

| # | Асуулт | Эцсийн шийдвэр |
|---|--------|----------------|
| 1 | Буруу хариулт өгвөл юу болох вэ? | Тоглогчийн HP буурна. |
| 2 | Тоглогч ялагдвал юу болох вэ? | Lobby руу буцна; дахин орох үед асуултын **дараалал** random холилдоно (багц materialized тул хэвээр). |
| 3 | Давхаруудын дараалал юугаар тодорхойлогдох вэ? | Difficulty шаталбараар (easy→normal→hard), **materialize хийгдсэн байдлаар хадгалагдана**. |
| 4 | Character/enemy зурган дүрс? | Эхэндээ placeholder (CSS/SVG). |
| 5 | Дуу чимээ шаардлагатай юу? | Тийм, заавал шаардлагатай (7-р хэсэг). |
| 6 | Категори бүр тусдаа цамхаг уу? | Тийм. |
| 7 *(шинэ)* | Давхар materialize хийх эрх хэнд байх вэ? | **Зөвхөн системийн админ** (`app_admins`). Категори эзэмшигч (агуулга үүсгэгч) шууд эрхгүй. |

---

## 4. Дизайн ба UI шаардлага

### 4.1 Өнгө аяс — "хүүхдэд ээлтэй, гэхдээ хүүхэлдэйн бус"
- Тохиромжтой чиглэл: цэвэрхэн adventure/RPG өнгө аяс (Duolingo/Khan Academy-с илүү "том хүүхэд/өсвөр насныхан" түвшний mobile RPG UI шиг).
- Зайлсхийх зүйлс: Comic Sans төрлийн фонт, хэт олон emoji, saturated бөөн өнгө холилдсон "хүүхдийн апп" clichés.

### 4.2 Layout бүтэц
```
┌─────────────────────────────────────────────────────────┐
│                      Header                                │
├───────────────┬─────────────────────────┬───────────────┤
│  ЗҮҮН SIDEBAR  │      ТӨВ КОНТЕНТ          │  БАРУУН SIDEBAR │
│  (Тоглогч, HP) │  Tower Select/View/Battle │  (Дайсан, HP)   │
└───────────────┴─────────────────────────┴───────────────┘
```
- Desktop: `grid-template-columns: 260px 1fr 260px`. Mobile: sidebar-ууд stack/drawer.

### 4.3 Design system (Phase 1)
- CSS variable theme, дахин ашиглах `<Button>`, `<Modal>`, `<ProgressBar>`, `<Card>`.
- `alert()/confirm()/prompt()`-ыг custom Modal-оор солих.

---

## 5. Агуулга үүсгэх урсгалын өөрчлөлт

`QuizCreator.jsx` / `QuestionManager.jsx`-д **difficulty сонгох талбар** (Хялбар / Дунд / Хэцүү) нэмэгдэнэ, анхдагч утга `normal`. Энэ бол зөвхөн **түүхий (draft) агуулга** — админ materialize хийх хүртэл тоглогдох давхарт орохгүй (3.1-ийн 7-р зүйл).

---

## 6. Өгөгдлийн загварын өөрчлөлт (Supabase)

### 6.1 `app_admins` — админ эрхийн жагсаалт
```sql
create table app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table app_admins enable row level security;
-- Шууд SELECT/INSERT-г хэрэглэгчдэд нээхгүй; зөвхөн security-definer
-- функцүүд дотроос шалгагдана (доор 6.4).

-- Эхний admin (танай өөрийн акаунт)-ыг гараар нэмнэ:
-- insert into app_admins (user_id) values ('<таны auth.users.id>');
```

### 6.2 `quiz_items`-д difficulty нэмэх
```sql
alter table quiz_items
  add column difficulty text not null default 'normal'
  check (difficulty in ('easy', 'normal', 'hard'));
```

### 6.3 `tower_floors` — materialized давхрууд
```sql
create table tower_floors (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id) on delete cascade,
  floor_index integer not null,       -- 0-ээс эхэлнэ
  difficulty text not null check (difficulty in ('easy','normal','hard')),
  question_ids uuid[] not null,       -- тухайн давхрын quiz_items.id жагсаалт
  enemy_hp integer not null,
  generated_at timestamptz not null default now(),
  unique (category_id, floor_index)
);
alter table tower_floors enable row level security;

-- Унших: категорийн эзэн (тоглогч) л уншиж болно
create policy "tower_floors_owner_select" on tower_floors
  for select using (
    exists (select 1 from categories c where c.id = tower_floors.category_id and c.user_id = auth.uid())
  );

-- Шууд бичих/устгахыг бүрэн хориглоно — зөвхөн 6.4-ийн admin функцээр дамжина
create policy "tower_floors_no_direct_write" on tower_floors
  for all to authenticated using (false) with check (false);
```

### 6.4 `regenerate_tower_floors()` — admin-only materialize функц
```sql
create or replace function regenerate_tower_floors(p_category_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  is_caller_admin boolean;
begin
  select exists(select 1 from app_admins where user_id = auth.uid())
    into is_caller_admin;

  if not is_caller_admin then
    raise exception 'Зөвхөн admin давхар materialize хийх эрхтэй';
  end if;

  delete from tower_floors where category_id = p_category_id;

  -- 3.1-ийн алгоритмын дагуу difficulty тус бүрээр 10-аар chunk хийж,
  -- tower_floors мөр бүрийг insert хийнэ (бодит PL/pgSQL хэрэгжилт Phase 2-т)
end;
$$;
```
- **v1 дуудах арга**: админ Supabase SQL Editor-оос `select regenerate_tower_floors('<category_id>');` гэж шууд дуудна (та одоо ч миграцийг ингэж ажиллуулж байгаа зарчимтай адил). Админ UI товч (Lobby/QuestionManager дотор "Давхар шинэчлэх" button) — Phase 5 эсвэл дараагийн сайжруулалт болгож үлдээж болно.

### 6.5 `tower_progress` — тоглогчийн прогресс
```sql
create table tower_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  category_id uuid references categories(id) on delete cascade,
  highest_cleared_floor integer not null default -1,
  updated_at timestamptz not null default now(),
  unique (user_id, category_id)
);
alter table tower_progress enable row level security;
create policy "tower_progress_owner_all" on tower_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```
Давхар `N` тоглох боломжтой ⇔ `N <= highest_cleared_floor + 1` **ба** `tower_floors`-д тухайн `(category_id, N)` бодитоор materialize хийгдсэн байх ёстой.

---

## 7. Дуу болон animation — техникийн шийдэл

- **Web Audio API-аар үүсгэсэн синтетик дуу** (цохилт, зөв хариулт, ялалт) — `OscillatorNode`-оор шууд үүснэ, гадаад файл/лиценз шаардлагагүй.
- Дараа шатанд жинхэнэ SFX файл руу шилжиж болно.
- **Mute товч заавал байна**.

---

## 8. Хэрэгжүүлэлтийн үе шат

| Үе шат | Агуулга | Гаралт |
|--------|---------|--------|
| **Phase 0** | BRD батлагдсан | Энэ баримт (v3) |
| **Phase 1** | 3 баганат grid, "хүүхдэд ээлтэй ч childish бус" theme, Button/Modal/ProgressBar, alert/confirm→Modal | Sidebar-той (placeholder) апп |
| **Phase 2** | `app_admins`, `quiz_items.difficulty` + сонгогч UI, `tower_floors` + `regenerate_tower_floors()`, `tower_progress` + бүх RLS | Admin давхар materialize хийх боломжтой |
| **Phase 3** | Tower Select/View дэлгэц (materialized floor-оос унших), HP/damage battle logic, win/lose/reshuffle дүрэм | Тоглох боломжтой battle mechanic |
| **Phase 4** | Sidebar animation + Web Audio SFX (заавал) | Визуал + дууны тулаан |
| **Phase 5** | Mobile responsive, accessibility, mute товч, (сонголттой) admin "Давхар шинэчлэх" UI товч | Дуусгасан v1 |

---

## 9. Хамрах хүрээнээс гадуур (v1)

- Олон тоглогчийн (multiplayer/PvP) горим.
- Дэлхийн leaderboard.
- Мөнгө/currency, in-app purchase.
- Custom sprite editor — URL-аар зураг оруулах одоогийн механизм хэвээр.
- Жинхэнэ гадны audio файл — эхэндээ synthesized SFX.
- **Regenerate хийсний дараа хуучин прогрессийг ухаалгаар шилжүүлэх (progress migration)** — v1: доор 10-т заасны дагуу зүгээр л дахин эхлүүлнэ.
- Admin materialize хийх UI товч — v1-д SQL-ээр гараар дуудна, UI товч дараа нэмнэ.

---

## 10. Хүлээн зөвшөөрсөн эрсдэл / дизайны шийдвэр

**Materialize хийгээгүй цамхаг:** Шинэ категори үүсгээд асуулт нэмэхэд, админ "Давхар үүсгэх" дуудах хүртэл тухайн цамхаг **тоглох боломжгүй**. Tower Select дэлгэцэд ийм цамхгийг "Бэлдэгдэж байна" гэсэн тодорхой төлөвтэй харуулах шаардлагатай (энэ бол UI шаардлага, Phase 3-т нэмэгдэнэ).

**Regenerate хийх үеийн прогрессийн дүрэм:** Админ тухайн цамхгийг дахин materialize хийхэд (жиш. агуулга ихээр өөрчлөгдсөний дараа), давхрын дугаарлалт өөр асуултын багцтай тохирч болзошгүй тул **v1-ийн энгийн дүрэм**: `regenerate_tower_floors()` дуудагдах бүрд тухайн категорийн **бүх хэрэглэгчийн `tower_progress` мөрийг `highest_cleared_floor = -1` болгож дахин тохируулна** — өөрөөр хэлбэл тухайн цамхгийг **дахин эхнээс дайлна**. Энэ нь хамгийн энгийн бөгөөд алдаа гарахгүй дүрэм (нарийн progress-migration логикийг дараагийн хувилбарт үлдээв, дээрх 9-р хэсэг).

---

## 11. Дараагийн алхам

Бүх гол шийдвэр эцэслэгдсэн тул **Phase 1**-ээс шууд эхлэх боломжтой.

**Эцсийн нэг зөвшөөрөл хэрэгтэй:** HP bar-ын тоон утга (тоглогч 3 зүрхтэй эхлэх, цохилт бүр −10 HP)-г эхний хувилбарт **тогтмол (hardcode)** байдлаар оруулах уу, эсвэл **категори/тохиргооноос өөрчлөх боломжтой** болгох уу? Тусгайлан хариулахгүй бол тогтмол утгаар Phase 1–3-ыг эхлүүлнэ.
