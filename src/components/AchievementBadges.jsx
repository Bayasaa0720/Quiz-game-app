import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient.jsx';
import { ACHIEVEMENTS } from '../lib/achievements.js';
import './AchievementBadges.css';

export default function AchievementBadges({ userId }) {
    const [earnedIds, setEarnedIds] = useState(new Set());

    useEffect(() => {
        if (!userId) return;
        supabase
            .from('user_achievements')
            .select('achievement_id')
            .eq('user_id', userId)
            .then(({ data, error }) => {
                if (!error) setEarnedIds(new Set((data || []).map(r => r.achievement_id)));
            });
    }, [userId]);

    return (
        <div className="achievement-row" role="list" aria-label="Тэмдэгтүүд">
            {ACHIEVEMENTS.map(a => {
                const earned = earnedIds.has(a.id);
                return (
                    <span
                        key={a.id}
                        role="listitem"
                        className={`achievement-badge${earned ? ' earned' : ' locked'}`}
                        title={`${a.name} — ${a.description}${earned ? '' : ' (хараахан нээгдээгүй)'}`}
                    >
                        {a.icon}
                    </span>
                );
            })}
        </div>
    );
}
