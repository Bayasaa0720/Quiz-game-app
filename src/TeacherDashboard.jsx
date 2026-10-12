import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './supabaseClient.jsx';
import Card from './components/Card.jsx';
import Button from './components/Button.jsx';
import ErrorState from './components/ErrorState.jsx';
import { useModal } from './components/modalContext.js';
import './TeacherDashboard.css';

// Excel/Sheets-д нээхэд "=", "+", "-", "@"-ээр эхэлсэн утгыг томьёо гэж
// тайлбарлаж болзошгүй (CSV formula injection) тул тийм эгнээг '-ээр
// угтдаг — ердийн текст тайлбар хэвээр хадгалагдана.
function sanitizeCsvCell(value) {
    const str = String(value ?? '');
    return /^[=+\-@]/.test(str) ? `'${str}` : str;
}

function downloadCsv(filename, rows, headers) {
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${sanitizeCsvCell(r[h]).replace(/"/g, '""')}"`).join(','))].join('\n');
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

    if (loading) return <p className="teacher-detail-loading">Loading...</p>;

    return (
        <div className="teacher-student-detail">
            <div className="teacher-detail-row">
                <span>7-day activity:</span>
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
                                title={`${key}: ${count} floors`}
                            />
                        );
                    })}
                </span>
            </div>

            {breakdown.length === 0 ? (
                <p className="teacher-detail-empty">No battle history — this student hasn't played yet.</p>
            ) : (
                <table className="teacher-breakdown-table">
                    <thead>
                        <tr><th>Topic</th><th>Correct</th><th>Wrong</th><th>Accuracy</th></tr>
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

            <Button variant="danger" onClick={onRemove} className="teacher-remove-btn">Remove from class</Button>
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
    const mountedRef = useRef(true);
    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    const fetchClassrooms = useCallback(async () => {
        setLoading(true);
        setLoadError(false);
        try {
            const { data, error } = await supabase
                .from('classrooms')
                .select('id, name, invite_code, created_at')
                .eq('teacher_user_id', user.id)
                .order('created_at', { ascending: false });
            if (!mountedRef.current) return;
            if (error) throw error;
            setClassrooms(data || []);
        } catch (err) {
            console.error('Error loading classrooms:', err);
            if (mountedRef.current) setLoadError(true);
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    }, [user.id]);

    useEffect(() => {
        fetchClassrooms();
    }, [fetchClassrooms]);

    const fetchRoster = useCallback(async (classroomId) => {
        const { data, error } = await supabase.rpc('teacher_classroom_overview', { p_classroom_id: classroomId });
        if (!error) setRoster(data || []);
    }, []);

    const makeInviteCode = (name) =>
        `${name.slice(0, 4).toUpperCase().replace(/[^A-ZА-Я0-9]/g, 'X')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const handleCreateClassroom = async () => {
        const name = newClassroomName.trim();
        if (!name) return;
        // invite_code нь DB талдаа UNIQUE (classrooms.sql) — санамсаргүй
        // давталт гарвал (маш бага магадлал) шинэ кодоор хэдхэн удаа дахин
        // оролдоно, бусад алдааг шууд харуулна.
        let lastError = null;
        for (let attempt = 0; attempt < 3; attempt++) {
            const { data, error } = await supabase
                .from('classrooms')
                .insert({ teacher_user_id: user.id, name, invite_code: makeInviteCode(name) })
                .select()
                .single();
            if (!error) {
                setNewClassroomName('');
                setClassrooms(c => [data, ...c]);
                return;
            }
            lastError = error;
            if (error.code !== '23505') break; // unique_violation биш бол дахин оролдохгүй
        }
        console.error('Failed to create classroom:', lastError);
        await modal.alert('Failed to create the class.');
    };

    const openClassroom = async (classroom) => {
        setSelectedClassroom(classroom);
        setExpandedStudentId(null);
        await fetchRoster(classroom.id);
    };

    const handleRemoveStudent = async (studentUserId) => {
        const confirmed = await modal.confirm('Remove this student from the class?', { title: 'Remove' });
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
                'Student': r.display_name,
                'Total floors': r.total_floors_cleared,
                'Last active': r.last_active ? new Date(r.last_active).toLocaleDateString('en-US') : '—',
            })),
            ['Student', 'Total floors', 'Last active']
        );
    };

    if (loading) return <p style={{ textAlign: 'center' }}>Loading...</p>;
    if (loadError) return <ErrorState message="Failed to load classes." onRetry={fetchClassrooms} />;

    if (selectedClassroom) {
        return (
            <Card className="teacher-dashboard">
                <Button variant="ghost" onClick={() => setSelectedClassroom(null)} className="teacher-back">← All classes</Button>
                <h2>{selectedClassroom.name}</h2>
                <p className="teacher-invite-code">Join code: <code>{selectedClassroom.invite_code}</code></p>

                {roster.length === 0 ? (
                    <p className="teacher-empty">No students in this class yet. Share the code above with them.</p>
                ) : (
                    <>
                        <div className="teacher-roster-header">
                            <span>Class overview: {roster.length} student{roster.length === 1 ? '' : 's'}</span>
                            <Button variant="ghost" onClick={exportCsv}>⬇ Download CSV</Button>
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
                                            {s.total_floors_cleared} floors
                                            {s.last_active && <> · {new Date(s.last_active).toLocaleDateString('en-US')}</>}
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
            <Button variant="ghost" onClick={onBack} className="teacher-back">← Back to tower list</Button>
            <h2>🏫 My classes</h2>

            <div className="teacher-create-row">
                <input
                    type="text"
                    placeholder="New class name..."
                    value={newClassroomName}
                    onChange={(e) => setNewClassroomName(e.target.value)}
                />
                <Button variant="success" onClick={handleCreateClassroom}>Create class</Button>
            </div>

            {classrooms.length === 0 ? (
                <p className="teacher-empty">You haven't created any classes yet.</p>
            ) : (
                <div className="teacher-classroom-list">
                    {classrooms.map(c => (
                        <Card key={c.id} className="teacher-classroom-row" onClick={() => openClassroom(c)}>
                            <h3>{c.name}</h3>
                            <span className="teacher-invite-code">Code: <code>{c.invite_code}</code></span>
                        </Card>
                    ))}
                </div>
            )}
        </Card>
    );
}
