voiceActive = true;

const voiceBtn = document.getElementById('voiceStart');
const statusEl = document.getElementById('voiceStatus');
const langSel  = document.getElementById('lang');
const decisionBox = document.getElementById('decision');

const fields = [
  { id: 'amount',       ask: { 'en-IN': 'What loan amount do you want in rupees?', 'hi-IN': 'आप कितना लोन राशि चाहते हैं (रुपयों में)?' } },
  { id: 'income',       ask: { 'en-IN': 'What is your monthly income in rupees?',   'hi-IN': 'आपकी मासिक आय कितनी है (रुपयों में)?' } },
  { id: 'credit_score', ask: { 'en-IN': 'What is your credit score?',               'hi-IN': 'आपका क्रेडिट स्कोर कितना है?' } },
  { id: 'dti',          ask: { 'en-IN': 'What is your debt to income ratio? For example say 0.3 for 30 percent.', 'hi-IN': 'आपका डेट टू इनकम रेशियो कितना है? उदाहरण 0.3 बोले जो 30 प्रतिशत होता है।' } }
];

function speak(text, lang) {
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang || 'en-IN';
  u.rate = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

function listenOnce(lang) {
  return new Promise((resolve, reject) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return reject(new Error('SpeechRecognition not supported'));
    const rec = new SR();
    rec.lang = lang;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => resolve(e.results[0][0].transcript);
    rec.onerror = (e) => reject(e.error);
    rec.onend = () => {};
    rec.start();
  });
}

async function captureNumber(lang, prompt, parser='number') {
  speak(prompt, lang);
  statusEl.innerText = prompt;
  const raw = await listenOnce(lang);
  let val = raw;
  // Parse spoken numbers naively; user often says "twenty thousand"
  // For now, just strip non-numeric except dot
  if (parser === 'number') {
    const m = raw.replace(/[^0-9.]/g, '');
    val = m ? parseFloat(m) : NaN;
  }
  if (parser === 'ratio') {
    // If they say "30" assume 0.30
    const m = raw.replace(/[^0-9.]/g, '');
    if (!m) val = NaN;
    else {
      const n = parseFloat(m);
      val = n > 1 ? n/100 : n; // 30 -> 0.30
    }
  }
  return { raw, val };
}

async function runVoiceFlow() {
  const lang = langSel.value;
  try {
    decisionBox.style.display = 'none';
    // Ask step-by-step and fill inputs
    // amount
    let r = await captureNumber(lang, fields[0].ask[lang], 'number');
    document.getElementById(fields[0].id).value = isNaN(r.val) ? '' : r.val;

    // income
    r = await captureNumber(lang, fields[1].ask[lang], 'number');
    document.getElementById(fields[1].id).value = isNaN(r.val) ? '' : r.val;

    // credit score
    r = await captureNumber(lang, fields[2].ask[lang], 'number');
    document.getElementById(fields[2].id).value = isNaN(r.val) ? '' : r.val;

    // dti
    r = await captureNumber(lang, fields[3].ask[lang], 'ratio');
    document.getElementById(fields[3].id).value = isNaN(r.val) ? '' : r.val;

    // Call backend
    const payload = {
      income: parseFloat(document.getElementById('income').value),
      credit_score: parseFloat(document.getElementById('credit_score').value),
      debt_to_income_ratio: parseFloat(document.getElementById('dti').value || 0)
    };

    statusEl.innerText = lang === 'hi-IN' ? 'जांच कर रहा हूँ…' : 'Checking your eligibility…';
    const res = await fetch('/api/predict', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    // Show + speak decision
    const approved = data.approved;
    const conf = data.confidence;
    const exp = data.explanation;

    decisionBox.style.display = 'block';
    decisionBox.innerHTML = `
      <h3>${approved ? 'Approved ✅' : 'Not Approved ❌'}</h3>
      <p><b>Confidence:</b> ${conf}%</p>
      <p><b>Reasons:</b> ${exp.reasons.length ? exp.reasons.join('; ') : '—'}</p>
      <p><b>Next steps:</b> ${exp.suggestions.length ? exp.suggestions.join('; ') : '—'}</p>
    `;

    const speakTextEN = approved
      ? `Loan approved. Confidence ${conf} percent. ${exp.reasons.join('. ')}`
      : `Loan not approved currently. ${exp.reasons.join('. ')}. Suggested next steps: ${exp.suggestions.join('. ')}`;

    const speakTextHI = approved
      ? `लोन स्वीकृत है। भरोसा ${conf} प्रतिशत। ${exp.reasons.join('। ')}`
      : `अभी लोन स्वीकृत नहीं है। कारण: ${exp.reasons.join('। ')}। अगला कदम: ${exp.suggestions.join('। ')}`;

    speak(lang === 'hi-IN' ? speakTextHI : speakTextEN, lang);
    statusEl.innerText = lang === 'hi-IN' ? 'पूर्ण हुआ' : 'Done';
  } catch (err) {
    console.error(err);
    speak(langSel.value === 'hi-IN' ? 'माफ कीजिए, आवाज़ मान्यता में समस्या आई।' : 'Sorry, voice recognition failed.');
    statusEl.innerText = 'Voice error: ' + err;
  }
}

voiceBtn.addEventListener('click', runVoiceFlow);

voiceActive = false;
