import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { supabase } from './supabaseClient.jsx';
import Card from './components/Card.jsx';
import Button from './components/Button.jsx';
import { useModal } from './components/modalContext.js';
import { rowsFromParsed } from './lib/bulkImportParsing.js';
import './BulkImport.css';

const TEMPLATE_CSV = 'Асуулт,Хариулт,Төрөл (заавал биш),Түвшин (заавал биш)\n' +
    'Монгол улсын нийслэл хот аль вэ?,Улаанбаатар,city,easy\n' +
    'CS2-т хэдэн bomb site байдаг вэ?,2,count,normal\n';

const IMPORT_CHUNK_SIZE = 200;
const PREVIEW_ROW_CAP = 500;

export default function BulkImport({ user, categoryId, onDone }) {
    const [rows, setRows] = useState([]);
    const [fileName, setFileName] = useState('');
    const [importing, setImporting] = useState(false);
    const [importProgress, setImportProgress] = useState(0);
    const [categoryName, setCategoryName] = useState('');
    const modal = useModal();

    useEffect(() => {
        let cancelled = false;
        supabase
            .from('categories')
            .select('name')
            .eq('id', categoryId)
            .eq('user_id', user.id)
            .maybeSingle()
            .then(({ data }) => { if (!cancelled && data) setCategoryName(data.name); });
        return () => { cancelled = true; };
    }, [categoryId, user.id]);

    const handleFile = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setFileName(file.name);
        const isExcel = /\.xlsx?$/i.test(file.name);

        if (isExcel) {
            const reader = new FileReader();
            reader.onload = (evt) => {
                const wb = XLSX.read(evt.target.result, { type: 'array' });
                const sheet = wb.Sheets[wb.SheetNames[0]];
                const records = XLSX.utils.sheet_to_json(sheet, { defval: '' });
                setRows(rowsFromParsed(records));
            };
            reader.readAsArrayBuffer(file);
        } else {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (result) => setRows(rowsFromParsed(result.data)),
            });
        }
    };

    const downloadTemplate = () => {
        const blob = new Blob(['﻿' + TEMPLATE_CSV], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'asuult_zagvar.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    const validRows = rows.filter(r => r.errors.length === 0);
    const errorRows = rows.filter(r => r.errors.length > 0);

    const handleImport = async () => {
        if (validRows.length === 0) return;
        setImporting(true);
        setImportProgress(0);
        try {
            const payload = validRows.map(r => ({
                category_id: categoryId,
                user_id: user.id,
                quiz_question: r.question,
                question_image_url: null,
                correct_answer: r.answer,
                answer_image_url: null,
                answer_type: r.answerType || null,
                difficulty: r.difficulty,
            }));
            // Том файлыг нэг INSERT-ээр биш, багцаар (chunk) явуулна —
            // payload/timeout эрсдэлийг багасгаж, муу мөр бүхэл batch-ийг
            // бус зөвхөн тухайн chunk-ийг амжилтгүй болгоно.
            let inserted = 0;
            for (let i = 0; i < payload.length; i += IMPORT_CHUNK_SIZE) {
                const chunk = payload.slice(i, i + IMPORT_CHUNK_SIZE);
                const { error } = await supabase.from('quiz_items').insert(chunk);
                if (error) throw new Error(`${inserted}-ээс хойш зогслоо: ${error.message}`);
                inserted += chunk.length;
                setImportProgress(inserted);
            }
            await modal.alert(`${inserted} асуулт амжилттай нэмэгдлээ. Тоглогдох давхарт орохын тулд Admin "Давхар шинэчлэх" хийх шаардлагатайг сануулъя.`);
            onDone();
        } catch (err) {
            console.error('Bulk import failed:', err);
            await modal.alert('Импорт хийхэд алдаа гарлаа: ' + err.message);
        } finally {
            setImporting(false);
        }
    };

    return (
        <Card className="bulk-import-page">
            <Button variant="ghost" onClick={onDone} className="bulk-import-back">← Lobby руу буцах</Button>
            <h2>Олноор асуулт оруулах</h2>
            <p className="bulk-import-target">Ангилал: <strong>{categoryName}</strong></p>

            <div className="bulk-import-step">
                <p>1. Загвар татаж, дүүргээд дахин оруулна уу (эсвэл өөрийн .csv/.xlsx файл шууд ашиглана).</p>
                <Button variant="ghost" onClick={downloadTemplate}>⬇ Загвар татах (.csv)</Button>
            </div>

            <div className="bulk-import-step">
                <p>2. Файлаа сонгоно уу:</p>
                <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} />
                {fileName && <p className="bulk-import-filename">{fileName}</p>}
            </div>

            {rows.length > 0 && (
                <div className="bulk-import-step">
                    <p>
                        3. Урьдчилан харах: <strong className="ok">{validRows.length} зөв</strong>
                        {errorRows.length > 0 && <> · <strong className="err">{errorRows.length} алдаатай</strong></>}
                    </p>
                    <div className="bulk-import-preview">
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th><th>Асуулт</th><th>Хариулт</th><th>Төрөл</th><th>Түвшин</th><th>Төлөв</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.slice(0, PREVIEW_ROW_CAP).map(r => (
                                    <tr key={r.rowNum} className={r.errors.length > 0 ? 'row-error' : ''}>
                                        <td>{r.rowNum}</td>
                                        <td>{r.question}</td>
                                        <td>{r.answer}</td>
                                        <td>{r.answerType}</td>
                                        <td>{r.difficulty}</td>
                                        <td>{r.errors.length > 0 ? r.errors.join('; ') : '✓'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {rows.length > PREVIEW_ROW_CAP && (
                            <p className="bulk-import-preview-note">
                                Эхний {PREVIEW_ROW_CAP} мөрийг л харуулж байна (нийт {rows.length}). Импорт нэмэх товч бүх зөв мөрийг хамарна.
                            </p>
                        )}
                    </div>

                    <Button
                        variant="success"
                        disabled={validRows.length === 0 || importing}
                        onClick={handleImport}
                        fullWidth
                    >
                        {importing ? `Оруулж байна... (${importProgress}/${validRows.length})` : `${validRows.length} асуулт нэмэх`}
                    </Button>
                </div>
            )}
        </Card>
    );
}
