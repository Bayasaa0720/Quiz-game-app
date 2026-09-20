import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient.jsx';
import Card from './components/Card.jsx';
import Button from './components/Button.jsx';
import ErrorState from './components/ErrorState.jsx';
import './ManageContent.css';

export default function ManageContent({ user, onBack, onCreateQuestion, onManageQuestions, onBulkImport }) {
    const [categories, setCategories] = useState([]);
    const [categoryId, setCategoryId] = useState('');
    const [hint, setHint] = useState('');
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);

    const fetchCategories = useCallback(async () => {
        setLoading(true);
        setLoadError(false);
        try {
            const { data, error } = await supabase
                .from('categories')
                .select('id, name, user_id')
                .eq('user_id', user.id)
                .order('name', { ascending: true });
            if (error) throw error;
            setCategories(data || []);
        } catch (err) {
            console.error('Error loading categories:', err);
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, [user.id]);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const handleManage = () => {
        if (categoryId) {
            onManageQuestions(categoryId);
        } else {
            setHint('Эхлээд засах ангиллаа сонгоно уу.');
        }
    };

    const handleBulkImport = () => {
        if (categoryId) {
            onBulkImport(categoryId);
        } else {
            setHint('Эхлээд асуулт нэмэх ангиллаа сонгоно уу.');
        }
    };

    if (loading) return <p style={{ textAlign: 'center' }}>Ачааллаж байна...</p>;
    if (loadError) return <ErrorState message="Ангиллуудыг ачаалахад алдаа гарлаа." onRetry={fetchCategories} />;

    return (
        <div className="manage-content-page">
            <Button variant="ghost" onClick={onBack} className="manage-content-back">← Цамхаг сонгох руу</Button>
            <h2>📝 Агуулга удирдах</h2>

            <Card className="manage-panel">
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                    <option value="">-- Ангилал сонгох --</option>
                    {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </select>
                {hint && <p className="tower-hint">{hint}</p>}
                <div className="manage-actions">
                    <Button variant="success" onClick={onCreateQuestion}>Шинэ асуулт нэмэх</Button>
                    <Button variant="ghost" onClick={handleBulkImport}>Олноор оруулах (CSV/Excel)</Button>
                    <Button variant="ghost" onClick={handleManage}>Асуулт удирдах (Засах/Устгах)</Button>
                </div>
            </Card>
        </div>
    );
}
