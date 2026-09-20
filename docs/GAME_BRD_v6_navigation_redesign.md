# Tower Climb — Навигацийн бүтцийн шинэчлэл BRD (v6, "App Shell")

**Огноо:** 2026-09-20
**Хамаарал:** [`GAME_BRD.md`](./GAME_BRD.md) (v3) → [`GAME_BRD_v4_hardening.md`](./GAME_BRD_v4_hardening.md) (v4) → [`GAME_BRD_v5_growth_features.md`](./GAME_BRD_v5_growth_features.md) (v5, growth feature-үүд) → **энэ баримт (v6)**
**Зорилго:** v5-ийн feature-үүд (Achievements, Leaderboard, Friends, Duel, Inventory/Shop, Classrooms гэх мэт) нэг нэгээр нэмэгдсээр ирсэн бөгөөд тэдгээрийг зохион байгуулах UI навигаци хоцорсон — "Цамхаг сонгох" дэлгэц ижил төстэй товчнуудын багана болж хувирсан. Энэ баримт нь тогтмол харагддаг **header + sidebar** бүхий "app shell" загварт шилжих шаардлагыг тодорхойлно.

---

## 0. Одоогийн байдлын аудит

### 0.1 Юу байгаа вэ (v5-ийн дараах)

| Дэлгэц | Хэрхэн нээгддэг | Асуудал |
|--------|------------------|---------|
| TowerSelect (цамхаг grid) | Үндсэн дэлгэц | — |
| Profile (hub) | TowerSelect → "👤 Профайл" товч | Зөв чиглэл рүү эхэлсэн алхам, гэхдээ өөрөө бас нэг "дэд цэс рүү орох — гараад буцах" давхарга нэмж байна |
| Achievements | Profile → tile | Бие даасан дэлгэц болсон (v6-ийн өмнөх ажил) |
| Leaderboard, Friends, DuelHistory, Inventory, Shop | Profile → tile | Профайл дотор овоорсон, ялгаагүй жагсаалт |
| Classrooms (teacher), Ангид нэгдэх (student) | Profile → tile (role-gated) | — |
| AdminDashboard | Profile → tile (isAdmin) | — |
| ManageContent (асуулт нэмэх/засах) | TowerSelect → "📝 Агуулга удирдах" товч | Бие даасан дэлгэц болсон (v6-ийн өмнөх ажил) |
| App header (`app-header`) | Бүх дэлгэц дээр тогтмол | Зөвхөн гарчиг + имэйл текст + дуу товч — навигаци огт алга |
| PlayerSidebar / EnemySidebar | Зөвхөн Battle дэлгэц дээр | Энэ бол тулааны дүрсний панел, навигацийн sidebar биш — ижил нэртэй ч өөр зорилготой |

### 0.2 Гол дүгнэлт

Одоогийн App.jsx нь **"нэг цэг рүү бүтэн дэлгэц солигдоно" (screen-swap)** загвартай — mobile апп-д тохиромжтой хэв маяг. Хэрэглэгч (та) харин **desktop web-app-ын "header + sidebar тогтмол, зөвхөн голын агуулга солигдоно"** загварыг хүсэж байна. Энэ бол зөвхөн UI polish биш — App.jsx-ийн навигацийн бүхэл бүтэн state загварыг ("аль view идэвхтэй вэ" гэдгээс "аль **section** идэвхтэй, section дотор аль **sub-view** идэвхтэй вэ") өөрчлөх шаардлагатай, том хэмжээний ажил.

---

## 1. Санал болгож буй мэдээллийн архитектур (IA)

### 1.1 Header (бүх дэлгэц дээр тогтмол)

```
┌─────────────────────────────────────────────────────────────┐
│  🗼 Tower Climb   🏗️Цамхаг  🛒Дэлгүүр  ⚔️Duel  👥Найзууд  🎓Сургалт   🪙123.4   (👤)  │
└─────────────────────────────────────────────────────────────┘
```

- **Зүүн тал:** лого/нэр.
- **Голд:** үндсэн section-үүдийн tab (доор 1.3-т жагсаав) — идэвхтэй section тодорхой highlight-тай.
- **Баруун тал:** coin balance pill (`🪙 123.4`) + **дугуй profile зураг** (баруун дээд буланд байнга).
  - Profile зурган дээр дарахад жижиг dropdown/panel нээгдэж: имэйл, role badge, coin balance, "Гарах" товч харуулна.
  - Хэрэглэгч профайл зураг оруулаагүй бол **placeholder зураг** (жишээ нь эхний үсэг бүхий дугуй icon) харагдана.
  - **Профайл засах (зураг оруулах/нэр солих) энэ BRD-ийн хамрах хүрээнд ОРОХГҮЙ** — доорх 4-р хэсэгт тусад нь feature task болгож тэмдэглэв.

### 1.2 Sidebar (зөвхөн desktop, зүүн талд тогтмол)

