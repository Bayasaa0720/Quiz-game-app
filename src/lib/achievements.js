// Achievement каталог. `coin` талбар зөвхөн UI-д харуулах зорилготой —
// бодит coin олголт нь economy.sql-ийн award_points_for_achievement
// trigger дотор (сервер тал) тодорхойлогддог; хоёуланг зэрэг өөрчлөх ёстой.
export const ACHIEVEMENTS = [
    { id: 'first_floor', icon: '🏹', name: 'Анхны алхам', description: 'Анхны давхараа дийлсэн', coin: 15 },
    { id: 'flawless_floor', icon: '💯', name: 'Цэвэр ялалт', description: 'Ямар ч буруу хариулгүйгээр давхар дийлсэн', coin: 20 },
    { id: 'duel_first_win', icon: '⚔️', name: 'Дуэлийн ялагч', description: '1v1 өрсөлдөөнд анх удаа ялсан', coin: 25 },
    { id: 'tower_complete', icon: '🗼', name: 'Цамхаг эзэн', description: 'Нэг цамхгийг бүрэн дийлсэн', coin: 30 },
    { id: 'leaderboard_top1', icon: '🏆', name: 'Тэргүүлэгч', description: 'Leaderboard-т 1-р байранд орсон', coin: 30 },
];

// Буцаах утга: анх удаа шинээр авсан бол true (toast мэдэгдэл харуулахад ашиглана),
// аль хэдийн байсан (эсвэл алдаа гарсан) бол false.
export async function awardAchievement(supabase, userId, achievementId) {
    if (!userId) return false;
    try {
        const { data, error } = await supabase
            .from('user_achievements')
            .upsert(
                { user_id: userId, achievement_id: achievementId },
                { onConflict: 'user_id,achievement_id', ignoreDuplicates: true }
            )
            .select();
        if (error) throw error;
        return (data?.length ?? 0) > 0;
    } catch (err) {
        console.error('Failed to award achievement', achievementId, err);
        return false;
    }
}
