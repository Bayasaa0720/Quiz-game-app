// Achievement каталог. `coin` талбар зөвхөн UI-д харуулах зорилготой —
// бодит coin олголт нь economy.sql-ийн award_points_for_achievement
// trigger дотор (сервер тал) тодорхойлогддог; хоёуланг зэрэг өөрчлөх ёстой.
export const ACHIEVEMENTS = [
    { id: 'first_floor', icon: '🏹', name: 'Анхны алхам', description: 'Анхны давхараа дийлсэн', coin: 15 },
    { id: 'flawless_floor', icon: '💯', name: 'Цэвэр ялалт', description: 'Ямар ч буруу хариулгүйгээр давхар дийлсэн', coin: 20 },
    { id: 'duel_first_win', icon: '⚔️', name: 'Дуэлийн ялагч', description: '1v1 өрсөлдөөнд анх удаа ялсан', coin: 25 },
    { id: 'tower_complete', icon: '🗼', name: 'Цамхаг эзэн', description: 'Нэг цамхгийг бүрэн дийлсэн', coin: 30 },
    { id: 'leaderboard_top1', icon: '🏆', name: 'Тэргүүлэгч', description: 'Leaderboard-т 1-р байранд орсон', coin: 30 },
    { id: 'streak_7', icon: '🔥', name: '7 хоногийн улиран', description: '7 хоног дараалан ялалттайгаар тоглосон', coin: 25 },
    { id: 'duel_veteran', icon: '🗡️', name: 'Дуэлийн ахмад', description: '1v1 өрсөлдөөнд 10 удаа яллаа', coin: 35 },
    { id: 'coin_collector', icon: '🪙', name: 'Зоос цуглуулагч', description: '100 coin хуримтлуулсан', coin: 20 },
];

// Буцаах утга: анх удаа шинээр авсан бол true (toast мэдэгдэл харуулахад ашиглана),
// аль хэдийн байсан (эсвэл нөхцөл хангаагүй/алдаа гарсан) бол false.
//
// claim_achievement() RPC (achievements.sql) серверийн жинхэнэ өгөгдлөөс
// (tower_progress/battle_attempts_log/duels/leaderboard) achievement-ийг
// бодитоор хангасан эсэхийг шалгаад л бичдэг — client-ийн "надад энэ
// achievement өгөөч" гэсэн мэдэгдлийг үнэн гэж шууд итгэдэггүй.
export async function awardAchievement(supabase, userId, achievementId) {
    if (!userId) return false;
    try {
        const { data, error } = await supabase.rpc('claim_achievement', { p_achievement_id: achievementId });
        if (error) throw error;
        return data === true;
    } catch (err) {
        console.error('Failed to award achievement', achievementId, err);
        return false;
    }
}
