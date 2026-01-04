import { useState, useEffect } from 'react';
// 1. Remove supabase import and add your neon sql import
import sql from './db.jsx'; 

export default function QuizSelector({ onCategorySelect }) {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    async function fetchCategories() {
      try {
        // 2. Use the neon 'sql' template tag instead of supabase
        // This will fetch your new categories: Flags, Anime, etc.
        const data = await sql`SELECT id, name FROM categories`;
        
        if (data) {
          setCategories(data);
        }
      } catch (error) {
        console.error('Error fetching categories from Neon:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchCategories();
  }, []);

  if (loading) {
    return <p>Loading quiz categories from Neon...</p>;
  }

  if (categories.length === 0) {
    return (
      <div style={{ textAlign: 'center' }}>
        <p>No categories found in Neon database.</p>
        <p>Tip: Make sure you ran the INSERT script in the Neon SQL Editor!</p>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <h3>Choose a Quiz Category to Start</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '15px', marginTop: '20px' }}>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onCategorySelect(cat.id)} 
            style={{ 
              padding: '15px 30px', 
              backgroundColor: '#5bc0de', 
              color: 'white', 
              border: 'none', 
              borderRadius: '5px', 
              cursor: 'pointer',
              fontSize: '1.1em',
              fontWeight: 'bold'
            }}
          >
            {cat.name}
          </button>
        ))}
      </div>
    </div>
  );
}