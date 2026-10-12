// Achievement каталог. `coin` талбар зөвхөн UI-д харуулах зорилготой —
// бодит coin олголт нь economy.sql-ийн award_points_for_achievement
// trigger дотор (сервер тал) тодорхойлогддог; хоёуланг зэрэг өөрчлөх ёстой.
export const ACHIEVEMENTS = [
    { id: 'first_floor', icon: '🏹', name: 'First Step', description: 'Cleared your first floor', coin: 15 },
    { id: 'flawless_floor', icon: '💯', name: 'Flawless Victory', description: 'Cleared a floor without a single wrong answer', coin: 20 },
    { id: 'duel_first_win', icon: '⚔️', name: 'Duel Winner', description: 'Won your first 1v1 duel', coin: 25 },
    { id: 'tower_complete', icon: '🗼', name: 'Tower Owner', description: 'Fully cleared a tower', coin: 30 },
    { id: 'leaderboard_top1', icon: '🏆', name: 'Top of the Board', description: 'Reached #1 on the leaderboard', coin: 30 },
    { id: 'streak_7', icon: '🔥', name: '7-Day Streak', description: 'Played and won 7 days in a row', coin: 25 },
    { id: 'duel_veteran', icon: '🗡️', name: 'Duel Veteran', description: 'Won 10 1v1 duels', coin: 35 },
    { id: 'coin_collector', icon: '🪙', name: 'Coin Collector', description: 'Accumulated 100 coins', coin: 20 },
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
