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


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


with open(MODEL_PATH, "rb") as f:
    model = pickle.load(f)

with open(SYMPTOMS_PATH, "rb") as f:
    symptoms_list = pickle.load(f)

def send_appointment_email(patient_email, patient_name, hospital_name, appointment_date, appointment_time):

    sender_email = "thatipallybhavya82@gmail.com"
    sender_password = "epmmwvcgcuruglwh"

    subject = "Appointment Confirmation - SmartCare"

    body = f"""
Hello {patient_name},

Your appointment has been successfully booked.

Hospital: {hospital_name}
Date: {appointment_date}
Time: {appointment_time}

Please arrive 10 minutes early.

Thank you,
SmartCare Team
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
        server.sendmail(sender_email, patient_email, msg.as_string())
        server.quit()
        print("Email sent successfully")

    except Exception as e:
        print("Email sending failed:", e)


@app.route("/")
def home():
    return jsonify({"message": "SmartCare Backend Running"})


@app.route("/register", methods=["POST","OPTIONS"])
def register():

    if request.method == "OPTIONS":
        return jsonify({"message":"OK"}),200

    data = request.get_json()

    username = data.get("username","").strip()
    password = data.get("password","").strip()

    if not username or not password:
        return jsonify({"success":False,"message":"Username and password required"}),400

    conn = get_db()

    existing = conn.execute(
        "SELECT id FROM users WHERE username=?",
        (username,)
    ).fetchone()

    if existing:
        conn.close()
        return jsonify({"success":False,"message":"Username already exists"}),400

    conn.execute(
        "INSERT INTO users (username,password) VALUES (?,?)",
        (username,password)
    )

    conn.commit()
    conn.close()

    return jsonify({
        "success":True,
        "message":"Registration successful"
    })


@app.route("/login", methods=["POST","OPTIONS"])
def login():

    if request.method == "OPTIONS":
        return jsonify({"message":"OK"}),200

    data = request.get_json()

    username = data.get("username","").strip()
    password = data.get("password","").strip()

    conn = get_db()

    user = conn.execute(
        "SELECT * FROM users WHERE username=? AND password=?",
        (username,password)
    ).fetchone()

    conn.close()

    if user:
        return jsonify({
            "success":True,
            "message":"Login successful",
            "user_id":user["id"],
            "username":user["username"]
        })

    return jsonify({
        "success":False,
        "message":"Invalid username or password"
    }),401


@app.route("/symptoms", methods=["GET"])
def get_symptoms():
    return jsonify({"symptoms": symptoms_list})


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

@app.route("/appointments", methods=["POST"])
def create_appointment():
    data = request.get_json()

    user_id = data.get("user_id")
    patient_name = data.get("patient_name")
    email = data.get("email")
    doctor_name = data.get("doctor_name")
    appointment_date = data.get("appointment_date")
    appointment_time = data.get("appointment_time")

    if not user_id or not patient_name or not doctor_name:
        return jsonify({"message": "Missing data"}), 400

    conn = sqlite3.connect("healthcare.db")
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO appointments 
        (user_id, patient_name, doctor_name, appointment_date, appointment_time)
        VALUES (?, ?, ?, ?, ?)
    """, (user_id, patient_name, doctor_name, appointment_date, appointment_time))

    conn.commit()
    send_appointment_email(email, patient_name, hospital_name, appointment_date, appointment_time)
    conn.close()

    return jsonify({"message": "Appointment booked successfully"})


@app.route("/appointments/<int:user_id>", methods=["GET"])
def list_appointments(user_id):
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM appointments WHERE user_id = ? ORDER BY id DESC",
        (user_id,)
    ).fetchall()
    conn.close()

    return jsonify({
        "appointments": [dict(r) for r in rows]
    })


@app.route("/records", methods=["POST"])
def save_record():
    data = request.get_json()

    user_id = data.get("user_id")
    patient_id = data.get("patient_id")
    file_name = data.get("file_name")

    if not user_id or not patient_id or not file_name:
        return jsonify({"error": "user_id, patient_id and file_name are required"}), 400

    uploaded_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO records (user_id, patient_id, file_name, uploaded_at)
        VALUES (?, ?, ?, ?)
    """, (user_id, patient_id, file_name, uploaded_at))
    conn.commit()
    conn.close()

    return jsonify({"message": "Record saved"})


@app.route("/records/<int:user_id>", methods=["GET"])
def list_records(user_id):
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM records WHERE user_id = ? ORDER BY id DESC",
        (user_id,)
    ).fetchall()
    conn.close()

    return jsonify({
        "records": [dict(r) for r in rows]
    })


@app.route("/vitals", methods=["POST"])
def upload_vitals():
    data = request.get_json()

    user_id = data.get("user_id")
    heart_rate = data.get("heart_rate")
    temperature = data.get("temperature")
    spo2 = data.get("spo2")
    uploaded_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    if not user_id:
        return jsonify({"message": "user_id is required"}), 400

    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO vitals (user_id, heart_rate, temperature, spo2, uploaded_at)
        VALUES (?, ?, ?, ?, ?)
    """, (user_id, heart_rate, temperature, spo2, uploaded_at))
    conn.commit()
    conn.close()

    return jsonify({"message": "Vitals uploaded"})


@app.route("/vitals/latest/<int:user_id>", methods=["GET"])
def latest_vitals(user_id):
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM vitals WHERE user_id = ? ORDER BY id DESC LIMIT 1",
        (user_id,)
    ).fetchone()
    conn.close()

    if row is None:
        return jsonify({"vitals": None})

    return jsonify({"vitals": dict(row)})


if __name__ == "__main__":
    app.run(debug=True)