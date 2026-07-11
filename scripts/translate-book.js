const fs = require('fs');
const path = require('path');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const TARGET_FILE = 'src/fundamentals/intervals.md'; // ניתן לשנות בכל פעם לקובץ הרלוונטי
const LOG_FILE = 'translation_log.json';

// פונקציית עזר ליצירת השהיה (במילישניות) למניעת חריגה ממגבלת ה-Rate Limits
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const SYSTEM_PROMPT = `You are a professional music theory translator from English to Hebrew. 
Translate the text accurately adhering to these strict rules:
1. For complex concepts, write the Hebrew translation followed by the original English concept in parentheses.
2. Keep musical note letters (A, B, C, D, E, F, G) exactly as they are in English uppercase.
3. Translate Solfège names (do, re, mi...) directly to Hebrew (דו, רה, מי...).
4. Never translate or alter Markdown syntax, HTML tags, links, or code blocks.
5. Output ONLY the direct translation. Do not include any introductory remarks, explanations, or conversational text. Return the translated text and nothing else.`;

async function translateParagraph(paragraph) {
    // דילוג על שורות ריקות, קטעי קוד מוטמעים או תגיות מבנה
    if (!paragraph.trim() || paragraph.startsWith('```') || paragraph.startsWith('<')) {
        return paragraph; 
    }

    try {
        const response = await fetch('[https://api.groq.com/openai/v1/chat/completions](https://api.groq.com/openai/v1/chat/completions)', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "llama3-70b-8192", 
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: paragraph }
                ],
                temperature: 0.1 // ערך נמוך יותר מבטיח היצמדות קשיחה להנחיות ומניעת "יצירתיות"
            })
        });

        if (!response.ok) {
            console.error(`API Error: ${response.status} ${response.statusText}`);
            return null;
        }

        const data = await response.json();
        return data.choices[0].message.content.trim();
    } catch (error) {
        console.error("Error translating paragraph:", error);
        return null;
    }
}

async function main() {
    if (!fs.existsSync(TARGET_FILE)) {
        console.log(`Target file not found: ${TARGET_FILE}`);
        return;
    }

    const content = fs.readFileSync(TARGET_FILE, 'utf-8');
    const paragraphs = content.split('\n\n'); 
    const translatedParagraphs = [];
    let logData = fs.existsSync(LOG_FILE) ? JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8')) : [];

    console.log(`Starting controlled translation for ${TARGET_FILE}...`);

    for (let i = 0; i < paragraphs.length; i++) {
        const p = paragraphs[i];
        
        if (p.trim()) {
            console.log(`Translating paragraph ${i + 1}/${paragraphs.length}...`);
            const translated = await translateParagraph(p);
            
            if (translated && translated !== p) {
                translatedParagraphs.push(translated);
                // תיעוד מדויק לתוך קובץ הלוג
                logData.push({
                    file: TARGET_FILE,
                    timestamp: new Date().toISOString(),
                    original: p,
                    translated: translated
                });
            } else {
                translatedParagraphs.push(p);
            }

            // השהיה של 3 שניות בין בקשה לבקשה כדי לא להיחסם על ידי גרוק
            await delay(3000); 
        } else {
            translatedParagraphs.push('');
        }
    }

    // שמירה ועדכון של הקבצים במאגר
    fs.writeFileSync(TARGET_FILE, translatedParagraphs.join('\n\n'), 'utf-8');
    fs.writeFileSync(LOG_FILE, JSON.stringify(logData, null, 2), 'utf-8');
    console.log("Translation process finished successfully and logs are updated.");
}

main();
