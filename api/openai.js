// Diese Datei in den Ordner /api Ihres Projekts legen
export default async function handler(req, res) {
    // CORS-Header für lokale Entwicklung
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
  
    // Nur POST-Anfragen akzeptieren
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Methode nicht erlaubt' });
      return;
    }
  
    try {
      const formData = req.body;
  
      if (!formData) {
        res.status(400).json({ error: 'Keine Formulardaten übermittelt' });
        return;
      }
  
      // Minimaler Prompt für kürzere Antworten
      let prompt = `Fasse die folgenden Physiotherapie-Daten KURZ zusammen:\n\n`;
      prompt += `Therapieziel: ${formData.goalText || "Keine Beschreibung angegeben"}\n`;
      prompt += `Hypothese: ${formData.hypothesisText || "Keine Hypothese angegeben"}\n\n`;
      prompt += `Therapieverlauf:\n`;
      prompt += `- ${formData.goal === 'erreicht' ? '🟢 Therapieziel erreicht' : '🔴 Therapieziel nicht erreicht'}\n`;
      
      if (formData.goal === 'nicht_erreicht') {
        prompt += `- Compliance: ${formData.compliance === 'ja' ? '🟢 Ausreichend' : '🔴 Unzureichend'}\n`;
        prompt += `- Ursache: ${formData.reasonText || "Keine Begründung angegeben"}\n`;
      }
      
      prompt += `\nGib eine SEHR KURZE Analyse (maximal 2-3 Zeilen) und EINE knappe Empfehlung. Formatiere die Ausgabe genau wie folgt:
      
  Therapieziel: [Therapieziel]
  Hypothese: [Hypothese]
  
  Therapieverlauf:
  - [🟢 oder 🔴] Therapieziel [erreicht/nicht erreicht]
  - Compliance: [🟢 oder 🔴] [Bewertung]
  - Ursache: [Ursache bei Nicht-Erreichung]
  
  Empfehlung: [Eine kurze, prägnante Empfehlung]
  `;
  
      // OpenAI API-Aufruf mit API-Schlüssel aus Umgebungsvariablen
      const OPENAI_API_KEY = process.env.OPEN_API_KEY;
      
      if (!OPENAI_API_KEY) {
        throw new Error('OpenAI API-Schlüssel nicht konfiguriert');
      }
  
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",  // Günstigeres Modell statt gpt-4
          messages: [
            {
              role: "system",
              content: "Du bist ein knapper, präziser Physiotherapie-Assistent. Halte deine Antworten extrem kurz und verwende die vorgegebene Formatierung mit Emojis. Gib immer genau eine konkrete Empfehlung."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.3  // Niedrigere Temperatur für konsistentere, präzisere Antworten
        })
      });
  
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message || 'OpenAI API-Fehler');
      }
  
      res.status(200).json({ 
        result: data.choices[0].message.content 
      });
      
    } catch (error) {
      console.error('Fehler bei der Verarbeitung der Anfrage:', error);
      res.status(500).json({ error: error.message || 'Interner Serverfehler' });
    }
  }