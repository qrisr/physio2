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
  
      // Der gewünschte Prompt mit den vorhandenen Platzhaltern
      const prompt = `Erstelle einen physiotherapeutischen Abschlussbericht basierend auf den folgenden Eingaben:
  • **Therapieziel:** ${formData.goalText || "Nicht angegeben"}
  • **Hypothese:** ${formData.hypothesisText || "Nicht angegeben"}
  ${formData.goal === 'nicht_erreicht' ? `• **Begründung für Nicht-Erreichung:** ${formData.reasonText || "Nicht angegeben"}` : ''}
  • **Therapieverlauf:**
  • **Therapieziel:** ${formData.goal === 'erreicht' ? 'erreicht 🟢' : 'nicht erreicht 🔴'}
  ${formData.goal === 'nicht_erreicht' ? `• **Compliance:** ${formData.compliance === 'ja' ? 'Gut 🟢' : 'Unzureichend 🔴'}
  • **Ursache:** ${formData.reasonText || "Nicht angegeben"}` : ''}
  
  Formuliere einen kurzen Bericht, der genau folgendem Muster entspricht. Halte deine Antwort extrem kurz, objektiv und auf einen einzigen Satz beschränkt. Beziehe dich konkret auf die genannten Erkenntnisse und mache eine einzige klare Empfehlung.
  
  **Beispiel:**
  Eingaben:
  • **Therapieziel:** Wiederaufnahme Fahrradfahren
  • **Hypothese:** Degenerative Veränderungen im Kniegelenk mit Schmerzen und Bewegungseinschränkungen
  • **Begründung für Nicht-Erreichung:** Patient hat zusätzliche Erkrankung, die ihn an der Therapie hindert
  • **Therapieverlauf:**
  • **Therapieziel:** nicht erreicht 🔴
  • **Compliance:** Unzureichend 🔴
  • **Ursache:** Mangelnde Motivation, Faulheit
  
  **Erwartetes Resultat:**
  Der Patient hat das Therapieziel nicht erreicht aufgrund mangelnder Motivation und zusätzlicher Erkrankungen; eine weitere medizinische Abklärung sowie motivierende Gesprächsführung zur Steigerung der Therapiebereitschaft wird empfohlen.`;
  
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
          model: "gpt-3.5-turbo", // Günstigeres Modell
          messages: [
            {
              role: "system",
              content: "Du bist ein präziser physiotherapeutischer Assistent, der professionelle Abschlussberichte verfasst. Halte deine Antwort extrem kurz, objektiv und auf einen einzigen Satz beschränkt. Beziehe dich konkret auf die genannten Erkenntnisse und mache eine einzige klare Empfehlung."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.3, // Niedrigere Temperatur für konsistentere Antworten
          max_tokens: 150   // Begrenzt die Antwortlänge
        })
      });
  
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message || 'OpenAI API-Fehler');
      }
  
      // Formatierung für die Anzeige
      let finalResponse = '';
  
      // Erste Zeilen (Therapieziel und Hypothese)
      finalResponse += `Therapieziel: ${formData.goalText || "Nicht angegeben"}\n`;
      finalResponse += `Hypothese: ${formData.hypothesisText || "Nicht angegeben"}\n\n`;
      
      // Therapieverlauf-Abschnitt
      finalResponse += `Therapieverlauf:\n`;
      finalResponse += `- ${formData.goal === 'erreicht' ? '🟢 Therapieziel erreicht' : '🔴 Therapieziel nicht erreicht'}\n`;
      
      if (formData.goal === 'nicht_erreicht') {
        finalResponse += `- Compliance: ${formData.compliance === 'ja' ? '🟢 Gut' : '🔴 Unzureichend'}\n`;
        finalResponse += `- Ursache: ${formData.reasonText || "Nicht angegeben"}\n`;
      }
      
      // Füge die Empfehlung als letzten Abschnitt hinzu
      finalResponse += `\nEmpfehlung: ${data.choices[0].message.content.trim()}`;
  
      res.status(200).json({ 
        result: finalResponse
      });
      
    } catch (error) {
      console.error('Fehler bei der Verarbeitung der Anfrage:', error);
      res.status(500).json({ error: error.message || 'Interner Serverfehler' });
    }
  }