Идэвхтэй **section**-оос хамааран агуулга нь өөрчлөгдөнө (sub-navigation):

| Идэвхтэй section | Sidebar-т харагдах зүйлс |
|---|---|
| 🏗️ Цамхаг | Тэргүүлэгчид (Leaderboard), Агуулга удирдах |
| 🛒 Дэлгүүр | Дэлгүүр, Инвентар |
| ⚔️ Duel | Ирсэн урилгууд, Дуэлийн түүх |
| 👥 Найзууд | Найзын жагсаалт, Хүсэлтүүд, Хайх |
| 🎓 Сургалт | (Багш) Миний ангиуд / (Сурагч) Ангид нэгдэх |
| 🛠 Admin *(зөвхөн admin)* | Бүх цамхаг, Дэлгүүрийн эдлэл удирдах |

Голын агуулга (жишээ нь Цамхаг сонгосон үед — цамхагуудын grid) sidebar-т ороогүй, учир нь энэ бол "section-ийн үндсэн харагдац", sub-nav биш.

**Achievements** аль section-т харьяалагдахыг **шийдээгүй** — доорх 3-р хэсэгт нээлттэй асуулт болгов.

### 1.3 Mobile-д хэрхэн ажиллах вэ

- Header: лого + coin pill + profile icon л үлдэнэ (section tab-ууд багтахгүй тул нуугдана).
- Sidebar-ийн оронд **доод талд bottom nav** (icon bar): Цамхаг / Дэлгүүр / Duel / Найзууд / Сургалт (5 icon).
- Section сонгоход тухайн section-ийн sub-nav-ыг **тухайн дэлгэцийн дотор** (жишээ нь дээд талын жижиг tab мөр эсвэл жагсаалт) харуулна — sidebar шиг тусдаа баганагүй, учир нь дэлгэцийн өргөн хязгаарлагдмал.

---

## 2. App.jsx-ийн техникийн өөрчлөлт (тойм)

1. **Навигацийн state загвар өөрчлөгдөнө**: одоогийн ганц `view` string-ийн оронд `activeSection` (жиш: `'tower' | 'shop' | 'duel' | 'friends' | 'learning' | 'admin'`) + `activeSubView` (section доtorh аль дэлгэц идэвхтэй вэ) хос болно. `selectedCategory`/`selectedFloor`/`duelInvite` зэрэг drill-down state хэвээрээ үлдэнэ.
2. **Шинэ `AppShell` компонент** (эсвэл App.jsx дотор шинэ layout hierarchy): Header + (desktop: Sidebar) + голын content area + (mobile: BottomNav). Battle дэлгэц дээрх PlayerSidebar/EnemySidebar нь энэ шинэ sidebar-тай **зэрэгцэн** биш, харин Battle бол "chrome-гүй, бүтэн дэлгэцтэй тусгай горим" гэж тусгаарлаж болно (тулаан дундуур навигаци хийх шаардлагагүй тул header/sidebar нуугдсан ч зүгээр).
3. **Одоогийн бие даасан дэлгэцүүд** (Profile.jsx, Achievements.jsx, Leaderboard.jsx, Friends.jsx, DuelHistory.jsx, Inventory.jsx, Shop.jsx, TeacherDashboard.jsx, AdminDashboard.jsx, ManageContent.jsx) — эдгээрийн дотоод логик (өгөгдөл татах, RPC дуудах) **өөрчлөгдөхгүй**, зөвхөн тэдгээрийн "← Буцах" товч, гадна container-ийн хэмжээ/margin шинэ shell-тэй зохицохоор дасах хэрэгтэй.
4. **Profile.jsx (одоогийн hub component) хэрэггүй болно** — түүний tile-ууд sidebar/bottom-nav руу шилжинэ. Component-ийг устгаж эсвэл "Profile info panel" (header-ийн dropdown) болгож дахин ашиглаж болно.

Энэ бол зөвхөн CSS биш — **App.jsx-ийн бараг бүх routing логикийг дахин бичих** хэмжээний ажил (өмнөх Profile/ManageContent-ийг задалсан ажлаас том).

---

## 3. Нээлттэй асуултууд — ШИЙДВЭРЛЭГДСЭН (2026-09-20)

