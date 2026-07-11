const fs = require('fs');
const path = require('path');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const TARGET_FILE = 'src/fundamentals/intervals.md'; // דוגמה לקובץ להתחלה
const LOG_FILE = 'translation_log.json';

const SYSTEM_PROMPT = `You are a professional music theory translator from English to Hebrew. 
Translate the text accurately adhering to these strict rules:
1. For complex concepts, write the Hebrew translation followed by the original English concept in parentheses.
2. Keep musical note letters (A, B, C, D, E, F, G) exactly as they are in English uppercase.
3. Translate Solfège names (do, re, mi...) directly to Hebrew (דו, רה, מי...).
4. Never translate or alter Markdown syntax, HTML tags, links, or code blocks.
5. Translate only the sentence/paragraph provided. Do not add any explanations outside the translation.`;

async function translateParagraph(paragraph) {
    if (!paragraph.trim() || paragraph.startsWith('```') || paragraph.startsWith('<')) {
        return paragraph; // דילוג על קוד, תגיות או שורות ריקות
    }

    try {
        const response = await fetch('[https://api.groq.com/openai/v1/chat/completions](https://api.groq.com/openai/v1/chat/completions)', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "llama3-70b-8192", // מודל חזק ומדויק לתרגום
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: paragraph }
                ],
                temperature: 0.2
            })
        });

        const data = await response.json();
        return data.choices[0].message.content.trim();
    } catch (error) {
        console.error("Error translating paragraph:", error);
        return null;
    }
}

async function main() {
    if (!fs.existsSync(TARGET_FILE)) {
        console.log("Target file not found.");
        return;
    }

    const content = fs.readFileSync(TARGET_FILE, 'utf-8');
    const paragraphs = content.split('\n\n'); // חלוקה לפי פסקאות
    const translatedParagraphs = [];
    let logData = fs.existsSync(LOG_FILE) ? JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8')) : [];

    console.log(`Starting translation for ${TARGET_FILE}...`);

    for (let p of paragraphs) {
        if (p.trim()) {
            const translated = await translateParagraph(p);
            if (translated && translated !== p) {
                translatedParagraphs.push(translated);
                // שמירת הלוג של הפסקה הנוכחית
                logData.push({
                    file: TARGET_FILE,
                    timestamp: new Date().toISOString(),
                    original: p,
                    translated: translated
                });
            } else {
                translatedParagraphs.push(p);
            }
        } else {
            translatedParagraphs.push('');
        }
    }

    // שמירת הקובץ המתורגם והלוגים
    fs.writeFileSync(TARGET_FILE, translatedParagraphs.join('\n\n'), 'utf-8');
    fs.writeFileSync(LOG_FILE, JSON.stringify(logData, null, 2), 'utf-8');
    console.log("Translation process finished successfully.");
}

main();
