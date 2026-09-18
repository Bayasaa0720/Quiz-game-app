import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient.jsx';
import Card from './components/Card.jsx';
import Button from './components/Button.jsx';
import ErrorState from './components/ErrorState.jsx';
import { useModal } from './components/modalContext.js';
import './TeacherDashboard.css';

function downloadCsv(filename, rows, headers) {
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

function StudentDetail({ classroomId, student, onRemove }) {
    const [breakdown, setBreakdown] = useState([]);
    const [activity, setActivity] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        Promise.all([
            supabase.rpc('teacher_student_breakdown', { p_classroom_id: classroomId, p_student_user_id: student.student_user_id }),
            supabase.rpc('teacher_student_daily_activity', { p_classroom_id: classroomId, p_student_user_id: student.student_user_id }),
        ]).then(([b, a]) => {
            if (cancelled) return;
            setBreakdown(b.data || []);
            setActivity(a.data || []);
            setLoading(false);
        });
        return () => { cancelled = true; };
    }, [classroomId, student.student_user_id]);

    if (loading) return <p className="teacher-detail-loading">Ачааллаж байна...</p>;

    return (
        <div className="teacher-student-detail">
            <div className="teacher-detail-row">
                <span>7 хоногийн идэвх:</span>
                <span className="teacher-sparkline">
                    {Array.from({ length: 7 }).map((_, i) => {
                        const d = new Date();
                        d.setDate(d.getDate() - (6 - i));
                        const key = d.toISOString().slice(0, 10);
                        const found = activity.find(a => a.activity_date === key);
                        const count = Number(found?.floors_won || 0);
                        return (
                            <span
                                key={key}
                                className="teacher-spark-bar"
                                style={{ height: `${Math.min(count, 5) * 6 + 4}px` }}
                                title={`${key}: ${count} давхар`}
                            />
                        );
                    })}
                </span>
            </div>

            {breakdown.length === 0 ? (
                <p className="teacher-detail-empty">Тулааны түүх алга — сурагч хараахан тоглоогүй байна.</p>
            ) : (
                <table className="teacher-breakdown-table">
                    <thead>
                        <tr><th>Сэдэв</th><th>Зөв</th><th>Буруу</th><th>Нарийвчлал</th></tr>
                    </thead>
                    <tbody>
                        {breakdown.map(b => (
                            <tr key={b.category_id} className={Number(b.accuracy) < 60 ? 'weak' : ''}>
                                <td>{b.category_name}</td>
                                <td>{b.correct_total}</td>
                                <td>{b.wrong_total}</td>
                                <td>{b.accuracy != null ? `${b.accuracy}%` : '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            <Button variant="danger" onClick={onRemove} className="teacher-remove-btn">Ангиас хасах</Button>
        </div>
    );
}

export default function TeacherDashboard({ user, onBack }) {
    const [classrooms, setClassrooms] = useState([]);
    const [selectedClassroom, setSelectedClassroom] = useState(null);
    const [roster, setRoster] = useState([]);
    const [expandedStudentId, setExpandedStudentId] = useState(null);
    const [newClassroomName, setNewClassroomName] = useState('');
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const modal = useModal();

    const fetchClassrooms = useCallback(async () => {
        setLoading(true);
        setLoadError(false);
        try {
            const { data, error } = await supabase
                .from('classrooms')
                .select('id, name, invite_code, created_at')
                .eq('teacher_user_id', user.id)
                .order('created_at', { ascending: false });
            if (error) throw error;
            setClassrooms(data || []);
        } catch (err) {
            console.error('Error loading classrooms:', err);
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, [user.id]);

    useEffect(() => {
        fetchClassrooms();
    }, [fetchClassrooms]);

    const fetchRoster = useCallback(async (classroomId) => {
        const { data, error } = await supabase.rpc('teacher_classroom_overview', { p_classroom_id: classroomId });
        if (!error) setRoster(data || []);
    }, []);

    const handleCreateClassroom = async () => {
        const name = newClassroomName.trim();
        if (!name) return;
        const inviteCode = `${name.slice(0, 4).toUpperCase().replace(/[^A-ZА-Я0-9]/g, 'X')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
        const { data, error } = await supabase
            .from('classrooms')
            .insert({ teacher_user_id: user.id, name, invite_code: inviteCode })
            .select()
            .single();
        if (error) {
            console.error('Failed to create classroom:', error);
            await modal.alert('Анги үүсгэхэд алдаа гарлаа.');
            return;
        }
        setNewClassroomName('');
        setClassrooms(c => [data, ...c]);
    };

    const openClassroom = async (classroom) => {
        setSelectedClassroom(classroom);
        setExpandedStudentId(null);
        await fetchRoster(classroom.id);
    };

    const handleRemoveStudent = async (studentUserId) => {
        const confirmed = await modal.confirm('Энэ сурагчийг ангиас хасах уу?', { title: 'Хасах' });
        if (!confirmed) return;
        const { error } = await supabase.rpc('teacher_remove_student', {
            p_classroom_id: selectedClassroom.id,
            p_student_user_id: studentUserId,
        });
        if (!error) {
            setExpandedStudentId(null);
            await fetchRoster(selectedClassroom.id);
        }
    };

    const exportCsv = () => {
        downloadCsv(
            `${selectedClassroom.name}_progress.csv`,
            roster.map(r => ({
                'Сурагч': r.display_name,
                'Нийт давхар': r.total_floors_cleared,
                'Сүүлд идэвхтэй': r.last_active ? new Date(r.last_active).toLocaleDateString('mn-MN') : '—',
            })),
            ['Сурагч', 'Нийт давхар', 'Сүүлд идэвхтэй']
        );
    };

    if (loading) return <p style={{ textAlign: 'center' }}>Ачааллаж байна...</p>;
    if (loadError) return <ErrorState message="Ангиудыг ачаалахад алдаа гарлаа." onRetry={fetchClassrooms} />;

    if (selectedClassroom) {
        return (
            <Card className="teacher-dashboard">
                <Button variant="ghost" onClick={() => setSelectedClassroom(null)} className="teacher-back">← Бүх анги руу</Button>
                <h2>{selectedClassroom.name}</h2>
                <p className="teacher-invite-code">Нэгдэх код: <code>{selectedClassroom.invite_code}</code></p>

                {roster.length === 0 ? (
                    <p className="teacher-empty">Одоогоор энэ ангид сурагч алга. Дээрх кодыг сурагчдад хуваалцаарай.</p>
                ) : (
                    <>
                        <div className="teacher-roster-header">
                            <span>Ангийн ерөнхий тойм: {roster.length} сурагч</span>
                            <Button variant="ghost" onClick={exportCsv}>⬇ CSV татах</Button>
                        </div>
                        <div className="teacher-roster">
                            {roster.map(s => (
                                <div key={s.student_user_id} className="teacher-student-card">
                                    <div
                                        className="teacher-student-row"
                                        onClick={() => setExpandedStudentId(id => id === s.student_user_id ? null : s.student_user_id)}
                                    >
                                        <span className="teacher-student-name">{s.display_name}</span>
                                        <span className="teacher-student-stats">
                                            {s.total_floors_cleared} давхар
                                            {s.last_active && <> · {new Date(s.last_active).toLocaleDateString('mn-MN')}</>}
                                        </span>
                                    </div>
                                    {expandedStudentId === s.student_user_id && (
                                        <StudentDetail
                                            classroomId={selectedClassroom.id}
                                            student={s}
                                            onRemove={() => handleRemoveStudent(s.student_user_id)}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </Card>
        );
    }

    return (
        <Card className="teacher-dashboard">
            <Button variant="ghost" onClick={onBack} className="teacher-back">← Цамхаг сонгох руу</Button>
            <h2>🏫 Миний ангиуд</h2>

            <div className="teacher-create-row">
                <input
                    type="text"
                    placeholder="Шинэ ангийн нэр..."
                    value={newClassroomName}
                    onChange={(e) => setNewClassroomName(e.target.value)}
                />
                <Button variant="success" onClick={handleCreateClassroom}>Анги үүсгэх</Button>
            </div>

            {classrooms.length === 0 ? (
                <p className="teacher-empty">Одоогоор анги үүсгээгүй байна.</p>
            ) : (
                <div className="teacher-classroom-list">
                    {classrooms.map(c => (
                        <Card key={c.id} className="teacher-classroom-row" onClick={() => openClassroom(c)}>
                            <h3>{c.name}</h3>
                            <span className="teacher-invite-code">Код: <code>{c.invite_code}</code></span>
                        </Card>
                    ))}
                </div>
            )}
        </Card>
    );
}
