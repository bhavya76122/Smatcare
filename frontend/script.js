const API_BASE = "http://127.0.0.1:5000";

AOS.init({
  duration: 900,
  once: true
});

(function checkAuth() {
  const currentPage = window.location.pathname.split("/").pop();
  if (currentPage === "index.html" || currentPage === "") {
    const isLoggedIn = localStorage.getItem("smartcare_logged_in");
    if (isLoggedIn !== "true") {
      window.location.href = "login.html";
    }
  }
})();

function logoutUser() {
  localStorage.removeItem("smartcare_logged_in");
  localStorage.removeItem("user_id");
  localStorage.removeItem("username");
  window.location.href = "login.html";
}

function getUserId() {
  return localStorage.getItem("user_id");
}

async function loadSymptoms() {
  try {
    const response = await fetch(`${API_BASE}/symptoms`);
    if (!response.ok) throw new Error("Backend not reachable");

    const data = await response.json();
    const select = document.getElementById("symptomSelect");

    if (!select) return;

    select.innerHTML = "";

    data.symptoms.forEach(symptom => {
      const option = document.createElement("option");
      option.value = symptom;
      option.textContent = symptom.replace(/_/g, " ");
      select.appendChild(option);
    });
  } catch (error) {
    console.error("Error loading symptoms:", error);
    const result = document.getElementById("predictionResult");
    if (result) {
      result.innerHTML = "Unable to load symptoms. Check backend server.";
    }
  }
}

function clearSymptoms() {
  const select = document.getElementById("symptomSelect");
  if (!select) return;

  for (let option of select.options) {
    option.selected = false;
  }
}

