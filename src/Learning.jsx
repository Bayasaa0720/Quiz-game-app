import { useState } from 'react';
import { supabase } from './supabaseClient.jsx';
import Card from './components/Card.jsx';
import Button from './components/Button.jsx';
import TeacherDashboard from './TeacherDashboard.jsx';
import './Learning.css';

// "🎓 Сургалт" таб — багш бол ангийн dashboard, сурагч бол нэгдэх нэг
// талбарын маягт. userRole тодорхойгүй үед (ачаалж дуусаагүй) юу ч харуулахгүй.
export default function Learning({ user, userRole, onBack }) {
    const [joinCode, setJoinCode] = useState('');
    const [joinHint, setJoinHint] = useState('');
    const [joining, setJoining] = useState(false);

    if (userRole === 'teacher') {
        return <TeacherDashboard user={user} onBack={onBack} />;
    }

    const handleJoinClassroom = async () => {
        const code = joinCode.trim();
        if (!code) return;
        setJoining(true);
        const { data, error } = await supabase.rpc('join_classroom', { p_invite_code: code });
        setJoining(false);
        if (error) {
            setJoinHint('Invalid code. Check with your teacher.');
            return;
        }
        setJoinHint(`Successfully joined "${data?.[0]?.classroom_name || ''}"!`);
        setJoinCode('');
    };

    return (
        <div className="learning-page">
            <Button variant="ghost" onClick={onBack} className="learning-back">← Back to tower list</Button>
            <h2>🎓 Classes</h2>
            <Card className="learning-join-panel">
                <h3>Join a class</h3>
                <div className="learning-join-row">
                    <input
                        type="text"
                        placeholder="Teacher's code..."
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value)}
                    />
                    <Button variant="success" onClick={handleJoinClassroom} disabled={joining}>Join</Button>
                </div>
                {joinHint && <p className="learning-hint">{joinHint}</p>}
            </Card>
        </div>
    );
}
