import { useState, useEffect } from "react";
import sql from "./db.jsx";

export default function QuizCreator({ onDone }) {
    const [categories, setCategories] = useState([]);
    const [formData, setFormData] = useState({
        categoryId: "",
        question: "",
        answer: "",
    });
    
    const [qIsImage, setQIsImage] = useState(false);
    const [aIsImage, setAIsImage] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const data = await sql`SELECT id, name FROM categories ORDER BY name ASC`;
                setCategories(data);
            } catch (err) {
                console.error("Failed to load categories:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchCategories();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.categoryId) {
            alert("Please select a category first!");
            return;
        }

        if (!formData.question || !formData.answer) {
            alert("Please fill in both the question and the answer.");
            return;
        }

        try {
            await sql`
                INSERT INTO quiz_items (category_id, quiz_question, correct_answer)
                VALUES (${parseInt(formData.categoryId)}, ${formData.question}, ${formData.answer})
            `;
            alert("Saved successfully to Neon!");
            onDone();
        } catch (err) {
            console.error("Database Error:", err);
            alert("Error saving to Neon: " + err.message);
        }
    };

    if (loading) return <p style={{ color: "white", textAlign: "center" }}>Loading categories...</p>;

    return (
        <div style={{ 
            padding: "20px", 
            backgroundColor: "#333", 
            color: "white", 
            borderRadius: "12px", 
            maxWidth: "550px", 
            margin: "0 auto",
            boxShadow: "0 4px 15px rgba(0,0,0,0.3)"
        }}>
            <h2 style={{ textAlign: "center", marginBottom: "10px" }}>Create New Question</h2>
            
            {/* 💡 THE REMINDER BOX */}
            <div style={{ 
                backgroundColor: "#2c3e50", 
                padding: "10px", 
                borderRadius: "8px", 
                marginBottom: "20px", 
                fontSize: "0.85rem", 
                borderLeft: "4px solid #3498db" 
            }}>
                <strong>💡 Pro Tip for Images:</strong> Right-click an image on the web and select 
                <em> "Copy Image Address."</em> The URL should end in <strong>.png, .jpg, or .svg</strong>.
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                
                {/* Category Selection */}
                <div>
                    <label style={{ display: "block", marginBottom: "5px", fontSize: "0.9rem", color: "#ccc" }}>Select Category:</label>
                    <select 
                        required
                        value={formData.categoryId} 
                        onChange={(e) => setFormData({...formData, categoryId: e.target.value})}
                        style={{ width: "100%", padding: "10px", borderRadius: "4px", backgroundColor: "#fff", color: "#000", border: "none" }}
                    >
                        <option value="">-- Choose a Category --</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                </div>

                {/* Question Input */}
                <div style={{ border: "1px solid #555", padding: "12px", borderRadius: "8px", backgroundColor: "#444" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px", cursor: "pointer" }}>
                        <input type="checkbox" checked={qIsImage} onChange={() => setQIsImage(!qIsImage)} />
                        <span style={{ fontSize: "0.9rem", fontWeight: "bold" }}>Question is an Image URL</span>
                    </label>
                    <input 
                        required
                        placeholder={qIsImage ? "Paste Direct Image URL here..." : "Type Question Text"}
                        value={formData.question}
                        onChange={(e) => setFormData({...formData, question: e.target.value})}
                        style={{ width: "100%", padding: "10px", borderRadius: "4px", border: "1px solid #666", boxSizing: "border-box" }}
                    />
                    {qIsImage && <p style={{ fontSize: "0.75rem", color: "#aaa", marginTop: "5px" }}>Must end in .png, .jpg, or .svg</p>}
                </div>

                {/* Answer Input */}
                <div style={{ border: "1px solid #555", padding: "12px", borderRadius: "8px", backgroundColor: "#444" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px", cursor: "pointer" }}>
                        <input type="checkbox" checked={aIsImage} onChange={() => setAIsImage(!aIsImage)} />
                        <span style={{ fontSize: "0.9rem", fontWeight: "bold" }}>Answer is an Image URL</span>
                    </label>
                    <input 
                        required
                        placeholder={aIsImage ? "Paste Answer Image URL here..." : "Type Answer Text"}
                        value={formData.answer}
                        onChange={(e) => setFormData({...formData, answer: e.target.value})}
                        style={{ width: "100%", padding: "10px", borderRadius: "4px", border: "1px solid #666", boxSizing: "border-box" }}
                    />
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                    <button type="submit" style={{ flex: 2, padding: "12px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}>
                        Add to Database
                    </button>
                    <button type="button" onClick={onDone} style={{ flex: 1, padding: "12px", backgroundColor: "#666", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}>
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}