async function predictDisease() {
  const select = document.getElementById("symptomSelect");
  const selected = [];

  if (!select) return;

  for (let option of select.options) {
    if (option.selected) {
      selected.push(option.value);
    }
  }

  if (selected.length === 0) {
    document.getElementById("predictionResult").innerHTML = "Please select at least one symptom.";
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/predict`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ symptoms: selected })
    });

    const data = await response.json();

    document.getElementById("predictionResult").innerHTML = `
      <strong>Predicted Disease:</strong> ${data.disease}<br>
      <strong>Advice:</strong> ${data.advice}<br>
      <strong>Selected Symptoms:</strong> ${data.selected_symptoms.join(", ")}
    `;
  } catch (error) {
    document.getElementById("predictionResult").innerHTML = "Prediction failed. Check backend connection.";
  }
}

function calculateBMI() {
  const height = parseFloat(document.getElementById("height").value);
  const weight = parseFloat(document.getElementById("weight").value);
  const result = document.getElementById("bmiResult");

  if (!height || !weight || height <= 0 || weight <= 0) {
    result.innerHTML = "Please enter valid height and weight.";
    return;
  }

  const h = height / 100;
  const bmi = weight / (h * h);

  let category = "";
  if (bmi < 18.5) category = "Underweight";
  else if (bmi < 25) category = "Normal";
  else if (bmi < 30) category = "Overweight";
  else category = "Obese";

  result.innerHTML = `Your BMI is <strong>${bmi.toFixed(2)}</strong> — <strong>${category}</strong>`;
}

function checkHealthStatus() {
  const heartRate = parseInt(document.getElementById("heartRate").value);
  const bp = document.getElementById("bp").value.trim();
  const sugar = parseInt(document.getElementById("sugar").value);
  const result = document.getElementById("healthStatusResult");

  if (!heartRate || !bp || !sugar) {
    result.innerHTML = "Please fill all values.";
    return;
  }

  let messages = [];
  let critical = false;

  if (heartRate > 100) {
    messages.push("High heart rate detected.");
    critical = true;
  } else if (heartRate < 60) {
    messages.push("Low heart rate detected.");
  } else {
    messages.push("Heart rate looks normal.");
  }

  const bpParts = bp.split("/");
  if (bpParts.length === 2) {
    const systolic = parseInt(bpParts[0]);
    const diastolic = parseInt(bpParts[1]);

    if (systolic > 140 || diastolic > 90) {
      messages.push("Blood pressure is high.");
      critical = true;
    } else if (systolic < 90 || diastolic < 60) {
      messages.push("Blood pressure is low.");
    } else {
      messages.push("Blood pressure is normal.");
    }
  } else {
    messages.push("Blood pressure format should be like 120/80.");
  }

  if (sugar > 140) {
    messages.push("Blood sugar is above normal.");
    critical = true;
  } else if (sugar < 70) {
    messages.push("Blood sugar is low.");
  } else {
    messages.push("Blood sugar is normal.");
  }

  if (critical) {
    messages.push("Please consult a doctor soon.");
  } else {
    messages.push("Overall condition looks stable.");
  }

  result.innerHTML = messages.join("<br>");
}

async function bookAppointment() {

    const patient_name = document.getElementById("patientName").value;
    const email = document.getElementById("email").value;
    const hospital = document.getElementById("hospital").value;
    const date = document.getElementById("date").value;
    const time = document.getElementById("time").value;

    const user_id = localStorage.getItem("user_id");

    const response = await fetch("http://127.0.0.1:5000/appointments", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            user_id: user_id,
            patient_name: patient_name,
            email: email,
            hospital_name: hospital,
            appointment_date: date,
            appointment_time: time
        })
    });

    const data = await response.json();

    document.getElementById("bookingResult").innerText = data.message;
}

async function loadAppointments() {
  try {
    const userId = getUserId();
    const response = await fetch(`${API_BASE}/appointments/${userId}`);
    const data = await response.json();

    const list = document.getElementById("appointmentList");
    if (!list) return;

    list.innerHTML = "";

    if (!data.appointments || data.appointments.length === 0) {
      list.innerHTML = "<li>No appointments booked yet.</li>";
      return;
    }

    data.appointments.forEach(item => {
      const li = document.createElement("li");
      li.innerHTML = `
        <strong>${item.patient_name}</strong> — ${item.doctor_name}<br>
        ${item.appointment_date} | ${item.appointment_time}
      `;
      list.appendChild(li);
    });
  } catch (error) {
    console.error(error);
  }
}

async function saveRecord() {
  const userId = getUserId();
  const patientId = document.getElementById("patientId").value.trim();
  const fileInput = document.getElementById("recordFile");

  if (!patientId || fileInput.files.length === 0) {
    document.getElementById("recordResult").innerHTML = "Please enter patient ID and choose a file.";
    return;
  }

  const fileName = fileInput.files[0].name;

  try {
    const response = await fetch(`${API_BASE}/records`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        user_id: userId,
        patient_id: patientId,
        file_name: fileName
      })
    });

    const data = await response.json();
    document.getElementById("recordResult").innerHTML = data.message || "Record saved.";
    loadRecords();
  } catch (error) {
    document.getElementById("recordResult").innerHTML = "Saving record failed.";
  }
}

async function loadRecords() {
  try {
    const userId = getUserId();
    const response = await fetch(`${API_BASE}/records/${userId}`);
    const data = await response.json();

    const list = document.getElementById("recordList");
    if (!list) return;

    list.innerHTML = "";

    if (!data.records || data.records.length === 0) {
      list.innerHTML = "<li>No records saved yet.</li>";
      return;
    }

    data.records.forEach(record => {
      const li = document.createElement("li");
      li.innerHTML = `
        <strong>Patient ID:</strong> ${record.patient_id}<br>
        <strong>File:</strong> ${record.file_name}<br>
        <strong>Uploaded At:</strong> ${record.uploaded_at}
      `;
      list.appendChild(li);
    });
  } catch (error) {
    console.error(error);
  }
}

const reminderKey = () => `smartcare_reminders_${getUserId()}`;
let reminders = JSON.parse(localStorage.getItem(reminderKey())) || [];

if ("Notification" in window) {
  Notification.requestPermission();
}

function addMedicineReminder() {
  const medicine = document.getElementById("medicineName").value;
  const time = document.getElementById("medicineTime").value;

  if (!medicine || !time) {
    document.getElementById("reminderResult").innerHTML = "Please enter medicine and time";
    return;
  }

  const reminder = {
    medicine: medicine,
    time: time,
    taken: false
  };

  reminders.push(reminder);
  localStorage.setItem(reminderKey(), JSON.stringify(reminders));

  document.getElementById("reminderResult").innerHTML = "Reminder added successfully";
  document.getElementById("medicineName").value = "";
  document.getElementById("medicineTime").value = "";

  loadReminders();
}

function loadReminders() {
  reminders = JSON.parse(localStorage.getItem(reminderKey())) || [];
  const list = document.getElementById("reminderList");
  if (!list) return;

  list.innerHTML = "";

  reminders.forEach((r, index) => {
    let status = r.taken ? "✔ Taken" : "⏰ Pending";

    let li = document.createElement("li");
    li.innerHTML = `
      <strong>${r.medicine}</strong> - ${r.time}
      <br>
      Status: ${status}
      <br>
      <button onclick="markAsTaken(${index})">Mark as Taken</button>
    `;
    list.appendChild(li);
  });
}

function markAsTaken(index) {
  reminders[index].taken = true;
  localStorage.setItem(reminderKey(), JSON.stringify(reminders));
  loadReminders();
}

function speakReminder(medicine) {
  let msg = new SpeechSynthesisUtterance("Time to take " + medicine);
  speechSynthesis.speak(msg);
}

function showNotification(medicine) {
  if (!("Notification" in window)) return;

  if (Notification.permission === "granted") {
    navigator.serviceWorker.getRegistration().then(function(reg) {
      if (reg) {
        reg.showNotification("SmartCare Medicine Reminder", {
          body: "Time to take " + medicine,
          icon: "https://cdn-icons-png.flaticon.com/512/2966/2966489.png",
          vibrate: [200, 100, 200],
          tag: "medicine-reminder"
        });
      } else {
        new Notification("SmartCare Medicine Reminder", {
          body: "Time to take " + medicine,
          icon: "https://cdn-icons-png.flaticon.com/512/2966/2966489.png"
        });
      }
    });
  }
}

setInterval(() => {
  let now = new Date();
  let currentTime =
    String(now.getHours()).padStart(2, "0") + ":" +
    String(now.getMinutes()).padStart(2, "0");

  reminders.forEach(r => {
    if (r.time === currentTime && !r.taken) {
      showNotification(r.medicine);
      speakReminder(r.medicine);
    }
  });
}, 60000);

function getBotReply(input) {
  if (input.includes("fever")) return "Fever may indicate infection. Rest and drink enough fluids.";
  if (input.includes("cough")) return "Cough may be due to cold, allergy, or infection.";
  if (input.includes("bp") || input.includes("blood pressure")) return "Normal blood pressure is usually around 120/80.";
  if (input.includes("sugar") || input.includes("diabetes")) return "Regular sugar monitoring and diet control are important.";
  if (input.includes("diet")) return "A healthy diet includes fruits, vegetables, protein, and enough water.";
  if (input.includes("water") || input.includes("hydration")) return "Hydration supports body temperature and recovery.";
  if (input.includes("emergency")) return "For chest pain, breathing trouble, or fainting, seek urgent care immediately.";
  if (input.includes("hello") || input.includes("hi")) return "Hello. How can I help you today?";
  return "I can help with fever, cough, BP, sugar, diet, hydration, and emergency guidance.";
}

function sendMessage() {
  const chatInput = document.getElementById("chatInput");
  const chatBox = document.getElementById("chatBox");
  const text = chatInput.value.trim();

  if (!text) return;

  const userMsg = document.createElement("div");
  userMsg.className = "user-msg";
  userMsg.textContent = text;
  chatBox.appendChild(userMsg);

  const reply = getBotReply(text.toLowerCase());

  const botMsg = document.createElement("div");
  botMsg.className = "bot-msg";
  botMsg.textContent = reply;

  setTimeout(() => {
    chatBox.appendChild(botMsg);
    chatBox.scrollTop = chatBox.scrollHeight;
  }, 300);

  chatInput.value = "";
}

document.addEventListener("DOMContentLoaded", () => {
  const chatInput = document.getElementById("chatInput");
  if (chatInput) {
    chatInput.addEventListener("keypress", function(e) {
      if (e.key === "Enter") sendMessage();
    });
  }
});

function startVoiceInput() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert("Speech recognition is not supported in this browser.");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";

  recognition.onresult = function(event) {
    const transcript = event.results[0][0].transcript.toLowerCase();
    const select = document.getElementById("symptomSelect");

    for (let option of select.options) {
      const value = option.value.replaceAll("_", " ").toLowerCase();
      if (transcript.includes(value)) {
        option.selected = true;
      }
    }

    alert("Voice input processed. Matching symptoms selected.");
  };

  recognition.start();
}

function simulateEmergency() {
  const msgs = [
    "Emergency alert: Abnormal vital signs detected. Immediate consultation advised.",
    "Emergency alert: Possible critical condition. Please visit the nearest hospital.",
    "Emergency alert: Vital readings indicate risk. Seek urgent medical support.",
    "Emergency alert: Please contact healthcare services immediately."
  ];

  const msg = msgs[Math.floor(Math.random() * msgs.length)];
  document.getElementById("emergencyResult").innerHTML = msg;
}

function initCharts() {
  const heartCtx = document.getElementById("heartChart");
  const sugarCtx = document.getElementById("sugarChart");

  if (heartCtx) {
    new Chart(heartCtx, {
      type: "line",
      data: {
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        datasets: [{
          label: "Heart Rate",
          data: [72, 78, 75, 82, 76, 74, 79],
          borderWidth: 3,
          tension: 0.4,
          fill: true
        }]
      },
      options: { responsive: true }
    });
  }

  if (sugarCtx) {
    new Chart(sugarCtx, {
      type: "bar",
      data: {
        labels: ["Morning", "Afternoon", "Evening", "Night"],
        datasets: [{
          label: "Blood Sugar",
          data: [98, 120, 110, 102],
          borderWidth: 1
        }]
      },
      options: { responsive: true }
    });
  }
}

async function loadLatestVitals() {
  try {
    const userId = getUserId();
    const response = await fetch(`${API_BASE}/vitals/latest/${userId}`);
    const data = await response.json();

    const box = document.getElementById("latestVitals");
    if (!box) return;

    if (!data.vitals) {
      box.innerHTML = "No vitals received yet.";
      return;
    }

    box.innerHTML = `
      <strong>Heart Rate:</strong> ${data.vitals.heart_rate ?? "-"}<br>
      <strong>Temperature:</strong> ${data.vitals.temperature ?? "-"} °C<br>
      <strong>SpO2:</strong> ${data.vitals.spo2 ?? "-"} %<br>
      <strong>Uploaded At:</strong> ${data.vitals.uploaded_at}
    `;
  } catch (error) {
    console.error(error);
  }
}

let mapInstance = null;

async function loadNearbyHospitals() {
  const hospitalList = document.getElementById("hospitalList");
  const hospitalSelect = document.getElementById("hospitalSelect");

  if (!hospitalList) return;

  hospitalList.innerHTML = "Getting your location...";

  if (hospitalSelect) {
    hospitalSelect.innerHTML = `<option value="">Select hospital from map</option>`;
  }

  if (!navigator.geolocation) {
    hospitalList.innerHTML = "Geolocation not supported.";
    return;
  }

  navigator.geolocation.getCurrentPosition(async (position) => {

    const lat = position.coords.latitude;
    const lon = position.coords.longitude;

    hospitalList.innerHTML = "Searching nearby hospitals...";

    if (mapInstance) {
      mapInstance.remove();
    }

    mapInstance = L.map("map").setView([lat, lon], 14);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap"
    }).addTo(mapInstance);

    L.marker([lat, lon])
      .addTo(mapInstance)
      .bindPopup("Your Location")
      .openPopup();

    const query = `
      [out:json];
      (
        node["amenity"="hospital"](around:5000,${lat},${lon});
        node["amenity"="clinic"](around:5000,${lat},${lon});
      );
      out;
    `;

    try {

      const response = await fetch(
        "https://overpass-api.de/api/interpreter",
        { method: "POST", body: query }
      );

      const data = await response.json();

      if (!data.elements || data.elements.length === 0) {
        hospitalList.innerHTML = "No nearby hospitals found.";
        return;
      }

      hospitalList.innerHTML = "<strong>Nearby Hospitals:</strong><br><br>";

      if (hospitalSelect) {
        hospitalSelect.innerHTML = `<option value="">Select hospital from map</option>`;
      }

      data.elements.forEach((hospital, index) => {

        const name = hospital.tags?.name || "Hospital";

        const address =
          hospital.tags?.["addr:street"] ||
          hospital.tags?.["addr:full"] ||
          "Location available on map";

        const hLat = hospital.lat;
        const hLon = hospital.lon;

        const distance = getDistance(lat, lon, hLat, hLon).toFixed(2);

        L.marker([hLat, hLon])
          .addTo(mapInstance)
          .bindPopup(`
            <b>${name}</b><br>
            Distance: ${distance} km<br>
            <a href="https://www.google.com/maps/dir/?api=1&destination=${hLat},${hLon}" target="_blank">
Open in Google Maps
</a>
          `);

        if (hospitalSelect) {
          const option = document.createElement("option");
          option.value = name;
          option.textContent = `${name} (${distance} km)`;
          hospitalSelect.appendChild(option);
        }

        hospitalList.innerHTML += `
          <div style="margin-bottom:12px;">
            <strong>${index + 1}. ${name}</strong><br>
            📍 ${address}<br>
            📏 Distance: ${distance} km<br>
            🗺 <a href="https://www.google.com/maps?q=${hLat},${hLon}" target="_blank">
            View Location
            </a>
          </div>
        `;

      });

    } catch (error) {
      hospitalList.innerHTML = "Failed to fetch hospitals.";
      console.error(error);
    }

  }, () => {
    hospitalList.innerHTML = "Location permission denied.";
  });
}

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;

  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

window.addEventListener("DOMContentLoaded", () => {
  loadSymptoms();
  loadAppointments();
  loadRecords();
  loadLatestVitals();
  loadReminders();
  initCharts();
});