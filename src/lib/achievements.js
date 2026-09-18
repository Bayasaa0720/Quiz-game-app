// Achievement каталог. Points/streak-д (v5 BRD, Feature 01, хойшлуулсан) хамааралгүй,
// зөвхөн одоо байгаа өгөгдлөөс шууд тооцоолж болох тэмдэгтүүд.
export const ACHIEVEMENTS = [
    { id: 'first_floor', icon: '🏹', name: 'Анхны алхам', description: 'Анхны давхараа дийлсэн' },
    { id: 'tower_complete', icon: '🗼', name: 'Цамхаг эзэн', description: 'Нэг цамхгийг бүрэн дийлсэн' },
    { id: 'flawless_floor', icon: '💯', name: 'Цэвэр ялалт', description: 'Ямар ч буруу хариулгүйгээр давхар дийлсэн' },
    { id: 'leaderboard_top1', icon: '🏆', name: 'Тэргүүлэгч', description: 'Leaderboard-т 1-р байранд орсон' },
    { id: 'duel_first_win', icon: '⚔️', name: 'Дуэлийн ялагч', description: '1v1 өрсөлдөөнд анх удаа ялсан' },
];

export async function awardAchievement(supabase, userId, achievementId) {
    if (!userId) return;
    try {
        await supabase.from('user_achievements').upsert(
            { user_id: userId, achievement_id: achievementId },
            { onConflict: 'user_id,achievement_id', ignoreDuplicates: true }
        );
    } catch (err) {
        console.error('Failed to award achievement', achievementId, err);
    }
}
