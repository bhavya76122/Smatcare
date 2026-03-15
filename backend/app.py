import os
import pickle
import sqlite3
import smtplib
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from flask import Flask, request, jsonify
from flask_cors import CORS

from disease_info import DISEASE_INFO

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "healthcare.db")
MODEL_PATH = os.path.join(BASE_DIR, "model.pkl")
SYMPTOMS_PATH = os.path.join(BASE_DIR, "symptoms.pkl")


# ================= DATABASE =================

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


# ================= LOAD MODEL =================

with open(MODEL_PATH, "rb") as f:
    model = pickle.load(f)

with open(SYMPTOMS_PATH, "rb") as f:
    symptoms_list = pickle.load(f)


# ================= EMAIL FUNCTION =================

def send_email(patient_email, doctor_name, appointment_date, appointment_time):

    sender_email = "thatipallybhavya82@gmail.com"
    sender_password = "yzwrqbgcrtto trcp".replace(" ", "")

    subject = "SmartCare Appointment Confirmation"

    body = f"""
Hello,

Your appointment has been successfully booked.

Doctor: {doctor_name}
Date: {appointment_date}
Time: {appointment_time}

Thank you for using SmartCare Healthcare System.
"""

    msg = MIMEMultipart()
    msg["From"] = sender_email
    msg["To"] = patient_email
    msg["Subject"] = subject

    msg.attach(MIMEText(body, "plain"))

    try:
        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(sender_email, sender_password)
        server.send_message(msg)
        server.quit()

        print("Email sent successfully")

    except Exception as e:
        print("Email sending failed:", e)


# ================= HOME =================

@app.route("/")
def home():
    return jsonify({"message": "SmartCare Backend Running"})


# ================= SYMPTOMS =================

@app.route("/symptoms", methods=["GET"])
def get_symptoms():
    return jsonify({"symptoms": symptoms_list})


# ================= DISEASE PREDICTION =================

@app.route("/predict", methods=["POST"])
def predict():

    data = request.get_json()
    selected_symptoms = data.get("symptoms", [])

    input_vector = [0] * len(symptoms_list)

    for symptom in selected_symptoms:
        if symptom in symptoms_list:
            input_vector[symptoms_list.index(symptom)] = 1

    prediction = model.predict([input_vector])[0]

    advice = DISEASE_INFO.get(
        prediction,
        "Please consult a doctor for professional diagnosis."
    )

    return jsonify({
        "disease": prediction,
        "advice": advice,
        "selected_symptoms": selected_symptoms
    })


# ================= CREATE APPOINTMENT =================

@app.route("/appointments", methods=["POST"])
def create_appointment():

    data = request.get_json()

    patient_name = data.get("patient_name")
    patient_email = data.get("email")
    doctor_name = data.get("doctor_name")
    appointment_date = data.get("appointment_date")
    appointment_time = data.get("appointment_time")

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO appointments (patient_name, doctor_name, appointment_date, appointment_time)
        VALUES (?, ?, ?, ?)
    """, (patient_name, doctor_name, appointment_date, appointment_time))

    conn.commit()
    conn.close()

    send_email(patient_email, doctor_name, appointment_date, appointment_time)

    return jsonify({"message": "Appointment booked successfully"})


# ================= LIST APPOINTMENTS =================

@app.route("/appointments", methods=["GET"])
def list_appointments():

    conn = get_db()

    rows = conn.execute(
        "SELECT * FROM appointments ORDER BY id DESC"
    ).fetchall()

    conn.close()

    return jsonify({
        "appointments": [dict(r) for r in rows]
    })


# ================= SAVE RECORD =================

@app.route("/records", methods=["POST"])
def save_record():

    data = request.get_json()

    patient_id = data.get("patient_id")
    file_name = data.get("file_name")

    uploaded_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO records (patient_id, file_name, uploaded_at)
        VALUES (?, ?, ?)
    """, (patient_id, file_name, uploaded_at))

    conn.commit()
    conn.close()

    return jsonify({"message": "Record saved"})


# ================= LIST RECORDS =================

@app.route("/records", methods=["GET"])
def list_records():

    conn = get_db()

    rows = conn.execute(
        "SELECT * FROM records ORDER BY id DESC"
    ).fetchall()

    conn.close()

    return jsonify({
        "records": [dict(r) for r in rows]
    })


# ================= UPLOAD VITALS =================

@app.route("/vitals", methods=["POST"])
def upload_vitals():

    data = request.get_json()

    heart_rate = data.get("heart_rate")
    temperature = data.get("temperature")
    spo2 = data.get("spo2")

    uploaded_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO vitals (heart_rate, temperature, spo2, uploaded_at)
        VALUES (?, ?, ?, ?)
    """, (heart_rate, temperature, spo2, uploaded_at))

    conn.commit()
    conn.close()

    return jsonify({"message": "Vitals uploaded"})


# ================= LATEST VITALS =================

@app.route("/vitals/latest", methods=["GET"])
def latest_vitals():

    conn = get_db()

    row = conn.execute(
        "SELECT * FROM vitals ORDER BY id DESC LIMIT 1"
    ).fetchone()

    conn.close()

    if row is None:
        return jsonify({"vitals": None})

    return jsonify({"vitals": dict(row)})


# ================= RUN SERVER =================

if __name__ == "__main__":
    app.run(debug=True)