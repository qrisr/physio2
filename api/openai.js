// Diese Datei in den Ordner /api Ihres Projekts legen (Vercel erkennt automatisch Dateien in diesem Ordner als Serverless Functions)

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
  
      // Prompt basierend auf den Formulardaten erstellen
      let prompt = `Analysiere folgende Physiotherapie-Daten und erstelle einen professionellen Bericht mit medizinisch fundierten Empfehlungen:\n\n`;
      prompt += `Zeit der Bewertung: ${formData.time}\n`;
      prompt += `Ziel: ${formData.goal === 'erreicht' ? 'Ziel erreicht' : 'Ziel nicht erreicht'}\n`;
      prompt += `Ziel-Beschreibung: ${formData.goalText || "Keine Beschreibung angegeben"}\n`;
      prompt += `Hypothese: ${formData.hypothesisText || "Keine Hypothese angegeben"}\n`;
      
      if (formData.goal === 'nicht_erreicht') {
        prompt += `Compliance: ${formData.compliance === 'ja' ? 'Ja' : formData.compliance === 'nein' ? 'Nein' : 'Nicht angegeben'}\n`;
        prompt += `Begründung für Nicht-Erreichung: ${formData.reasonText || "Keine Begründung angegeben"}\n`;
      }
      
      prompt += `\nBitte gib eine ausführliche Analyse und weitere spezifische Behandlungsempfehlungen basierend auf diesen Informationen. Verwende einen professionellen, medizinisch korrekten Sprachstil.`;
  
      // OpenAI API-Aufruf mit API-Schlüssel aus Umgebungsvariablen
      const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
      
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
          model: "gpt-4",  // Sie können auch gpt-3.5-turbo verwenden, wenn gewünscht
          messages: [
            {
              role: "system",
              content: "Du bist ein erfahrener Physiotherapeut, der medizinische Daten analysiert und fundierte, professionelle Empfehlungen gibt. Deine Antworten sollen gut strukturiert, fachlich korrekt und praxisorientiert sein."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.7  // Anpassen für mehr oder weniger kreative Antworten
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