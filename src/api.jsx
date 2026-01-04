// src/api.js
import sql from './db';

export const fetchCategories = async () => {
  try {
    const data = await sql`SELECT * FROM categories`;
    return data;
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
};

export const fetchQuestionsByCategory = async (categoryId) => {
  try {
    const data = await sql`SELECT * FROM quiz_items WHERE category_id = ${categoryId}`;
    return data;
  } catch (error) {
    console.error("Error fetching questions:", error);
    return [];
  }
};