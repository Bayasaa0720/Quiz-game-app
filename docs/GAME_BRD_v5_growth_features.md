# Tower Climb — Өсөлт ба хэрэглэгчийн идэвхжилтийн BRD (v5, "Growth & Reach")

**Огноо:** 2026-09-19
**Хамаарал:** [`GAME_BRD.md`](./GAME_BRD.md) (v3, функциональ суурь) → [`GAME_BRD_v4_hardening.md`](./GAME_BRD_v4_hardening.md) (v4, найдвартай байдал) → **энэ баримт (v5)**
**Зорилго:** v3–v4-ийн ажил дууссаны дараа, тоглоомыг **илүү олон хэрэглэгчид хүрч, тэднийг удаан хугацаанд идэвхтэй байлгах** том хэмжээний feature-үүдийг төлөвлөх. Энэ бол жижиг засвар биш — тус бүр өөрийн gaран схем, DB өөрчлөлт, олон Phase шаардсан ажил.

---

## 0. Feature-үүдийн эрэмбэ ба төлөв

| # | Feature | Төлөв | Тэргүүлэх зэрэглэл |
|---|---------|-------|---------------------|
| 1 | Дүрийн customization + Points/Currency систем | Судалгаа хийгдсэн, зөвшөөрөгдсөн | Дунд |
| 2 | Achievement/Badge систем | Зөвшөөрөгдсөн | Дунд |
| 3 | Категори тус бүрийн leaderboard | Зөвшөөрөгдсөн | Өндөр (хямд, хурдан) |
| 4 | Friend/Social sharing | Дэлгэрэнгүй тайлбар хэрэгтэй — ЭЦСИЙН ШИЙДВЭР ГАРААГҮЙ | ? |
| 5 | Bulk import (CSV/Excel) | Зөвшөөрөгдсөн, архитектур эхлээд | Дунд |
| 6 | Public tower gallery | Зөвшөөрөгдсөн | Дунд |
| 7 | **Багш/эцэг эхийн dashboard** | Хамгийн их сонирхол татсан — flagship feature | **Хамгийн өндөр** |
| 8 | PWA "Install app" урилга | Зөвшөөрөгдсөн | Өндөр (хямд, хурдан) |

---

## 1. Дүрийн customization + Points/Currency систем

### 1.1 Судалгааны үр дүн — asset эх сурвалж

Одоогийн `soldier`/`orc`/`demon`/`bloodmonster` sprite-ууд нь **Zerie** (itch.io) хэмээх зохиогчийн **"Tiny RPG Character Asset Pack"** цувралаас (01 ба 02) авагдсан:

