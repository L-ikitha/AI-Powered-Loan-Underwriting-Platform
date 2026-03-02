import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
import pickle

# Sample dataset (replace with real dataset if available)
data = pd.DataFrame({
    'income': [30000, 50000, 70000, 20000, 80000],
    'credit_score': [600, 700, 750, 550, 800],
    'debt_to_income_ratio': [0.4, 0.3, 0.2, 0.5, 0.25],
    'approved': [0, 1, 1, 0, 1]
})

X = data[['income', 'credit_score', 'debt_to_income_ratio']]
y = data['approved']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

accuracy = model.score(X_test, y_test)
print(f"Model Accuracy: {accuracy * 100:.2f}%")

# Save model
pickle.dump(model, open('model/loan_model.pkl', 'wb'))
