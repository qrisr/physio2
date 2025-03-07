export default async function handler(req, res) {
    // CORS-Header für lokale Entwicklung
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // OPTIONS-Preflight für CORS
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Nur POST-Anfragen erlauben
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Methode nicht erlaubt' });
        return;
    }

    try {
        const { goalText, hypothesisText, goal, compliance, reasonText } = req.body;

        if (!goalText || !hypothesisText) {
            res.status(400).json({ error: 'Fehlende Eingaben' });
            return;
        }

        // **Bericht formatieren**
        let report = `Therapieziel: ${goalText}\n`;
        report += `Hypothese: ${hypothesisText}\n\n`;
        report += `Therapieverlauf:\n`;
        report += goal === 'erreicht' ? '- 🟢 Therapieziel erreicht\n' : '- 🔴 Therapieziel nicht erreicht\n';

        if (goal === 'nicht_erreicht') {
            report += `- Compliance: ${compliance === 'ja' ? '🟢 Gut' : '🔴 Unzureichend'}\n`;
            report += `- Ursache: ${reasonText || "Nicht angegeben"}\n`;
        }

        // **GPT-3.5 Turbo für die Empfehlung nutzen**
        const OPENAI_API_KEY = process.env.OPEN_API_KEY;
        if (!OPENAI_API_KEY) throw new Error('OpenAI API-Schlüssel fehlt');

        const empfehlungPrompt = `
            Erstelle eine EXTREM KURZE Empfehlung (nur ein Satz!) für einen Physiotherapie-Abschlussbericht mit:
            Therapieziel: ${goalText}
            Hypothese: ${hypothesisText}
            ${goal === 'nicht_erreicht' ? `Begründung: ${reasonText || "Nicht angegeben"}` : ''}
            Ziel ${goal === 'erreicht' ? 'erreicht' : 'nicht erreicht'}
            ${goal === 'nicht_erreicht' ? `Compliance: ${compliance === 'ja' ? 'Gut' : 'Unzureichend'}` : ''}
            
            Schreibe **NUR EINEN EINZIGEN SATZ** ohne Überschrift. Der Satz sollte mit "Weitere" oder einer ähnlichen Formulierung beginnen.
            
            Beispiel: "Weitere medizinische Abklärung sowie motivierende Gesprächsführung zur Steigerung der Therapiebereitschaft wird empfohlen."
        `;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: empfehlungPrompt }],
                temperature: 0.1,
                max_tokens: 50
            })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);

        // Empfehlung formatieren
        let empfehlung = data.choices[0]?.message?.content?.trim() || "Keine Empfehlung generiert.";
        empfehlung = empfehlung.replace(/^(Empfehlung:|\s*)/i, '').split('.')[0] + '.';

        // **Bericht finalisieren**
        report += `\nEmpfehlung: ${empfehlung}`;

        res.status(200).json({ result: report });

    } catch (error) {
        console.error('Fehler:', error);
        res.status(500).json({ error: error.message || 'Interner Serverfehler' });
    }
}