- [Tiny RPG Character Asset Pack 01](https://zerie.itch.io/tiny-rpg-character-asset-pack) — **үнэгүй хувилбар**: Soldier, Orc (2 дүр). **Бүрэн хувилбар ($2.50+, name-your-own-price)**: 22 дүр — үүнд **Knight, Knight Templar, Swordsman, Armored Axeman, Wizard, Priest, Archer, Lancer** зэрэг тоглогчид тохиромжтой дүрүүд багтдаг.
- [Tiny RPG Character Asset Pack 02](https://zerie.itch.io/tiny-rpg-character-asset-pack-02) — **үнэгүй хувилбар**: Demon_A, Blood-Monster_A (2 дүр, одоо ашиглагдаж байгаа). **Бүрэн хувилбар ($2.50+)**: 20 дүр — Black-Knight, Minotaur, Warlock, Hellhound зэрэг (ирээдүйн дайсны sprite-д тохиромжтой).

**Лиценз (хоёулаа адилхан):** Хувийн болон **арилжааны тоглоомд ашиглахыг зөвшөөрдөг**, засварлах боломжтой, эх сурвалж (credit) заавал биш. Дахин тараах/зарах хориотой.

**Дүгнэлт:** Огт **үнэгүй биш**, гэхдээ **ойролцоогоор $5 (2 pack × $2.50)** нэг удаагийн зардлаар, одоо ашиглаж буй sprite-тай **яг ижил урлагийн хэв маягтай** 40+ дүр/дайсан нэмж авах боломжтой. Энэ бол хамгийн зардал багатай, хэв маягийн уялдаа хамгийн сайтай шийдэл — өөр эх сурвалжаас (жишээ нь Kenney.nl-ийн бүрэн үнэгүй CC0 packs) авбал урлагийн хэв маяг таарахгүй, sprite-ийн хэмжээ/animation frame тоо тохируулах нэмэлт ажил шаардана.

**Санал болгож буй алхам:** Zerie-ийн хоёр full pack-ийг худалдан авах ($5), дараа нь Player character-т 4-6 сонголт (Knight, Wizard, Archer, Priest гэх мэт) нэмнэ.

### 1.2 Points/Currency систем (Streak-тэй хослуулсан)

Таны саналын дагуу: streak зүгээр харуулаад зогсохгүй, **цуглуулж болох, зарцуулж болох оноо** байх ёстой.

**Оноо цуглуулах дүрэм (санал):**
| Үйлдэл | Оноо |
|--------|------|
| Давхар анх удаа дийлэх | +10 |
| Өдөрт анх удаа нэвтрэх (daily login) | +5 |
| 3 өдрийн дараалсан streak | +15 (нэмэлт бонус) |
| 7 өдрийн дараалсан streak | +50 (нэмэлт бонус) |
| Achievement нээгдэх үед (доор 2-р хэсэг үзнэ үү) | Achievement тус бүрээр өөр |

**Оноо зарцуулах зүйлс (unlock):**
- Дүрийн харагдах байдал (character skin) — жишээ нь Knight 100 оноо, Wizard 150 оноо гэх мэт.
- (Ирээдүйд) enemy sprite-ийн "cosmetic filter" эсвэл profile badge frame.

### 1.3 Өгөгдлийн загварын өөрчлөлт

```sql
-- Хэрэглэгчийн оноо, streak
create table user_progress_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  points integer not null default 0,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_active_date date,
  updated_at timestamptz not null default now()
);

-- Unlock хийж болох дүрүүдийн каталог
create table character_skins (
  id text primary key,          -- жиш: 'knight', 'wizard'
  display_name text not null,
  cost_points integer not null,
  sprite_folder text not null
);

-- Хэрэглэгч тус бүрийн unlock хийсэн дүрүүд
create table user_unlocked_skins (
  user_id uuid references auth.users(id) on delete cascade,
  skin_id text references character_skins(id),
  unlocked_at timestamptz not null default now(),
  primary key (user_id, skin_id)
);
```

**Нээлттэй асуулт:** Оноог хэн бодит цагт тооцох вэ — клиент (`Battle.jsx`) шууд DB руу бичих үү (одоогийн `tower_progress` upsert-тэй адил загвар), эсвэл server-side function ашиглах уу (fraud-аас сэргийлэх)? v1-д клиент-талын упдейт хангалттай (одоогийн `tower_progress` арга барилтай нийцнэ), гэхдээ хожим "point farming" эрсдэлтэй тул анхаарах ёстой.

---

## 2. Achievement/Badge систем

### 2.1 Санал болгож буй эхний badge-үүд

| Badge | Нөхцөл |
|-------|--------|
| 🏹 Анхны алхам | Анхны давхар дийлсэн |
| 🗼 Цамхаг эзэн | Нэг цамхгийг бүрэн дийлсэн (бүх давхар) |
| 🔥 3 өдрийн галт зориг | 3 өдрийн дараалсан streak |
| 🔥🔥 7 өдрийн галт зориг | 7 өдрийн дараалсан streak |
| 🎯 Мундаг мэргэжилтэн | Нэг категорид 100% (алдаагүй) 5 давхар дийлсэн |
| 🏆 Тэргүүлэгч | Leaderboard-т 1-р байранд орсон |

### 2.2 Өгөгдлийн загвар

```sql
create table user_achievements (
  user_id uuid references auth.users(id) on delete cascade,
  achievement_id text not null,
  earned_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);
```

Хэрэглэгчийн профайл/Tower Select дэлгэц дээр badge-үүдийг эгнээгээр харуулна.

---

## 3. Категори тус бүрийн leaderboard

Одоогийн `get_leaderboard()` RPC зөвхөн **нийт дийлсэн давхрын тоо**-гоор эрэмбэлдэг (бүх категори нийлүүлсэн). Үүнийг өргөтгөж:

```sql
create or replace function get_leaderboard(p_category_id uuid default null, p_limit int default 20)
returns table (rank int, user_id uuid, display_name text, total_floors_cleared int)
...
-- p_category_id NULL бол одоогийн (нийт) хэвээр, ирвэл тухайн категорид хязгаарлана
```

**UI**: Leaderboard дэлгэц дээр category-сонгох dropdown нэмнэ (эсвэл tab): "Нийт" / "cs2 map knowledge" / "cs2 players" гэх мэт.

Энэ бол хамгийн бага ажил шаардсан, хамгийн хурдан хэрэгжих feature — одоо байгаа RPC-ийг өргөтгөх төдий.

---

## 4. Friend/Social sharing — дэлгэрэнгүй тайлбар

Энэ feature-ийг та "дэлгэрэнгүй тайлбарла" гэсэн тул, эцсийн шийдвэр гаргахаас өмнө **3 өөр түвшний хэрэгжилт**-ийг харьцуулъя (хөнгөнөөс хүндэд):

### Сонголт A: "Score card" зураг хуваалцах (хамгийн хөнгөн)
- Тоглогч давхар дийлэх/цамхаг дуусгах үед "Хуваалцах" товч дарахад, HTML canvas-аар үр дүнгийн зураг (score, badge, character) үүсгэж, **татаж авах эсвэл copy-link** хийнэ (жиш. Twitter/Facebook/Telegram руу шууд илгээх боломжгүй ч, зураг хадгалж бусад апп-аар илгээж болно).
- **Давуу тал**: Multiplayer/friend-list дэд бүтэц огт хэрэггүй, зөвхөн frontend ажил. Хамгийн хурдан хэрэгжинэ (~1 Phase).
- **Сул тал**: Жинхэнэ "найзууд" гэсэн систем биш — зөвхөн нэг талын broadcast.

### Сонголт B: Найзын жагсаалт + харьцуулах (дунд зэрэг)
- Хэрэглэгчид бие биенээ "найз" болгож нэмэх (username/имэйлээр хайх), тэдний leaderboard-ийн байр/дийлсэн цамхгийг харьцуулсан жижиг widget харуулна.
- **DB**: `friendships(user_id, friend_user_id, status)` хүснэгт, RLS-тэй (зөвхөн хоёр тал харилцан зөвшөөрсөн харилцаа харагдана).
- **Давуу тал**: Жинхэнэ "найзтайгаа өрсөлдөх" мэдрэмж өгнө, Phase 3-т (leaderboard) шууд нэгтгэгдэнэ.
- **Сул тал**: Friend request/accept/reject UI урсгал бүтэн зохион байгуулах шаардлагатай (~2-3 Phase). Тоглогчийн бааз жижиг үед (одоогийн 2-3 хэрэглэгч шиг) хэрэгцээ бага байж болно.

### Сонголт C: Бодит цагийн 1v1 multiplayer (хамгийн хүнд)
- Анхны BRD (v3, 9-р хэсэг)-д **тодорхой "хамрах хүрээнээс гадуур"** гэж бичигдсэн. Websocket/realtime backend, matchmaking, sync logic шаардана — энэ бол өөр тусдаа, том төслийн хэмжээний ажил.
- **Санал**: v5-д оруулахгүй, хожмын (v6+) тусдаа BRD болгож үлдээе.

**Миний зөвлөмж**: **Сонголт A**-аас эхэлж (хямд, хурдан, эрсдэлгүй), хэрэглэгчийн тоо нэмэгдэж, эрэлт харагдвал **Сонголт B** руу шилжих. Сонголт C-г одоохондоо хойшлуулъя.

**Танаас тодруулах:** Аль сонголтоор явахыг эцсийн байдлаар шийднэ үү?

---

## 5. Bulk import (CSV/Excel) — архитектур

Таны хүссэнчлэн эхлээд урсгалын зургийг гаргая:

```
┌──────────────┐     ┌──────────────┐     ┌───────────────────┐     ┌──────────────┐
│ 1. Файл       │────▶│ 2. Parse     │────▶│ 3. Урьдчилан харах  │────▶│ 4. Баталгаа- │
│    сонгох     │     │    (client-  │     │    + Validate      │     │    жуулаад    │
│  (.csv/.xlsx) │     │    side JS)  │     │    (алдаатай мөр    │     │    DB руу     │
│              │     │              │     │    улаанаар харуулна)│     │    bulk insert│
└──────────────┘     └──────────────┘     └───────────────────┘     └──────────────┘
```

### 5.1 Алхам бүрийн дэлгэрэнгүй

1. **Файл сонгох**: `QuestionManager.jsx` дотор "CSV/Excel-с оруулах" товч → file input. Загвар (template) татах боломж — "Асуулт, Хариулт, Хариултын_төрөл, Хэцүү_зэрэг" баганатай жишээ .csv файл.
2. **Parse**: CSV бол `papaparse` (жижиг, найдвартай сан), Excel (.xlsx) бол `xlsx`/`sheetjs` сан ашиглана — хоёулаа client-side (browser дотор), сервер шаардлагагүй.
3. **Урьдчилан харах + Validate**: Parse хийсэн мөр бүрийг хүснэгт хэлбэрээр харуулж, дараах шалгалт хийнэ:
   - Асуулт/хариулт хоосон эсэх
   - `answer_type` datalist-тэй нийцэж байгаа эсэх (эсвэл шинэ төрөл гэж зөвшөөрөх)
   - `difficulty` зөвшөөрөгдсөн утга (easy/normal/hard) эсэх
   - Алдаатай мөрийг улаанаар тэмдэглэж, тоолж харуулна ("48 мөрөөс 45 зөв, 3 алдаатай").
4. **Баталгаажуулаад импорт хийх**: Зөв мөрүүдийг `supabase.from('quiz_items').insert([...])` batch хэлбэрээр нэг дор илгээнэ (Supabase batch insert дэмждэг). Импортын дараа "Х асуулт амжилттай нэмэгдлээ" мэдэгдэл + шинээр нэмэгдсэн асуултууд `answer_type`-гүй бол автоматаар анхаарах ёстойг сануулна.

### 5.2 Нээлттэй асуултууд
- Импортын дараа `tower_floors`-ийг автоматаар regenerate хийх үү, эсвэл admin гараар дараа нь хийх үү (одоогийн зарчимтай нийцүүлбэл: **гараар**, учир нь contents өөрчлөгдөхөд одоо байгаа floor тогтмол хэвээр үлдэх ёстой гэсэн зарчим v3 BRD-д аль хэдийн тогтоогдсон).
- Дахин давхцсан (identical) асуулт орж ирвэл яах вэ — алгасах уу, зөвшөөрөх үү?

---

## 6. Public tower gallery / Browse

Одоогийн `is_global` flag зөвхөн admin-ий гараар (SQL-ээр) тохируулагддаг цөөхөн категори л "нийтэд" харагддаг. Үүнийг өргөжүүлж:

- **Browse дэлгэц**: Бүх `is_global = true` (эсвэл шинэ `is_public` санал болгосон flag) категориудыг картаар харуулж, **сэдвээр хайх/шүүх** боломж (жиш. "spor", "хэл сурах", "шинжлэх ухаан" tag-ууд).
- **Категори эзэмшигч өөрөө "нийтэд нээх" сонголт хийх боломж** — одоогийн зөвхөн admin эрхтэй хязгаарлалтыг зөөлрүүлж, category owner "Нийтэд нээх" товч дарахад **admin review хүлээх** (шууд бус, зохисгүй агуулгаас сэргийлэх) урсгал нэмэх санал.
- **DB**: `categories`-д `is_public_requested boolean`, `is_public_approved_by uuid` баганууд нэмэх.

---

## 7. Багш/Эцэг эхийн Dashboard 🌟 (Flagship feature)

Таны хамгийн их сонирхсон feature тул хамгийн дэлгэрэнгүй судаллаа.

### 7.1 Асуудлын томъёолол

Одоогийн систем нь **тоглогч өөрөө** өөрийн явцыг л хардаг. Багш/эцэг эх ямар нэг **олон сурагчийн явцыг нэг дороос харах, сул талыг олж, чиглүүлэх** боломж огт байхгүй. Гэтэл энэ бол яг **BRD v3-ийн "зорилтот хэрэглэгч: хүүхдүүд, сургалтын зорилготой"** гэсэн зорилгыг бүрэн дүүргэх шаардлагатай хэсэг — сургалтын үнэ цэнийг хэмжих, харах боломжгүй бол багш нар үнэхээр хэрэглэхгүй.

### 7.2 Хэрэглэгчийн эрхийн загвар (шинэ)

Одоогийн `app_admins` (систем даяарх admin) загвараас ялгаатай, **"класс/бүлэг" түвшний** эрх хэрэгтэй:

```sql
-- Багш (эсвэл эцэг эх) үүсгэсэн "анги"
create table classrooms (
  id uuid primary key default gen_random_uuid(),
  teacher_user_id uuid references auth.users(id) on delete cascade,
  name text not null,           -- жиш: "5-р анги, Математик"
  invite_code text unique not null,  -- сурагчид нэгдэхэд ашиглах код
  created_at timestamptz not null default now()
);

-- Сурагч (тоглогч) аль классд харьяалагддаг
create table classroom_members (
  classroom_id uuid references classrooms(id) on delete cascade,
  student_user_id uuid references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (classroom_id, student_user_id)
);
```

**Урсгал:**
1. Багш "Анги үүсгэх" дарж, `invite_code` (жиш. "MATH5A-7X2K") автоматаар үүснэ.
2. Сурагчид тухайн кодыг оруулж классд нэгддэг (Tower Select дэлгэц дээрх шинэ "Ангид нэгдэх" товч/талбар).
3. Багш өөрийн Dashboard-с **зөвхөн өөрийн classroom-той сурагчдын** явцыг л харна (RLS-ээр хамгаалагдана — `exists (select 1 from classroom_members cm join classrooms c on c.id=cm.classroom_id where c.teacher_user_id = auth.uid() and cm.student_user_id = target_user_id)`).

### 7.3 Dashboard-т харуулах мэдээлэл

| Хэсэг | Дэлгэрэнгүй |
|-------|-------------|
| **Ангийн ерөнхий тойм** | Хэдэн сурагч идэвхтэй (сүүлийн 7 хоногт нэвтэрсэн), дундаж дийлсэн давхар |
| **Сурагч тус бүрийн карт** | Нэр, сүүлд нэвтэрсэн огноо, дийлсэн цамхаг/давхрын тоо, streak |
| **Сул тал илрүүлэх** | Категори тус бүрээр алдааны хувь (жиш. "cs2 map knowledge: 65% зөв, cs2 players: 40% зөв" → аль сэдэвт дэмжлэг хэрэгтэйг тод харуулна) |
| **Цаг хугацааны график** | 7/30 хоногийн турш өдөр бүрийн идэвх (давхар дийлсэн тоо) — сурагч тогтмол дадлага хийж байгаа эсэхийг харуулна |
| **Экспорт** | CSV татах боломж (сургуулийн бусад системд оруулах/тайлагнахад хэрэг болно) |

### 7.4 Өгөгдлийн бүрдэл — шинэ tracking шаардлагатай

Одоогийн `tower_progress` зөвхөн **хамгийн сүүлийн highest_cleared_floor**-ийг хадгалдаг тул **түүхэн (цаг хугацааны) мэдээлэл** алга. Dashboard-т цаг хугацааны график хийхийн тулд:

```sql
create table battle_attempts_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  category_id uuid references categories(id) on delete cascade,
  floor_index integer not null,
  outcome text not null check (outcome in ('won','lost')),
  correct_count integer not null,
  wrong_count integer not null,
  played_at timestamptz not null default now()
);
```

`Battle.jsx`-ийн `handleNext`-ийн win/lose салбарт нэг мөр insert хийхэд л хангалттай — одоогийн `tower_progress` upsert-тэй зэрэгцүүлж бичнэ. Энэ хүснэгт нь зөвхөн "log" тул RLS-ээр зөвхөн тухайн хэрэглэгч болон түүний багш(нар) л уншиж болно.

### 7.5 Хэрэгжүүлэх Phase-үүд (санал)

| Phase | Агуулга |
|-------|---------|
| **7-A** | `classrooms`/`classroom_members` схем + RLS, "Анги үүсгэх"/"Ангид нэгдэх" UI |
| **7-B** | `battle_attempts_log` бичих логик (Battle.jsx-д нэг мөр нэмэх), сурагч тус бүрийн үндсэн карт |
| **7-C** | Сул тал илрүүлэх (категори тус бүрийн алдааны хувь) + цаг хугацааны график |
| **7-D** | CSV экспорт, polish |

### 7.6 Нээлттэй асуултууд
- Нэг сурагч **олон ангид** харьяалагдаж болох уу (жиш. эцэг эх + багш хоёулаа хардаг)? — санал: тийм, `classroom_members` нь many-to-many тул аль хэдийн дэмждэг.
- Багш classroom_members-ээс сурагч хасах/устгах эрхтэй байх ёстой юу?
- Эцэг эх өөрийн classroom үүсгэж, зөвхөн 1 хүүхдээ дагах боломжтой юу (жижиг хувилбар)?

---

## 8. PWA "Install app" урилга

Одоогийн `manifest.webmanifest` бэлэн байгаа тул зөвхөн proactive urilga л дутуу:

- `beforeinstallprompt` browser event-ийг барьж, App.jsx (эсвэл тусдаа жижиг banner component)-д "Гар утсандаа суулгах уу?" гэсэн banner харуулна (эхний удаа тоглосны дараа, эсвэл 2 дахь удаа нэвтрэх үед).
- Хэрэглэгч "Тийм" дарвал `prompt.prompt()` дуудаж native install dialog харуулна.
- localStorage-д "banner-г нэг удаа хаасан бол дахин үзүүлэхгүй" гэсэн тэмдэглэгээ хийнэ (10 хоногт нэг удаа дахин санал болгож болно).

Энэ бол хамгийн бага ажил шаардсан item — ойролцоогоор 1 файл (~50-80 мөр код).

---

## 9. Хэрэгжүүлэлтийн ерөнхий дараалал (санал)

| Phase | Feature | Учир |
|-------|---------|------|
| **10** | PWA install banner (8) + Категори leaderboard (3) | Хамгийн хямд, хурдан, шууд үнэ цэнэтэй |
| **11** | Achievement систем (2) + Points/Streak (1.2-1.3, дүр customization-гүйгээр) | Тоглогчийн idэвхжилтийг нэмэгдүүлэх суурь |
| **12** | Дүрийн customization (1.1) — asset худалдаж авах, unlock UI холбох | Point систем бэлэн болсны дараа утга учиртай болно |
| **13** | Bulk import (5) | Контент үүсгэгчдэд зориулсан хэрэгсэл |
| **14** | Public tower gallery (6) | Контент нээлттэй болгох |
| **15-18** | **Багш/эцэг эхийн Dashboard** (7-A → 7-D) | Хамгийн том, хамгийн үнэ цэнэтэй — тусдаа олон Phase |
| **?** | Friend/Social sharing (4) | Сонголт (A/B/C) шийдэгдсэний дараа тодорхойлно |

---

## 10. Ерөнхий нээлттэй асуултууд

1. Points/Currency систем — клиент шууд бичих үү, эсвэл server-side (fraud-аас хамгаалах) уу?
2. Friend/Social sharing — Сонголт A (score card), B (найзын жагсаалт), эсвэл A→B алгуур гэдгийг баталгаажуулах.
3. Zerie-ийн asset pack-уудыг ($5) худалдаж авахыг зөвшөөрөх үү?
4. Багш dashboard-ын эрхийн загвар (classroom-based) таны хүлээж буй загвартай тохирч байна уу, эсвэл өөр (жиш. энгийн "share link" загвар) хүсэж байна уу?
