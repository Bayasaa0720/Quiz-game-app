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
            setHint('Select a category to edit first.');
        }
    };

    const handleBulkImport = () => {
        if (categoryId) {
            onBulkImport(categoryId);
        } else {
            setHint('Select a category to add questions to first.');
        }
    };

    if (loading) return <p style={{ textAlign: 'center' }}>Loading...</p>;
    if (loadError) return <ErrorState message="Failed to load categories." onRetry={fetchCategories} />;

    return (
        <div className="manage-content-page">
            <Button variant="ghost" onClick={onBack} className="manage-content-back">← Back to tower list</Button>
            <h2>📝 Manage content</h2>

            <Card className="manage-panel">
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                    <option value="">-- Select category --</option>
                    {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </select>
                {hint && <p className="tower-hint">{hint}</p>}
                <div className="manage-actions">
                    <Button variant="success" onClick={onCreateQuestion}>Add new question</Button>
                    <Button variant="ghost" onClick={handleBulkImport}>Bulk import (CSV/Excel)</Button>
                    <Button variant="ghost" onClick={handleManage}>Manage questions (Edit/Delete)</Button>
                </div>
            </Card>
        </div>
    );
}
