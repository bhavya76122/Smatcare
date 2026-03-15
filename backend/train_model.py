import os
import pickle
import pandas as pd
from sklearn.ensemble import RandomForestClassifier

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(BASE_DIR, "dataset", "Training.csv")
MODEL_PATH = os.path.join(BASE_DIR, "model.pkl")
SYMPTOMS_PATH = os.path.join(BASE_DIR, "symptoms.pkl")

def main():
    df = pd.read_csv(DATASET_PATH)

    if "prognosis" not in df.columns:
        raise ValueError("Training.csv must contain a 'prognosis' column.")

    X = df.drop("prognosis", axis=1)
    y = df["prognosis"]

    model = RandomForestClassifier(
        n_estimators=300,
        random_state=42
    )
    model.fit(X, y)

    with open(MODEL_PATH, "wb") as f:
        pickle.dump(model, f)

    with open(SYMPTOMS_PATH, "wb") as f:
        pickle.dump(X.columns.tolist(), f)

    print("Model trained successfully.")
    print("Symptoms count:", len(X.columns))

if __name__ == "__main__":
    main()