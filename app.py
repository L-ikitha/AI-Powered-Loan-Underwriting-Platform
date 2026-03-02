from flask import Flask, render_template, request, jsonify, session, redirect, url_for
import pickle, numpy as np

app = Flask(__name__)
app.secret_key = "loan-secret-key"   # Required to store data for result page

# Load ML model
model = pickle.load(open('model/loan_model.pkl', 'rb'))

# Explanation Function
def explain_decision(income, credit_score, dti, approved):
    reasons = []
    suggestions = []
    
    if credit_score < 600:
        reasons.append("Credit score is below 600.")
        suggestions.append("Improve credit score by paying bills on time for 3 months.")
    
    if dti > 0.4:
        reasons.append("Debt-to-income ratio is above 40 percent.")
        suggestions.append("Reduce existing EMIs or increase income to lower DTI.")
    
    if income < 25000:
        reasons.append("Income is below minimum threshold.")
        suggestions.append("Provide additional income proof or guarantor if available.")

    if approved:
        summary = "Loan approved "
    else:
        summary = "Loan not approved "
        if not reasons:
            reasons.append("Risk score from model is below the acceptance cut-off.")

    return {
        "summary": summary,
        "reasons": reasons,
        "suggestions": suggestions
    }

# Home Page
@app.route('/')
def home():
    return render_template('index.html')

#  Prediction API (Used by Voice + Form)
@app.route('/api/predict', methods=['POST'])
def api_predict():
    data = request.get_json()
    income = float(data['income'])
    credit_score = float(data['credit_score'])
    dti = float(data['debt_to_income_ratio'])
    
    X = np.array([[income, credit_score, dti]])
    y = int(model.predict(X)[0])
    conf = float(max(model.predict_proba(X)[0]) * 100)
    exp = explain_decision(income, credit_score, dti, y==1)

    # Store in session for /result page
    session["result"] = "Approved " if y == 1 else "Rejected "
    session["confidence"] = round(conf, 2)
    session["reasons"] = exp["reasons"]
    session["steps"] = exp["suggestions"]

    return jsonify({
        "approved": bool(y),
        "confidence": round(conf, 2),
        "explanation": exp
    })

#  Final Result Page
@app.route('/result')
def result_page():
    return render_template(
        'result.html',
        result=session.get("result"),
        confidence=session.get("confidence"),
        reasons=session.get("reasons"),
        steps=session.get("steps")
    )

#  Run Server
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