1. **🏆 Achievements хаана байрлах вэ?** → **Profile дотор** (Profile нь бие даасан tile-hub биш, харин avatar/нэр/coin/achievements-ийг нэг дор харуулдаг жинхэнэ "миний профайл" дэлгэц болно).
2. **⚔️ Duel section-ийн үндсэн харагдац юу вэ?** → **Одоогийнхоор нь үлдээнэ** (Duel tab дарахад шууд Дуэлийн түүх рүү орно; ангилал сонгох урсгал өөрчлөгдөхгүй — цамхаг/дуэл эхлүүлэх нь өмнөх шигээ TowerView-ийн "⚔️ 1v1" товч, эсвэл Friends-ээс урих замаар). Duel-ийн дотоод урсгалыг дараа нь тусад нь янзална.
3. **Найзууд section дотор Duel урих боломж хэвээр байх уу?** → **Тийм, хэвээр нь үлдэнэ** (Friends.jsx доторх "⚔️ Урих" урсгал өөрчлөгдөөгүй). Нэмээд, Duel section-ийн sidebar-т **"👥 Найзаа урих"** гэсэн cross-link нэмэгдэж, Найзууд руу шууд шилждэг боллоо.
4. **Profile-ийг хэрхэн нээх вэ?** → **Dropdown биш**, avatar дээр дархад **бие даасан Profile дэлгэц рүү шилждэг** (`setView('PROFILE')`).
5. **Admin tab хэн бүхэнд харагдах вэ?** → **Зөвхөн admin эрхтэй хэрэглэгчид** header-т нэмэлт tab-аар харагдана (`isAdmin` App.jsx түвшинд lift хийгдсэн).

---

## 4. Профайл засах (Edit Profile) — ХАМРАХ ХҮРЭЭНД ОРСОН (шийдвэр өөрчлөгдсөн)

Анхны төлөвлөгөөнд энэ v7 (ирээдүйн ажил) байсан ч, хэрэглэгчийн шийдвэрээр **v6-д багтаж, хэрэгжсэн**:

- **Зураг**: URL оруулах биш, **жинхэнэ файл (jpg/png) шууд upload хийдэг** болсон — Supabase Storage-ийн `avatars` bucket (public read, эзэмшигч л өөрийн `<user_id>/...` замд бичиж/устгаж болно).
- **`user_profiles`**-д `display_name`, `avatar_url` багана нэмэгдсэн.
- Client талаас `role`/`equipped_item_id`-д хүрэхгүй, зөвхөн эдгээр 2 баганыг л шинэчилдэг `update_my_profile(display_name, avatar_url)` SECURITY DEFINER RPC-ээр хамгаалагдсан (`user_profiles`-д ерөнхий UPDATE policy санаатайгаар алга).
- UI: Profile дэлгэц дээр дугуй зурган товч (дарахад файл сонгох цонх нээгдэнэ), зурагтай бол харуулна, байхгүй бол эхний үсэг бүхий placeholder.
- Header-ийн баруун дээд буланд ижил avatar (эсвэл placeholder) байнга харагдана — дарахад Profile руу шилждэг.

---

## 5. Хэрэгжүүлэлтийн эрэмбэ — ГҮЙЦЭТГЭСЭН

1. ✅ SQL: `profile_avatar.sql` (Storage bucket, RLS, `update_my_profile` RPC).
2. ✅ App.jsx: navigation-ийг `view` string дээр суурилсан хэвээр үлдээж (activeSection/activeSubView бүрэн rewrite хийхгүйгээр), `viewToNavSection(view)` helper-ээр header tab/sidebar идэвхжилтийг тооцоолсон — цар хүрээг багасгасан practical шийдэл.
3. ✅ Header: "🗼 Tower Climb" лого дарахад шууд Цамхаг руу шилждэг (тусдаа "Цамхаг" tab байхгүй — та зөв анзаарсанчлан хоёр нэр ижил зүйл байсан тул нэгтгэсэн), Дэлгүүр/Duel/Найзууд/Сургалт tab, isAdmin бол Admin tab, coin pill, avatar товч.
4. ✅ `NavSidebar.jsx` (шинэ, tulааны Sidebar-аас ялгаатай) — desktop дээр л (≥900px) харагдана, section тус бүрийн sub-nav-ыг харуулна.
5. ✅ Profile.jsx бүрэн дахин бичигдэж, avatar upload + display name + achievements grid + coin + Гарах товч нэгтгэсэн.
6. ✅ Learning.jsx (шинэ) — role-based: багш бол TeacherDashboard, сурагч бол "Ангид нэгдэх" маягт.
7. ⬜ Mobile bottom-nav — **энэ ажилд ороогүй**, одоогоор NavSidebar зөвхөн desktop дээр харагдана, mobile дээр sub-nav алга (зөвхөн үндсэн header tab-ууд ажиллана). Дараагийн ажил болгож үлдээв.
8. ⬜ Browser дээрх visual тест — Chrome extension холбогдоогүй тул хийгдээгүй, зөвхөн build/lint/test-ээр баталгаажсан.

---

## 6. Дараагийн (v7) авч үзэх зүйлс

- Mobile-д зориулсан bottom navigation bar (одоогоор зөвхөн header tab-ууд ажиллана, sidebar-ийн sub-nav mobile дээр алга).
- Duel-ийн дотоод урсгалыг (шинэ дуэл шууд эхлүүлэх энтри цэг) сайжруулах.
- Хуучин avatar файлыг Storage-оос устгах цэвэрлэгээ (одоогоор upload болгонд шинэ файл үүсгээд хуучинг нь орхидог, зай эзэлдэг эрсдэлтэй).
