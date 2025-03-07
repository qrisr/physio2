// Set current time when page loads
window.onload = function() {
    updateCurrentTime();
};

function updateCurrentTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    document.getElementById('time').value = `${hours}:${minutes}`;
}

function toggleFields() {
    const goalSelect = document.getElementById('goal');
    const reasonField = document.getElementById('reasonField');
    const complianceField = document.getElementById('complianceField');
    const goalIcon = document.getElementById('goalIcon');
    
    if (goalSelect.value === 'nicht_erreicht') {
        reasonField.style.display = 'block';
        complianceField.style.display = 'block';
        goalIcon.innerHTML = '🔴';
    } else if (goalSelect.value === 'erreicht') {
        reasonField.style.display = 'none';
        complianceField.style.display = 'none';
        goalIcon.innerHTML = '🟢';
    } else {
        reasonField.style.display = 'none';
        complianceField.style.display = 'none';
        goalIcon.innerHTML = '';
    }
}

function updateComplianceIcon() {
    const complianceSelect = document.getElementById('compliance');
    const complianceIcon = document.getElementById('complianceIcon');
    
    if (complianceSelect.value === 'ja') {
        complianceIcon.innerHTML = '🟢';
    } else if (complianceSelect.value === 'nein') {
        complianceIcon.innerHTML = '🔴';
    } else {
        complianceIcon.innerHTML = '';
    }
}

function resetForm() {
    document.getElementById('therapyForm').reset();
    document.getElementById('reasonField').style.display = 'none';
    document.getElementById('complianceField').style.display = 'none';
    document.getElementById('goalIcon').innerHTML = '';
    document.getElementById('complianceIcon').innerHTML = '';
    updateCurrentTime();
    
    // Auch den Response-Container zurücksetzen/ausblenden
    document.getElementById('response-container').style.display = 'none';
    document.getElementById('response-text').innerHTML = '';
}

// OpenAI API-Funktionen für die Kommunikation mit der Serverless-Funktion
async function callOpenAI(formData) {
    try {
        // Im lokalen Entwicklungsmodus passt du die URL an
        const apiUrl = window.location.hostname === 'localhost' 
            ? 'http://localhost:3000/api/openai' 
            : '/api/openai';
        
        console.log("🟡 Sende API-Anfrage an:", apiUrl);
        console.log("📨 Formulardaten:", JSON.stringify(formData));
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        console.log("🟠 API Antwort-Status:", response.status);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Fehler bei der API-Anfrage');
        }
        
        const data = await response.json();
        console.log("✅ Antwort von OpenAI API:", data);
        
        return data.result;
    } catch (error) {
        console.error('❌ Fehler beim Aufruf der OpenAI API:', error);
        throw error;
    }
}

// Simulation der Wort-für-Wort-Anzeige
function streamResponse(response, element) {
    const sentences = response.match(/[^.!?]+[.!?]+/g) || [response];
    let currentSentenceIndex = 0;
    
    function displayNextSentence() {
        if (currentSentenceIndex < sentences.length) {
            const sentence = sentences[currentSentenceIndex];
            const words = sentence.split(' ');
            let wordIndex = 0;
            
            function displayNextWord() {
                if (wordIndex < words.length) {
                    element.innerHTML += (wordIndex === 0 && currentSentenceIndex > 0 ? ' ' : wordIndex > 0 ? ' ' : '') + words[wordIndex];
                    wordIndex++;
                    setTimeout(displayNextWord, Math.floor(Math.random() * 40) + 30); // Variiert zwischen 30-70ms
                } else {
                    currentSentenceIndex++;
                    setTimeout(displayNextSentence, 200); // Kurze Pause zwischen Sätzen
                }
            }
            
            displayNextWord();
        }
    }
    
    displayNextSentence();
}

// Formular absenden
document.getElementById('therapyForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Formular-Daten sammeln
    const formData = {
        time: document.getElementById('time').value,
        goal: document.getElementById('goal').value,
        goalText: document.getElementById('goalText').value,
        hypothesisText: document.getElementById('hypothesisText').value
    };
    
    if (formData.goal === 'nicht_erreicht') {
        formData.compliance = document.getElementById('compliance').value;
        formData.reasonText = document.getElementById('reasonText').value;
    }
    
    // Aktiviere die Antwort-Container und zeige den Lade-Indikator
    const responseContainer = document.getElementById('response-container');
    const loadingIndicator = document.getElementById('loading-indicator');
    const responseText = document.getElementById('response-text');
    
    responseContainer.style.display = 'block';
    loadingIndicator.style.display = 'flex';
    responseText.innerHTML = '';
    
    // Scroll zum Response-Container
    responseContainer.scrollIntoView({ behavior: 'smooth' });
    
    // Mache API-Anfrage an OpenAI
    try {
        console.log("🚀 Sende Daten an OpenAI...");
        const response = await callOpenAI(formData);
        console.log("📥 Antwort erhalten:", response);
        
        streamResponse(response, responseText);
        loadingIndicator.style.display = 'none';
    } catch (error) {
        console.error("API-Fehler:", error);
        
        // Bei Fehler den Lade-Indikator ausblenden
        loadingIndicator.style.display = 'none';
    }
});