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
  
      // Formatierung für die Anzeige - wir erstellen dies direkt
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
      
      // Nur die Empfehlung mit GPT erstellen
      const empfehlungPrompt = `
  Erstelle eine EXTREM KURZE Empfehlung (nur ein Satz!) für einen Physiotherapie-Abschlussbericht mit:
  
  Therapieziel: ${formData.goalText || "Nicht angegeben"}
  Hypothese: ${formData.hypothesisText || "Nicht angegeben"}
  ${formData.goal === 'nicht_erreicht' ? `Begründung: ${formData.reasonText || "Nicht angegeben"}` : ''}
  Ziel ${formData.goal === 'erreicht' ? 'erreicht' : 'nicht erreicht'}
  ${formData.goal === 'nicht_erreicht' ? `Compliance: ${formData.compliance === 'ja' ? 'Gut' : 'Unzureichend'}` : ''}
  
  Schreibe NUR EINEN EINZIGEN SATZ ohne Überschrift. Der Satz sollte mit "Weitere" oder einer ähnlichen Formulierung beginnen und eine klare Empfehlung enthalten. 
  
  Beispiel-Satz: "Weitere medizinische Abklärung sowie motivierende Gesprächsführung zur Steigerung der Therapiebereitschaft wird empfohlen."`;
      
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
              content: "Du bist ein Assistent mit der Aufgabe, extrem kurze, präzise Empfehlungen zu formulieren. Du darfst nur einen einzigen Satz als Antwort geben, ohne Einleitung oder Erklärung. Halte dich strikt an diese Vorgabe."
            },
            {
              role: "user",
              content: empfehlungPrompt
            }
          ],
          temperature: 0.1, // Sehr niedrige Temperatur für konsistentere Antworten
          max_tokens: 75    // Stark begrenzte Antwortlänge
        })
      });
  
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message || 'OpenAI API-Fehler');
      }
  
      // Extrahiere nur einen Satz aus der Antwort
      let empfehlung = data.choices[0].message.content.trim();
      
      // Entferne "Empfehlung:" oder ähnliche Überschriften, falls vorhanden
      empfehlung = empfehlung.replace(/^(Empfehlung:|\s*)/i, '');
      
      // Beschränke auf den ersten Satz, wenn mehrere vorhanden sind
      if (empfehlung.includes('.')) {
        empfehlung = empfehlung.split('.')[0] + '.';
      }
      
      // Füge die Empfehlung als letzten Abschnitt hinzu
      finalResponse += `\nEmpfehlung: ${empfehlung}`;
  
      res.status(200).json({ 
        result: finalResponse
      });
      
    } catch (error) {
      console.error('Fehler bei der Verarbeitung der Anfrage:', error);
      res.status(500).json({ error: error.message || 'Interner Serverfehler' });
    }
  }