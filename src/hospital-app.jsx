import { useState, useEffect } from "react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const genId = () => "MED-" + Math.floor(10000 + Math.random() * 90000);
const genRxId = () => "RX-" + Date.now().toString(36).toUpperCase();
const genApId = () => "APT-" + Date.now().toString(36).toUpperCase();
const genLabId = () => "LAB-" + Date.now().toString(36).toUpperCase();
const genDrId = () => "DR-" + Date.now().toString(36).toUpperCase();

const fmt = (iso) => iso ? new Date(iso).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" }) : "—";
const fmtT = (iso) => iso ? new Date(iso).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" }) : "—";
const fmtDT = (iso) => iso ? `${fmt(iso)}, ${fmtT(iso)}` : "—";
const today = () => new Date().toISOString().slice(0, 10);

const PATIENTS_KEY = "hms_patients_v3";
const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const genders = ["Male", "Female", "Other"];
const specialties = [
  "General Physician", "Family Medicine", "Internal Medicine",
  "General Surgeon", "Cardiothoracic Surgeon", "Neurosurgeon", "Orthopedic Surgeon",
  "Plastic & Reconstructive Surgeon", "Vascular Surgeon", "Pediatric Surgeon", "Urological Surgeon",
  "Cardiologist", "Neurologist", "Gastroenterologist", "Endocrinologist", "Nephrologist",
  "Rheumatologist", "Hematologist", "Oncologist", "Pulmonologist", "Infectious Disease Specialist",
  "Immunologist", "Hepatologist", "Diabetologist",
  "Gynecologist", "Obstetrician", "Gynecologist & Obstetrician (OB-GYN)", "Reproductive Endocrinologist",
  "Maternal-Fetal Medicine", "Fertility Specialist", "Breast Surgeon",
  "Pediatrician", "Neonatologist", "Pediatric Cardiologist", "Pediatric Neurologist",
  "Pediatric Oncologist", "Pediatric Endocrinologist", "Child & Adolescent Psychiatrist",
  "Psychiatrist", "Clinical Psychologist", "Neuropsychiatrist", "Addiction Medicine Specialist",
  "Ophthalmologist", "ENT Specialist (Otolaryngologist)", "Audiologist", "Maxillofacial Surgeon",
  "Dentist", "Orthodontist", "Oral Surgeon",
  "Dermatologist", "Rheumatologist / Arthritis Specialist", "Orthopedic", "Sports Medicine Specialist",
  "Physiotherapist", "Chiropractor",
  "Medical Oncologist", "Radiation Oncologist", "Surgical Oncologist", "Hematologist-Oncologist",
  "Radiologist", "Interventional Radiologist", "Pathologist", "Nuclear Medicine Specialist",
  "Emergency Medicine Specialist", "Critical Care / Intensivist", "Anesthesiologist", "Pain Management Specialist",
  "Geriatrician", "Palliative Care Specialist", "Sleep Medicine Specialist", "Occupational Medicine",
  "Dietitian / Nutritionist", "Other (type below)",
];
const apptTypes = ["General Checkup", "Follow-up", "Lab Review", "Emergency", "Specialist Referral", "Vaccination", "Procedure", "Other"];

// ─── Storage ──────────────────────────────────────────────────────────────────
async function loadAll() {
  try { const r = await window.storage.get(PATIENTS_KEY); return r ? JSON.parse(r.value) : {}; }
  catch { return {}; }
}
async function saveAll(data) {
  try { await window.storage.set(PATIENTS_KEY, JSON.stringify(data)); } catch { }
}
const mkSMS = async (to, message) => {
  const log = { id: "SMS-" + Date.now(), to, message, sentAt: new Date().toISOString(), status: "sending" };
  try {
    const res = await fetch("/api/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, message })
    });
    const data = await res.json();
    const status = data.success ? `sent (${data.status || "ok"})` : "failed";
    return { ...log, status, telnyxId: data.id, error: data.error };
  } catch (e) {
    return { ...log, status: "failed", error: e.message };
  }
};

// ─── Print Prescription ───────────────────────────────────────────────────────
function PrintSlip({ p, rx, dr, hxEntry, onClose }) {
  const handlePrint = () => window.print();

  const medicines = rx?.medicines || [];
  const diagnosis = rx?.diagnosis || hxEntry?.diagnosis || "";
  const complaints = hxEntry?.complaints || rx?.instructions || "";
  const examination = hxEntry?.examination || "";
  const plan = hxEntry?.plan || "";
  const investigations = hxEntry?.examination || "";

  return (
    <>
      {/* Print-only styles injected into head */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-slip, #print-slip * { visibility: visible !important; }
          #print-slip { 
            position: fixed !important; 
            inset: 0 !important; 
            z-index: 99999 !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Modal overlay */}
      <div style={PS.overlay} className="no-print-bg">
        <div style={PS.modal}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }} className="no-print">
            <div style={{ fontSize:16, fontWeight:700, color:"#dce8ef" }}>🖨 Print Preview</div>
            <div style={{ display:"flex", gap:10 }}>
              <button style={R.primaryBtn} onClick={handlePrint}>🖨 Print</button>
              <button style={R.ghostBtn} onClick={onClose}>✕ Close</button>
            </div>
          </div>

          {/* THE ACTUAL SLIP */}
          <div id="print-slip" style={PS.slip}>

            {/* Header */}
            <div style={PS.header}>
              <div style={PS.headerLeft}>
                <div style={PS.hospitalName}>MediTrack</div>
                <div style={PS.hospitalSub}>Patient Management System</div>
              </div>
              <div style={PS.headerRight}>
                <div style={PS.slipTitle}>PRESCRIPTION SLIP</div>
                <div style={PS.slipDate}>Date: {fmt(new Date().toISOString())}</div>
                {rx && <div style={PS.slipId}>Rx ID: {rx.id}</div>}
              </div>
            </div>

            <div style={PS.divider} />

            {/* Patient + Doctor Info row */}
            <div style={PS.infoRow}>
              {/* Patient Info */}
              <div style={PS.infoBox}>
                <div style={PS.infoTitle}>Patient Information</div>
                <table style={PS.infoTable}>
                  <tbody>
                    <tr><td style={PS.infoKey}>Name:</td><td style={PS.infoVal}>{p.name}</td></tr>
                    <tr><td style={PS.infoKey}>Age / Gender:</td><td style={PS.infoVal}>{p.age} yrs / {p.gender}</td></tr>
                    <tr><td style={PS.infoKey}>Blood Group:</td><td style={PS.infoVal}>{p.blood}</td></tr>
                    <tr><td style={PS.infoKey}>Contact:</td><td style={PS.infoVal}>{p.phone}</td></tr>
                    {p.address && <tr><td style={PS.infoKey}>Address:</td><td style={PS.infoVal}>{p.address}</td></tr>}
                    {p.allergies && <tr><td style={PS.infoKey}>Allergies:</td><td style={{ ...PS.infoVal, color:"#c0392b" }}>{p.allergies}</td></tr>}
                    <tr><td style={PS.infoKey}>Patient ID:</td><td style={{ ...PS.infoVal, fontFamily:"monospace", fontWeight:700 }}>{p.id}</td></tr>
                  </tbody>
                </table>
              </div>

              {/* Doctor Info */}
              {dr && (
                <div style={{ ...PS.infoBox, borderLeft:"1px solid #ddd", paddingLeft:16 }}>
                  <div style={PS.infoTitle}>Doctor Information</div>
                  <table style={PS.infoTable}>
                    <tbody>
                      <tr><td style={PS.infoKey}>Name:</td><td style={{ ...PS.infoVal, fontWeight:700 }}>{dr.name}</td></tr>
                      <tr><td style={PS.infoKey}>Specialty:</td><td style={PS.infoVal}>{dr.specialty}</td></tr>
                      {dr.department && <tr><td style={PS.infoKey}>Department:</td><td style={PS.infoVal}>{dr.department}</td></tr>}
                      {dr.hospital && <tr><td style={PS.infoKey}>Hospital:</td><td style={PS.infoVal}>{dr.hospital}</td></tr>}
                      {dr.licenseNo && <tr><td style={PS.infoKey}>PMDC No:</td><td style={PS.infoVal}>{dr.licenseNo}</td></tr>}
                      {dr.phone && <tr><td style={PS.infoKey}>Contact:</td><td style={PS.infoVal}>{dr.phone}</td></tr>}
                      {dr.experience && <tr><td style={PS.infoKey}>Experience:</td><td style={PS.infoVal}>{dr.experience}</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={PS.divider} />

            {/* Two Column: Left = Clinical, Right = Rx */}
            <div style={PS.bodyRow}>

              {/* Left column */}
              <div style={PS.leftCol}>
                {/* Chief Complaints */}
                {complaints && (
                  <div style={PS.section}>
                    <div style={PS.sectionTitle}>Chief Complaints</div>
                    <div style={PS.sectionBody}>{complaints}</div>
                  </div>
                )}

                {/* Adv. Investigations */}
                {(examination || investigations) && (
                  <div style={PS.section}>
                    <div style={PS.sectionTitle}>Adv. Investigations / Examination</div>
                    <div style={PS.sectionBody}>{examination || investigations}</div>
                  </div>
                )}

                {/* Diagnosis */}
                {diagnosis && (
                  <div style={PS.section}>
                    <div style={PS.sectionTitle}>Diagnosis</div>
                    <div style={{ ...PS.sectionBody, fontWeight:700 }}>{diagnosis}</div>
                  </div>
                )}

                {/* Management Plan */}
                {plan && (
                  <div style={PS.section}>
                    <div style={PS.sectionTitle}>Management Plan</div>
                    <div style={PS.sectionBody}>{plan}</div>
                  </div>
                )}

                {/* Vitals box if no data */}
                {!complaints && !examination && !diagnosis && (
                  <div style={PS.vitalsBox}>
                    <div style={PS.sectionTitle}>Walk-In Medical History</div>
                    {["B.P", "Temp", "Pulse", "Height", "Weight", "BSR", "BSF"].map(v => (
                      <div key={v} style={PS.vitalRow}>
                        <span style={PS.vitalLabel}>{v}</span>
                        <span style={PS.vitalLine}>................................................................</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right column — Rx */}
              <div style={PS.rightCol}>
                <div style={PS.rxSymbol}>R<sub style={{ fontSize:18 }}>x</sub></div>

                {medicines.length > 0 ? (
                  <div>
                    <div style={PS.sectionTitle}>Prescribed Medicines</div>
                    {medicines.map((m, i) => (
                      <div key={i} style={PS.medItem}>
                        <div style={PS.medName}>{i + 1}. {m.name}</div>
                        <div style={PS.medDetail}>
                          {m.dose && <span>Dose: {m.dose}</span>}
                          {m.freq && <span> · Frequency: {m.freq}</span>}
                          {m.days && <span> · Duration: {m.days} days</span>}
                        </div>
                      </div>
                    ))}
                    {rx?.instructions && (
                      <div style={PS.rxNote}>
                        <b>Instructions:</b> {rx.instructions}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    {[1,2,3,4,5].map(i => (
                      <div key={i} style={PS.blankRxLine}>
                        <span style={PS.blankNum}>{i}.</span>
                        <span style={PS.blankLineInner}>.....................................................................</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={PS.divider} />

            {/* Footer */}
            <div style={PS.footer}>
              <div style={PS.footerLeft}>
                <span>Next Visit: ................................</span>
              </div>
              <div style={PS.footerRight}>
                <div style={PS.sigBox}>
                  <div style={PS.sigLine}>________________________________</div>
                  <div style={PS.sigLabel}>{dr ? dr.name : "Doctor's Signature"}</div>
                  {dr?.licenseNo && <div style={PS.sigSub}>{dr.licenseNo}</div>}
                  <div style={PS.sigSub}>(Not Valid for Court)</div>
                </div>
              </div>
            </div>

            <div style={PS.footerBar}>
              <span>Powered by MediTrack · Patient Management System</span>
              <span>Printed: {fmtDT(new Date().toISOString())}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Print Slip Styles ────────────────────────────────────────────────────────
const PS = {
  overlay: { position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:1000, display:"flex", alignItems:"flex-start", justifyContent:"center", overflowY:"auto", padding:"20px 16px 40px" },
  modal: { background:"#1a2a32", borderRadius:16, padding:"20px", width:"100%", maxWidth:820, boxShadow:"0 30px 80px rgba(0,0,0,0.6)" },
  slip: { background:"#fff", color:"#111", fontFamily:"'Times New Roman', Georgia, serif", padding:"28px 32px", minHeight:900, fontSize:13, lineHeight:1.5 },

  header: { display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 },
  headerLeft: {},
  hospitalName: { fontSize:28, fontWeight:900, color:"#1a1a2e", letterSpacing:1, lineHeight:1.1 },
  hospitalSub: { fontSize:12, color:"#555", letterSpacing:2, textTransform:"uppercase", marginTop:2 },
  headerRight: { textAlign:"right" },
  slipTitle: { fontSize:13, fontWeight:700, letterSpacing:2, textTransform:"uppercase", color:"#1a1a2e", border:"2px solid #1a1a2e", padding:"4px 12px", display:"inline-block", marginBottom:4 },
  slipDate: { fontSize:12, color:"#333" },
  slipId: { fontSize:11, color:"#666", fontFamily:"monospace", marginTop:2 },

  divider: { borderTop:"2px solid #1a1a2e", margin:"10px 0" },

  infoRow: { display:"flex", gap:0, marginBottom:0 },
  infoBox: { flex:1, paddingRight:16 },
  infoTitle: { fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:1.5, color:"#1a1a2e", borderBottom:"1px solid #ccc", paddingBottom:4, marginBottom:8 },
  infoTable: { width:"100%", borderCollapse:"collapse" },
  infoKey: { fontSize:12, color:"#555", fontWeight:600, paddingRight:8, paddingBottom:3, whiteSpace:"nowrap", verticalAlign:"top", width:"38%" },
  infoVal: { fontSize:12, color:"#111", paddingBottom:3, verticalAlign:"top" },

  bodyRow: { display:"flex", gap:0, minHeight:360 },
  leftCol: { flex:"0 0 45%", paddingRight:20, borderRight:"1px solid #ddd" },
  rightCol: { flex:"0 0 55%", paddingLeft:20 },

  section: { marginBottom:16 },
  sectionTitle: { fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:1.5, color:"#1a1a2e", borderBottom:"1px solid #ccc", paddingBottom:3, marginBottom:6 },
  sectionBody: { fontSize:13, color:"#111", lineHeight:1.7, whiteSpace:"pre-wrap" },

  vitalsBox: { marginBottom:12 },
  vitalRow: { display:"flex", alignItems:"center", marginBottom:7 },
  vitalLabel: { fontSize:12, color:"#333", minWidth:52 },
  vitalLine: { fontSize:10, color:"#ccc", flex:1, overflow:"hidden", letterSpacing:1 },

  rxSymbol: { fontSize:52, fontWeight:900, color:"#1a1a2e", lineHeight:1, marginBottom:12, fontFamily:"serif" },
  medItem: { marginBottom:12, borderBottom:"1px dotted #ddd", paddingBottom:8 },
  medName: { fontSize:14, fontWeight:700, color:"#1a1a2e" },
  medDetail: { fontSize:12, color:"#444", marginTop:2 },
  rxNote: { marginTop:12, fontSize:12, color:"#333", background:"#f5f5f5", padding:"8px 10px", borderRadius:4, borderLeft:"3px solid #1a1a2e" },

  blankRxLine: { display:"flex", alignItems:"center", marginBottom:18 },
  blankNum: { fontSize:13, fontWeight:700, color:"#333", marginRight:6 },
  blankLineInner: { fontSize:10, color:"#ccc", letterSpacing:1 },

  footer: { display:"flex", justifyContent:"space-between", alignItems:"flex-end", padding:"10px 0" },
  footerLeft: { fontSize:12, color:"#333" },
  footerRight: { textAlign:"right" },
  sigBox: { textAlign:"center" },
  sigLine: { fontSize:13, color:"#333", letterSpacing:2, marginBottom:4 },
  sigLabel: { fontSize:13, fontWeight:700, color:"#1a1a2e" },
  sigSub: { fontSize:11, color:"#666" },

  footerBar: { background:"#1a1a2e", color:"#aaa", fontSize:10, padding:"8px 12px", display:"flex", justifyContent:"space-between", marginTop:10, letterSpacing:0.5 },
};

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [db, setDb] = useState({});
  const [loading, setLoad] = useState(true);
  const [view, setView] = useState("home");
  const [patient, setPat] = useState(null);
  const [toast, setToast] = useState(null);
  const [printData, setPrintData] = useState(null);

  useEffect(() => { loadAll().then(d => { setDb(d); setLoad(false); }); }, []);

  const persist = async (u) => { setDb(u); await saveAll(u); };
  const notify = (msg, type = "ok") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3400); };
  const refresh = (id, udb) => { const s = udb || db; if (id && s[id]) setPat(s[id]); };
  const openPrint = (data) => setPrintData(data);

  if (loading) return <Splash />;

  return (
    <div style={R.root}>
      <style>{CSS}</style>
      <Bg />
      <Nav count={Object.keys(db).length} onHome={() => { setView("home"); setPat(null); }} />
      {toast && <Toast {...toast} />}
      {printData && (
        <PrintSlip
          p={printData.p}
          rx={printData.rx}
          dr={printData.dr}
          hxEntry={printData.hxEntry}
          onClose={() => setPrintData(null)}
        />
      )}
      <main style={R.main}>
        {view === "home" && <Home setView={setView} />}
        {view === "register" && <Register db={db} persist={persist} setView={setView} setPat={setPat} notify={notify} />}
        {view === "lookup" && <Lookup db={db} persist={persist} setView={setView} setPat={setPat} notify={notify} />}
        {view === "card" && patient && <IDCard p={patient} setView={setView} />}
        {view === "dashboard" && patient && (
          <Dashboard p={patient} db={db} persist={persist} notify={notify} refresh={refresh} setView={setView} openPrint={openPrint} />
        )}
      </main>
    </div>
  );
}

// ─── Home ─────────────────────────────────────────────────────────────────────
function Home({ setView }) {
  return (
    <div style={R.homeWrap} className="fi">
      <div style={R.heroBadge}>⚕ Patient Management System</div>
      <h1 style={R.heroTitle}>MediTrack</h1>
      <p style={R.heroSub}>A calm, organised space for patient care records.</p>
      <div style={R.twoCol}>
        {[
          { icon: "👤", label: "New Patient", desc: "Register and receive a permanent ID card", key: "register", c: "#5a9e8f" },
          { icon: "🔍", label: "Returning Patient", desc: "Retrieve your record with your patient ID", key: "lookup", c: "#7e9cc9" },
        ].map(x => (
          <button key={x.key} className="hcard" style={{ ...R.hCard, "--ac": x.c }} onClick={() => setView(x.key)}>
            <div style={{ ...R.hCardIco, background: x.c + "22", color: x.c }}>{x.icon}</div>
            <div style={R.hCardLabel}>{x.label}</div>
            <div style={R.hCardDesc}>{x.desc}</div>
            <div style={{ color: x.c, marginTop: 12, fontSize: 16 }}>→</div>
          </button>
        ))}
      </div>
      <div style={R.pills}>
        {["💊 Prescriptions", "📅 Appointments", "🔬 Lab Reports", "📋 Clinical History", "👨‍⚕️ Attending Doctors", "📱 SMS", "🖨 Print Slips"].map(p => (
          <span key={p} style={R.pill}>{p}</span>
        ))}
      </div>
    </div>
  );
}

// ─── Register ─────────────────────────────────────────────────────────────────
function Register({ db, persist, setView, setPat, notify }) {
  const [f, setF] = useState({ name: "", age: "", gender: "", blood: "", phone: "", address: "", allergies: "", conditions: "", emergency: "", notes: "" });
  const [err, setErr] = useState("");

  const submit = async () => {
    if (!f.name || !f.age || !f.gender || !f.blood || !f.phone) { setErr("Please fill all required fields."); return; }
    const id = genId();
    const p = { ...f, id, registeredAt: new Date().toISOString(), visits: 0, prescriptions: [], appointments: [], labReports: [], smsLog: [], clinicalHistory: [], doctors: [] };
    const u = { ...db, [id]: p };
    await persist(u); setPat(p); notify("Patient registered — ID: " + id); setView("card");
  };

  return (
    <div style={R.formWrap} className="fi">
      <Back onClick={() => setView("home")} />
      <h2 style={R.formTitle}>New Patient Registration</h2>
      <p style={R.formNote}>Fields marked * are required</p>
      {err && <Err msg={err} />}
      <div style={R.g2}>
        <F l="Full Name *" v={f.name} s={v => setF({ ...f, name: v })} ph="Ahmed Khan" />
        <F l="Age *" v={f.age} s={v => setF({ ...f, age: v })} ph="35" type="number" />
        <Sel l="Gender *" v={f.gender} s={v => setF({ ...f, gender: v })} opts={genders} />
        <Sel l="Blood Group *" v={f.blood} s={v => setF({ ...f, blood: v })} opts={bloodGroups} />
        <F l="Phone * (SMS)" v={f.phone} s={v => setF({ ...f, phone: v })} ph="0300-1234567" />
        <F l="Emergency Contact" v={f.emergency} s={v => setF({ ...f, emergency: v })} ph="Name & number" />
      </div>
      <F l="Home Address" v={f.address} s={v => setF({ ...f, address: v })} ph="Full address" full />
      <F l="Known Allergies" v={f.allergies} s={v => setF({ ...f, allergies: v })} ph="e.g. Penicillin" full />
      <F l="Existing Conditions" v={f.conditions} s={v => setF({ ...f, conditions: v })} ph="e.g. Diabetes" full />
      <F l="Initial Notes" v={f.notes} s={v => setF({ ...f, notes: v })} ph="Opening observations…" full ta />
      <Btn onClick={submit}>Generate Patient ID Card →</Btn>
    </div>
  );
}

// ─── Lookup ───────────────────────────────────────────────────────────────────
function Lookup({ db, persist, setView, setPat, notify }) {
  const [id, setId] = useState(""); const [err, setErr] = useState("");
  const go = async () => {
    const k = id.trim().toUpperCase();
    if (!k) { setErr("Enter a Patient ID."); return; }
    const p = db[k]; if (!p) { setErr("No patient found with that ID."); return; }
    const up = { ...p, visits: (p.visits || 0) + 1, lastVisit: new Date().toISOString() };
    const u = { ...db, [k]: up }; await persist(u); setPat(up); notify(`Welcome back, ${p.name}`); setView("dashboard");
  };
  return (
    <div style={{ ...R.formWrap, maxWidth: 440, margin: "40px auto" }} className="fi">
      <Back onClick={() => setView("home")} />
      <h2 style={R.formTitle}>Returning Patient</h2>
      <div style={R.lookCard}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🪪</div>
        <p style={{ color: "#8fa3b0", marginBottom: 20, fontSize: 14 }}>Enter your Patient ID to access your full record</p>
        {err && <Err msg={err} />}
        <input style={R.lookInput} value={id} onChange={e => setId(e.target.value.toUpperCase())}
          placeholder="e.g. MED-12345" onKeyDown={e => e.key === "Enter" && go()} autoFocus />
        <Btn onClick={go} full>Retrieve Record →</Btn>
      </div>
    </div>
  );
}

// ─── ID Card ──────────────────────────────────────────────────────────────────
function IDCard({ p, setView }) {
  return (
    <div style={{ maxWidth: 460, margin: "32px auto", textAlign: "center" }} className="fi">
      <div style={R.idCard}>
        <div style={R.idTop}><span style={R.idHosp}>⚕ MediTrack Hospital</span><span style={R.idLbl}>PATIENT CARD</span></div>
        <div style={R.idBody}>
          <div style={R.idAv}>{p.name[0].toUpperCase()}</div>
          <div>
            <div style={R.idName}>{p.name}</div>
            <div style={R.idMeta}>{p.age} yrs · {p.gender} · {p.blood}</div>
            <div style={R.idMeta}>📞 {p.phone}</div>
          </div>
        </div>
        <div style={R.idFoot}><span style={R.idNum}>{p.id}</span><span style={R.idDate}>Registered {fmt(p.registeredAt)}</span></div>
        <div style={R.idBar}>▐█▌▐▌██▌▐█▌▐██▌▐▌█▌▐█▌▐</div>
      </div>
      <p style={{ color: "#5a9e8f", margin: "18px 0", fontSize: 14 }}>✓ Registration complete. Keep this ID for future visits.</p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <Btn onClick={() => setView("dashboard")}>Open Dashboard →</Btn>
        <Btn ghost onClick={() => setView("home")}>Register Another</Btn>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ p: initP, db, persist, notify, refresh, setView, openPrint }) {
  const [tab, setTab] = useState("overview");
  const p = db[initP.id] || initP;

  const tabs = [
    { id: "overview", label: "Overview", icon: "🏥" },
    { id: "history", label: "Clinical History", icon: "📋", count: p.clinicalHistory?.length },
    { id: "doctors", label: "Attending Doctors", icon: "👨‍⚕️", count: p.doctors?.length },
    { id: "rx", label: "Prescriptions", icon: "💊", count: p.prescriptions?.length },
    { id: "appt", label: "Appointments", icon: "📅", count: p.appointments?.length },
    { id: "lab", label: "Lab Reports", icon: "🔬", count: p.labReports?.length },
    { id: "sms", label: "SMS Log", icon: "📱", count: p.smsLog?.length },
  ];

  return (
    <div className="fi">
      <div style={R.dBanner}>
        <div style={R.dAv}>{p.name[0].toUpperCase()}</div>
        <div style={{ flex: 1 }}>
          <div style={R.dName}>{p.name}</div>
          <div style={R.dMeta}>{p.id} · {p.age} yrs · {p.gender} · Blood <b style={{ color: "#e07b7b" }}>{p.blood}</b></div>
          <div style={R.dMeta}>📞 {p.phone}{p.lastVisit ? ` · Last seen ${fmt(p.lastVisit)}` : ""}</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={R.visitBadge}>Visit #{p.visits || 1}</span>
          <button style={R.smBtn} className="btn" onClick={() => setView("card")}>🪪 ID</button>
          <button style={{ ...R.smBtn, borderColor:"rgba(201,168,126,0.3)", color:"#c9a87e" }} className="btn"
            onClick={() => openPrint({ p, rx: p.prescriptions?.slice(-1)[0], dr: p.doctors?.[0], hxEntry: p.clinicalHistory?.slice(-1)[0] })}>
            🖨 Print
          </button>
        </div>
      </div>

      <div style={R.tabBar}>
        {tabs.map(t => (
          <button key={t.id} style={{ ...R.tab, ...(tab === t.id ? R.tabOn : {}) }} className="tabBtn" onClick={() => setTab(t.id)}>
            {t.icon} {t.label}{t.count > 0 ? <span style={R.tBadge}>{t.count}</span> : null}
          </button>
        ))}
      </div>

      <div>
        {tab === "overview" && <OverviewTab p={p} db={db} persist={persist} notify={notify} refresh={refresh} openPrint={openPrint} />}
        {tab === "history" && <HistoryTab p={p} db={db} persist={persist} notify={notify} refresh={refresh} openPrint={openPrint} />}
        {tab === "doctors" && <DoctorsTab p={p} db={db} persist={persist} notify={notify} refresh={refresh} openPrint={openPrint} />}
        {tab === "rx" && <RxTab p={p} db={db} persist={persist} notify={notify} refresh={refresh} openPrint={openPrint} />}
        {tab === "appt" && <ApptTab p={p} db={db} persist={persist} notify={notify} refresh={refresh} />}
        {tab === "lab" && <LabTab p={p} db={db} persist={persist} notify={notify} refresh={refresh} />}
        {tab === "sms" && <SMSTab p={p} db={db} persist={persist} notify={notify} refresh={refresh} />}
      </div>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab({ p, db, persist, notify, refresh, openPrint }) {
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState({ ...p });
  const save = async () => {
    const u = { ...db, [p.id]: { ...db[p.id], ...f } }; await persist(u); refresh(p.id, u); notify("Profile updated"); setEdit(false);
  };
  const nextApt = (p.appointments || []).filter(a => new Date(a.date) >= new Date() && a.status !== "Cancelled").sort((a, b) => new Date(a.date) - new Date(b.date))[0];
  const latestRx = (p.prescriptions || []).slice(-1)[0];
  const latestHx = (p.clinicalHistory || []).slice(-1)[0];
  return (
    <div>
      <div style={R.statsRow}>
        {[
          { l: "Clinical Visits", v: p.clinicalHistory?.length || 0, ic: "📋", c: "#7e9cc9" },
          { l: "Prescriptions", v: p.prescriptions?.length || 0, ic: "💊", c: "#5a9e8f" },
          { l: "Appointments", v: p.appointments?.length || 0, ic: "📅", c: "#c9a87e" },
          { l: "Lab Reports", v: p.labReports?.length || 0, ic: "🔬", c: "#9e7ec9" },
        ].map(s => (
          <div key={s.l} style={{ ...R.statCard, borderColor: s.c + "33" }}>
            <div style={{ fontSize: 22 }}>{s.ic}</div>
            <div style={{ ...R.statV, color: s.c }}>{s.v}</div>
            <div style={R.statL}>{s.l}</div>
          </div>
        ))}
      </div>
      {latestRx && <AlertBox c="#7e9cc9" icon="💊" title="Latest Prescription" body={`${latestRx.medicines?.map(m => m.name).join(", ")} — ${fmt(latestRx.date)}`} />}
      {nextApt && <AlertBox c="#5a9e8f" icon="📅" title="Next Appointment" body={`${fmt(nextApt.date)} at ${nextApt.time} — ${nextApt.type}${nextApt.doctor ? " (" + nextApt.doctor + ")" : ""}`} />}

      {/* Quick print button */}
      <div style={{ marginBottom:16, display:"flex", gap:10, flexWrap:"wrap" }}>
        <button style={{ ...R.qBtn, borderColor:"rgba(201,168,126,0.3)", color:"#c9a87e" }} className="btn"
          onClick={() => openPrint({ p, rx: latestRx, dr: p.doctors?.[0], hxEntry: latestHx })}>
          🖨 Print Latest Prescription Slip
        </button>
        <button style={{ ...R.qBtn }} className="btn"
          onClick={() => openPrint({ p, rx: null, dr: p.doctors?.[0], hxEntry: latestHx })}>
          🖨 Print Clinical Summary
        </button>
      </div>

      <Card title="Patient Information" action={<button style={R.editBtn} className="btn" onClick={() => setEdit(!edit)}>{edit ? "Cancel" : "✏ Edit"}</button>}>
        {edit ? (
          <div>
            <div style={R.g2}>
              <F l="Full Name" v={f.name} s={v => setF({ ...f, name: v })} />
              <F l="Age" v={f.age} s={v => setF({ ...f, age: v })} type="number" />
              <F l="Phone" v={f.phone} s={v => setF({ ...f, phone: v })} />
              <F l="Emergency" v={f.emergency} s={v => setF({ ...f, emergency: v })} />
            </div>
            <F l="Address" v={f.address} s={v => setF({ ...f, address: v })} full />
            <F l="Allergies" v={f.allergies} s={v => setF({ ...f, allergies: v })} full />
            <F l="Conditions" v={f.conditions} s={v => setF({ ...f, conditions: v })} full />
            <F l="Notes" v={f.notes} s={v => setF({ ...f, notes: v })} full ta />
            <Btn onClick={save}>Save Changes</Btn>
          </div>
        ) : (
          <div style={R.infoGrid}>
            {[["Blood Group", p.blood], ["Phone", p.phone], ["Emergency", p.emergency || "—"], ["Address", p.address || "—"], ["Allergies", p.allergies || "None"], ["Conditions", p.conditions || "None"]].map(([k, v]) => (
              <div key={k}><div style={R.iKey}>{k}</div><div style={R.iVal}>{v}</div></div>
            ))}
            {p.notes && <div style={{ gridColumn: "1/-1" }}><div style={R.iKey}>Notes</div><div style={R.iVal}>{p.notes}</div></div>}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Clinical History Tab ─────────────────────────────────────────────────────
function HistoryTab({ p, db, persist, notify, refresh, openPrint }) {
  const [open, setOpen] = useState(false);
  const [exp, setExp] = useState(null);
  const [f, setF] = useState({ date: today(), complaints: "", examination: "", diagnosis: "", plan: "", doctor: "", followUp: "" });

  const save = async () => {
    if (!f.complaints || !f.diagnosis) { notify("Fill in complaints and diagnosis", "err"); return; }
    const entry = { ...f, id: "HX-" + Date.now().toString(36).toUpperCase(), createdAt: new Date().toISOString() };
    const up = { ...db[p.id], clinicalHistory: [...(db[p.id].clinicalHistory || []), entry] };
    const u = { ...db, [p.id]: up }; await persist(u); refresh(p.id, u);
    notify("Clinical entry saved"); setOpen(false);
    setF({ date: today(), complaints: "", examination: "", diagnosis: "", plan: "", doctor: "", followUp: "" });
  };

  const list = (db[p.id]?.clinicalHistory || []).slice().reverse();

  return (
    <div>
      <TBar title={`📋 Clinical History (${list.length})`} btnLabel="+ New Entry" onBtn={() => setOpen(!open)} />
      {open && (
        <AddBox title="New Clinical Entry">
          <div style={R.g2}>
            <F l="Date" v={f.date} s={v => setF({ ...f, date: v })} type="date" />
            <F l="Attending Doctor" v={f.doctor} s={v => setF({ ...f, doctor: v })} ph="Dr. Name / Dept" />
          </div>
          <F l="Chief Complaints *" v={f.complaints} s={v => setF({ ...f, complaints: v })} ph="What the patient presented with…" full ta />
          <F l="Examination Findings" v={f.examination} s={v => setF({ ...f, examination: v })} ph="Physical exam, observations, vitals…" full ta />
          <F l="Diagnosis *" v={f.diagnosis} s={v => setF({ ...f, diagnosis: v })} ph="Working or confirmed diagnosis…" full ta />
          <F l="Management Plan" v={f.plan} s={v => setF({ ...f, plan: v })} ph="Treatment plan, referrals, procedures…" full ta />
          <F l="Follow-up Date" v={f.followUp} s={v => setF({ ...f, followUp: v })} type="date" />
          <Btn onClick={save}>Save Entry</Btn>
        </AddBox>
      )}
      {list.length === 0 && !open && <Empty icon="📋" msg="No clinical history recorded yet" />}
      {list.map(h => (
        <div key={h.id} style={R.hxCard}>
          <div style={R.hxTop} onClick={() => setExp(exp === h.id ? null : h.id)}>
            <div>
              <div style={R.hxDate}>{fmt(h.date)}{h.doctor && <span style={R.hxDr}> · {h.doctor}</span>}</div>
              <div style={R.hxDiag}>{h.diagnosis}</div>
              <div style={R.hxCompl}>{h.complaints.slice(0, 90)}{h.complaints.length > 90 ? "…" : ""}</div>
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <button style={{ ...R.sendBtn, borderColor:"rgba(201,168,126,0.3)", color:"#c9a87e" }} className="btn"
                onClick={e => { e.stopPropagation(); openPrint({ p, rx: null, dr: p.doctors?.find(d => d.name === h.doctor), hxEntry: h }); }}>
                🖨
              </button>
              <div style={{ color: "#5a6a72", fontSize: 16 }}>{exp === h.id ? "▲" : "▼"}</div>
            </div>
          </div>
          {exp === h.id && (
            <div style={R.hxBody}>
              {[["Chief Complaints", h.complaints], ["Examination Findings", h.examination], ["Diagnosis", h.diagnosis], ["Management Plan", h.plan], ["Follow-up Date", h.followUp ? fmt(h.followUp) : ""]].map(([k, v]) =>
                v ? <div key={k} style={{ marginBottom: 12 }}><div style={R.iKey}>{k}</div><div style={R.hxText}>{v}</div></div> : null
              )}
              <div style={{ color: "#3a4a52", fontSize: 11, marginTop: 8 }}>Recorded {fmtDT(h.createdAt)}</div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Attending Doctors Tab ────────────────────────────────────────────────────
function DoctorsTab({ p, db, persist, notify, refresh, openPrint }) {
  const [open, setOpen] = useState(false);
  const [selDr, setSelDr] = useState(null);
  const [drTab, setDrTab] = useState("rx");
  const [f, setF] = useState({ name: "", specialty: "", customSpecialty: "", department: "", phone: "", email: "", licenseNo: "", experience: "", hospital: "", notes: "" });

  const addDoctor = async () => {
    const spec = f.specialty === "Other (type below)" ? f.customSpecialty : f.specialty;
    if (!f.name || !spec) { notify("Enter doctor name and specialty", "err"); return; }
    const dr = { ...f, specialty: spec, id: genDrId(), addedAt: new Date().toISOString(), prescriptions: [], appointments: [], history: [] };
    const up = { ...db[p.id], doctors: [...(db[p.id].doctors || []), dr] };
    const u = { ...db, [p.id]: up }; await persist(u); refresh(p.id, u);
    notify(`${f.name} added`); setOpen(false);
    setF({ name: "", specialty: "", customSpecialty: "", department: "", phone: "", email: "", licenseNo: "", experience: "", hospital: "", notes: "" });
  };

  const doctors = db[p.id]?.doctors || [];
  const currentDr = doctors.find(d => d.id === selDr);

  if (selDr && currentDr) {
    return <DoctorDetail p={p} dr={currentDr} db={db} persist={persist} notify={notify} refresh={refresh}
      drTab={drTab} setDrTab={setDrTab} onBack={() => setSelDr(null)} openPrint={openPrint} />;
  }

  return (
    <div>
      <TBar title={`👨‍⚕️ Attending Doctors (${doctors.length})`} btnLabel="+ Add Doctor" onBtn={() => setOpen(!open)} />
      {open && (
        <AddBox title="Add Attending Doctor">
          <div style={R.g2}>
            <F l="Doctor Name *" v={f.name} s={v => setF({ ...f, name: v })} ph="Dr. Shahid Malik" />
            <F l="Hospital / Clinic" v={f.hospital} s={v => setF({ ...f, hospital: v })} ph="e.g. Shaukat Khanum, PIMS" />
          </div>
          <div style={{ marginBottom: 13 }}>
            <label style={R.lbl}>Specialty * <span style={{ color: "#5a6a72", fontWeight: 400 }}>(select from list or type your own)</span></label>
            <select style={{ ...R.input, marginBottom: f.specialty === "Other (type below)" ? 6 : 0 }}
              value={f.specialty} onChange={e => setF({ ...f, specialty: e.target.value, customSpecialty: "" })}>
              <option value="">— Select specialty —</option>
              {specialties.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            {f.specialty === "Other (type below)" && (
              <input style={R.input} value={f.customSpecialty}
                onChange={e => setF({ ...f, customSpecialty: e.target.value })}
                placeholder="Type specialty here e.g. Gynecology, Sports Medicine…" autoFocus />
            )}
          </div>
          <div style={R.g2}>
            <F l="Department / Ward" v={f.department} s={v => setF({ ...f, department: v })} ph="e.g. OPD Block C, Ward 4" />
            <F l="Phone / Extension" v={f.phone} s={v => setF({ ...f, phone: v })} ph="Direct line or ext." />
            <F l="Email" v={f.email} s={v => setF({ ...f, email: v })} ph="doctor@hospital.com" />
            <F l="License / PMDC No" v={f.licenseNo} s={v => setF({ ...f, licenseNo: v })} ph="e.g. PMDC-12345" />
            <F l="Experience" v={f.experience} s={v => setF({ ...f, experience: v })} ph="e.g. 12 years" />
          </div>
          <F l="Notes" v={f.notes} s={v => setF({ ...f, notes: v })} ph="Any notes about this doctor–patient relationship…" full ta />
          <Btn onClick={addDoctor}>Add Doctor</Btn>
        </AddBox>
      )}
      {doctors.length === 0 && !open && <Empty icon="👨‍⚕️" msg="No attending doctors added yet" />}
      {doctors.map(dr => (
        <div key={dr.id} style={R.drCard} className="hcard" onClick={() => { setSelDr(dr.id); setDrTab("rx"); }}>
          <div style={R.drAv}>{dr.name.replace("Dr.", "").trim()[0]?.toUpperCase()}</div>
          <div style={{ flex: 1 }}>
            <div style={R.drName}>{dr.name}</div>
            <div style={R.drSpec}>{dr.specialty}{dr.department ? ` · ${dr.department}` : ""}</div>
            {dr.hospital && <div style={R.drPhone}>🏥 {dr.hospital}</div>}
            {dr.phone && <div style={R.drPhone}>📞 {dr.phone}{dr.email ? `  ·  ✉ ${dr.email}` : ""}</div>}
            {dr.licenseNo && <div style={R.drPhone}>🪪 {dr.licenseNo}{dr.experience ? `  ·  ${dr.experience} exp.` : ""}</div>}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={R.drBadge}>{dr.prescriptions?.length || 0} Rx</span>
            <span style={R.drBadge}>{dr.appointments?.length || 0} Appts</span>
            <span style={{ color: "#5a6a72", fontSize: 14 }}>→</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Doctor Detail ────────────────────────────────────────────────────────────
function DoctorDetail({ p, dr, db, persist, notify, refresh, drTab, setDrTab, onBack, openPrint }) {
  const drTabs = [
    { id: "rx", label: "Prescriptions", icon: "💊" },
    { id: "appt", label: "Appointments", icon: "📅" },
    { id: "notes", label: "Visit Notes", icon: "📝" },
  ];
  return (
    <div>
      <button style={{ ...R.backBtn, marginBottom: 10 }} className="btn" onClick={onBack}>← All Doctors</button>
      <div style={R.drDetailBanner}>
        <div style={{ ...R.drAv, width: 50, height: 50, fontSize: 20 }}>{dr.name.replace("Dr.", "").trim()[0]?.toUpperCase()}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#dce8ef" }}>{dr.name}</div>
          <div style={{ fontSize: 13, color: "#7e9cc9", marginBottom: 3 }}>{dr.specialty}{dr.department ? ` · ${dr.department}` : ""}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px" }}>
            {dr.hospital && <span style={{ fontSize: 11, color: "#5a6a72" }}>🏥 {dr.hospital}</span>}
            {dr.phone && <span style={{ fontSize: 11, color: "#5a6a72" }}>📞 {dr.phone}</span>}
            {dr.email && <span style={{ fontSize: 11, color: "#5a6a72" }}>✉ {dr.email}</span>}
            {dr.licenseNo && <span style={{ fontSize: 11, color: "#5a6a72" }}>🪪 {dr.licenseNo}</span>}
            {dr.experience && <span style={{ fontSize: 11, color: "#5a6a72" }}>⏱ {dr.experience} experience</span>}
          </div>
          {dr.notes && <div style={{ fontSize: 11, color: "#3a4a52", marginTop: 4, fontStyle: "italic" }}>{dr.notes}</div>}
        </div>
        <button style={{ ...R.smBtn, borderColor:"rgba(201,168,126,0.3)", color:"#c9a87e" }} className="btn"
          onClick={() => {
            const latestRx = dr.prescriptions?.slice(-1)[0];
            const latestHx = p.clinicalHistory?.slice(-1)[0];
            openPrint({ p, rx: latestRx, dr, hxEntry: latestHx });
          }}>
          🖨 Print Slip
        </button>
      </div>
      <div style={{ ...R.tabBar, marginBottom: 16 }}>
        {drTabs.map(t => (
          <button key={t.id} style={{ ...R.tab, ...(drTab === t.id ? R.tabOn : {}) }} className="tabBtn" onClick={() => setDrTab(t.id)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      {drTab === "rx" && <DrRxTab p={p} dr={dr} db={db} persist={persist} notify={notify} refresh={refresh} openPrint={openPrint} />}
      {drTab === "appt" && <DrApptTab p={p} dr={dr} db={db} persist={persist} notify={notify} refresh={refresh} />}
      {drTab === "notes" && <DrNotesTab p={p} dr={dr} db={db} persist={persist} notify={notify} refresh={refresh} />}
    </div>
  );
}

// ─── Doctor Rx ────────────────────────────────────────────────────────────────
function DrRxTab({ p, dr, db, persist, notify, refresh, openPrint }) {
  const [open, setOpen] = useState(false);
  const [rx, setRx] = useState({ diagnosis: "", medicines: [{ name: "", dose: "", freq: "", days: "" }], instructions: "", date: today() });

  const updM = (i, k, v) => { const m = [...rx.medicines]; m[i] = { ...m[i], [k]: v }; setRx({ ...rx, medicines: m }); };

  const save = async () => {
    if (!rx.diagnosis || rx.medicines.some(m => !m.name)) { notify("Fill diagnosis and medicine names", "err"); return; }
    const entry = { ...rx, id: genRxId(), createdAt: new Date().toISOString(), doctorName: dr.name, doctorId: dr.id };
    const updDr = (db[p.id].doctors || []).map(d => d.id === dr.id ? { ...d, prescriptions: [...(d.prescriptions || []), entry] } : d);
    const updGlb = [...(db[p.id].prescriptions || []), entry];
    const up = { ...db[p.id], doctors: updDr, prescriptions: updGlb };
    const u = { ...db, [p.id]: up }; await persist(u); refresh(p.id, u);
    notify("Prescription saved"); setOpen(false);
    setRx({ diagnosis: "", medicines: [{ name: "", dose: "", freq: "", days: "" }], instructions: "", date: today() });
  };

  const send = async (r) => {
    const msg = `[MediTrack] Prescription ${r.id}\nBy: ${dr.name} (${dr.specialty})\nDiagnosis: ${r.diagnosis}\nMedicines: ${r.medicines.map(m => `${m.name} ${m.dose} x${m.freq} for ${m.days} days`).join("; ")}\n${r.instructions ? "Instructions: " + r.instructions : ""}`;
    const s = await mkSMS(p.phone, msg);
    const up = { ...db[p.id], smsLog: [...(db[p.id].smsLog || []), s] };
    const u = { ...db, [p.id]: up }; await persist(u); refresh(p.id, u);
    notify(s.status?.startsWith("sent") ? `📱 Sent to ${p.phone}` : `❌ SMS failed: ${s.error || "unknown"}`, s.status?.startsWith("sent") ? "ok" : "err");
  };

  const list = (db[p.id]?.doctors || []).find(d => d.id === dr.id)?.prescriptions?.slice().reverse() || [];

  return (
    <div>
      <TBar title={`Prescriptions by ${dr.name} (${list.length})`} btnLabel="+ Write Prescription" onBtn={() => setOpen(!open)} />
      {open && (
        <AddBox title="New Prescription">
          <div style={R.g2}>
            <F l="Date" v={rx.date} s={v => setRx({ ...rx, date: v })} type="date" />
            <F l="Diagnosis *" v={rx.diagnosis} s={v => setRx({ ...rx, diagnosis: v })} ph="e.g. Hypertension" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <label style={R.lbl}>Medicines *</label>
              <button style={R.miniBtn} className="btn" onClick={() => setRx({ ...rx, medicines: [...rx.medicines, { name: "", dose: "", freq: "", days: "" }] })}>+ Add</button>
            </div>
            {rx.medicines.map((m, i) => (
              <div key={i} style={R.medRow}>
                <input style={{ ...R.medIn, flex: 2 }} placeholder="Medicine name" value={m.name} onChange={e => updM(i, "name", e.target.value)} />
                <input style={R.medIn} placeholder="Dose" value={m.dose} onChange={e => updM(i, "dose", e.target.value)} />
                <input style={R.medIn} placeholder="Frequency" value={m.freq} onChange={e => updM(i, "freq", e.target.value)} />
                <input style={{ ...R.medIn, width: 64 }} placeholder="Days" value={m.days} onChange={e => updM(i, "days", e.target.value)} />
                {rx.medicines.length > 1 && <button style={R.xBtn} onClick={() => setRx({ ...rx, medicines: rx.medicines.filter((_, j) => j !== i) })}>✕</button>}
              </div>
            ))}
          </div>
          <F l="Instructions" v={rx.instructions} s={v => setRx({ ...rx, instructions: v })} ph="Take after meals…" full ta />
          <Btn onClick={save}>Save Prescription</Btn>
        </AddBox>
      )}
      {list.length === 0 && !open && <Empty icon="💊" msg="No prescriptions from this doctor yet" />}
      {list.map(r => (
        <div key={r.id} style={R.rxCard}>
          <div style={R.rxTop}>
            <div><div style={R.rxId}>{r.id}</div><div style={R.rxDate}>{fmt(r.date)}</div></div>
            <div style={{ display:"flex", gap:8 }}>
              <button style={{ ...R.sendBtn, borderColor:"rgba(201,168,126,0.3)", color:"#c9a87e" }} className="btn"
                onClick={() => openPrint({ p, rx: r, dr, hxEntry: p.clinicalHistory?.slice(-1)[0] })}>
                🖨 Print
              </button>
              <button style={R.sendBtn} className="btn" onClick={() => send(r)}>📱 Send</button>
            </div>
          </div>
          <div style={R.rxDiag}>Diagnosis: <b>{r.diagnosis}</b></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {r.medicines.map((m, i) => (
              <div key={i} style={R.medChip}>
                <span style={{ color: "#dce8ef", fontWeight: 600, fontSize: 13 }}>💊 {m.name}</span>
                <span style={{ color: "#8fa3b0", fontSize: 11 }}>{m.dose} · {m.freq} · {m.days} days</span>
              </div>
            ))}
          </div>
          {r.instructions && <div style={R.rxNote}>📋 {r.instructions}</div>}
        </div>
      ))}
    </div>
  );
}

// ─── Doctor Appointments ──────────────────────────────────────────────────────
function DrApptTab({ p, dr, db, persist, notify, refresh }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ date: "", time: "09:00", type: "General Checkup", reason: "", notes: "" });

  const book = async () => {
    if (!f.date || !f.time) { notify("Select date and time", "err"); return; }
    const apt = { ...f, id: genApId(), bookedAt: new Date().toISOString(), doctorName: dr.name, doctorId: dr.id, status: "Scheduled" };
    const msg = `[MediTrack] Appointment Confirmed\nDoctor: ${dr.name} (${dr.specialty})\nDate: ${fmt(f.date)} at ${f.time}\nType: ${f.type}\nPatient: ${p.name} (${p.id})\nPlease arrive 10 mins early.`;
    const s = await mkSMS(p.phone, msg);
    const updDr = (db[p.id].doctors || []).map(d => d.id === dr.id ? { ...d, appointments: [...(d.appointments || []), apt] } : d);
    const updGlb = [...(db[p.id].appointments || []), apt];
    const up = { ...db[p.id], doctors: updDr, appointments: updGlb, smsLog: [...(db[p.id].smsLog || []), s] };
    const u = { ...db, [p.id]: up }; await persist(u); refresh(p.id, u);
    notify(`📅 Booked + SMS sent to ${p.phone}`); setOpen(false);
    setF({ date: "", time: "09:00", type: "General Checkup", reason: "", notes: "" });
  };

  const cancel = async (id) => {
    const updDr = (db[p.id].doctors || []).map(d => d.id === dr.id ? { ...d, appointments: (d.appointments || []).map(a => a.id === id ? { ...a, status: "Cancelled" } : a) } : d);
    const updGlb = (db[p.id].appointments || []).map(a => a.id === id ? { ...a, status: "Cancelled" } : a);
    const up = { ...db[p.id], doctors: updDr, appointments: updGlb };
    const u = { ...db, [p.id]: up }; await persist(u); refresh(p.id, u); notify("Appointment cancelled");
  };

  const list = ((db[p.id]?.doctors || []).find(d => d.id === dr.id)?.appointments || []).slice().reverse();
  const upcoming = list.filter(a => new Date(a.date) >= new Date() && a.status !== "Cancelled");
  const past = list.filter(a => new Date(a.date) < new Date() || a.status === "Cancelled");

  return (
    <div>
      <TBar title={`Appointments with ${dr.name} (${list.length})`} btnLabel="+ Book Appointment" onBtn={() => setOpen(!open)} />
      {open && (
        <AddBox title="Book Appointment">
          <div style={R.g2}>
            <F l="Date *" v={f.date} s={v => setF({ ...f, date: v })} type="date" />
            <F l="Time *" v={f.time} s={v => setF({ ...f, time: v })} type="time" />
            <Sel l="Type" v={f.type} s={v => setF({ ...f, type: v })} opts={apptTypes} />
            <F l="Reason" v={f.reason} s={v => setF({ ...f, reason: v })} ph="Chief complaint / purpose" />
          </div>
          <F l="Additional Notes" v={f.notes} s={v => setF({ ...f, notes: v })} ph="Any additional info…" full ta />
          <Btn onClick={book}>Book + Send SMS Reminder</Btn>
        </AddBox>
      )}
      {list.length === 0 && !open && <Empty icon="📅" msg="No appointments with this doctor yet" />}
      {upcoming.length > 0 && <GrpLabel>🟢 Upcoming</GrpLabel>}
      {upcoming.map(a => <AptCard key={a.id} a={a} onCancel={() => cancel(a.id)} />)}
      {past.length > 0 && <GrpLabel>⬜ Past / Cancelled</GrpLabel>}
      {past.map(a => <AptCard key={a.id} a={a} past />)}
    </div>
  );
}

// ─── Doctor Visit Notes ───────────────────────────────────────────────────────
function DrNotesTab({ p, dr, db, persist, notify, refresh }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ date: today(), note: "", type: "Visit Note" });
  const noteTypes = ["Visit Note", "Referral Note", "Discharge Summary", "Progress Note", "Procedure Note"];

  const save = async () => {
    if (!f.note) { notify("Write a note", "err"); return; }
    const entry = { ...f, id: "NOTE-" + Date.now(), createdAt: new Date().toISOString() };
    const updDr = (db[p.id].doctors || []).map(d => d.id === dr.id ? { ...d, history: [...(d.history || []), entry] } : d);
    const up = { ...db[p.id], doctors: updDr };
    const u = { ...db, [p.id]: up }; await persist(u); refresh(p.id, u);
    notify("Note saved"); setOpen(false); setF({ date: today(), note: "", type: "Visit Note" });
  };

  const list = ((db[p.id]?.doctors || []).find(d => d.id === dr.id)?.history || []).slice().reverse();

  return (
    <div>
      <TBar title={`Visit Notes — ${dr.name} (${list.length})`} btnLabel="+ Add Note" onBtn={() => setOpen(!open)} />
      {open && (
        <AddBox title="Add Visit Note">
          <div style={R.g2}>
            <F l="Date" v={f.date} s={v => setF({ ...f, date: v })} type="date" />
            <Sel l="Type" v={f.type} s={v => setF({ ...f, type: v })} opts={noteTypes} />
          </div>
          <F l="Note *" v={f.note} s={v => setF({ ...f, note: v })} ph="Write note here…" full ta />
          <Btn onClick={save}>Save Note</Btn>
        </AddBox>
      )}
      {list.length === 0 && !open && <Empty icon="📝" msg="No visit notes yet" />}
      {list.map(n => (
        <div key={n.id} style={R.noteCard}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 4 }}>
            <span style={R.noteType}>{n.type}</span>
            <span style={{ fontSize: 11, color: "#3a4a52" }}>{fmt(n.date)}</span>
          </div>
          <div style={R.noteText}>{n.note}</div>
          <div style={{ color: "#3a4a52", fontSize: 11, marginTop: 6 }}>Recorded {fmtDT(n.createdAt)}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Global Prescriptions ─────────────────────────────────────────────────────
function RxTab({ p, db, persist, notify, refresh, openPrint }) {
  const list = (db[p.id]?.prescriptions || []).slice().reverse();
  const send = async (r) => {
    const msg = `[MediTrack] Prescription ${r.id}\n${r.doctorName ? `By: ${r.doctorName}\n` : ""}Diagnosis: ${r.diagnosis}\nMedicines: ${r.medicines.map(m => `${m.name} ${m.dose} x${m.freq} for ${m.days} days`).join("; ")}\n${r.instructions ? "Instructions: " + r.instructions : ""}`;
    const s = await mkSMS(p.phone, msg);
    const up = { ...db[p.id], smsLog: [...(db[p.id].smsLog || []), s] };
    const u = { ...db, [p.id]: up }; await persist(u); refresh(p.id, u);
    notify(s.status?.startsWith("sent") ? `📱 Sent to ${p.phone}` : `❌ SMS failed: ${s.error || "unknown"}`, s.status?.startsWith("sent") ? "ok" : "err");
  };
  return (
    <div>
      <TBar title={`💊 All Prescriptions (${list.length})`} />
      {list.length === 0 && <Empty icon="💊" msg="No prescriptions yet. Add them via Attending Doctors." />}
      {list.map(r => (
        <div key={r.id} style={R.rxCard}>
          <div style={R.rxTop}>
            <div><div style={R.rxId}>{r.id}</div><div style={R.rxDate}>{fmt(r.date)}{r.doctorName ? ` · ${r.doctorName}` : ""}</div></div>
            <div style={{ display:"flex", gap:8 }}>
              <button style={{ ...R.sendBtn, borderColor:"rgba(201,168,126,0.3)", color:"#c9a87e" }} className="btn"
                onClick={() => openPrint({ p, rx: r, dr: p.doctors?.find(d => d.name === r.doctorName), hxEntry: p.clinicalHistory?.slice(-1)[0] })}>
                🖨 Print
              </button>
              <button style={R.sendBtn} className="btn" onClick={() => send(r)}>📱 Send</button>
            </div>
          </div>
          <div style={R.rxDiag}>Diagnosis: <b>{r.diagnosis}</b></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {r.medicines.map((m, i) => (
              <div key={i} style={R.medChip}>
                <span style={{ color: "#dce8ef", fontWeight: 600, fontSize: 13 }}>💊 {m.name}</span>
                <span style={{ color: "#8fa3b0", fontSize: 11 }}>{m.dose} · {m.freq} · {m.days} days</span>
              </div>
            ))}
          </div>
          {r.instructions && <div style={R.rxNote}>📋 {r.instructions}</div>}
        </div>
      ))}
    </div>
  );
}

// ─── Global Appointments ──────────────────────────────────────────────────────
function ApptTab({ p, db, persist, notify, refresh }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ date: "", time: "09:00", type: "General Checkup", doctor: "", reason: "", notes: "" });

  const book = async () => {
    if (!f.date || !f.time) { notify("Select date and time", "err"); return; }
    const apt = { ...f, id: genApId(), bookedAt: new Date().toISOString(), status: "Scheduled" };
    const msg = `[MediTrack] Appointment Confirmed\n${f.doctor ? `Doctor: ${f.doctor}\n` : ""}Date: ${fmt(f.date)} at ${f.time}\nType: ${f.type}\nPatient: ${p.name} (${p.id})`;
    const s = await mkSMS(p.phone, msg);
    const up = { ...db[p.id], appointments: [...(db[p.id].appointments || []), apt], smsLog: [...(db[p.id].smsLog || []), s] };
    const u = { ...db, [p.id]: up }; await persist(u); refresh(p.id, u);
    notify(`📅 Booked + SMS sent`); setOpen(false);
    setF({ date: "", time: "09:00", type: "General Checkup", doctor: "", reason: "", notes: "" });
  };

  const cancel = async (id) => {
    const apts = (db[p.id].appointments || []).map(a => a.id === id ? { ...a, status: "Cancelled" } : a);
    const up = { ...db[p.id], appointments: apts };
    const u = { ...db, [p.id]: up }; await persist(u); refresh(p.id, u); notify("Cancelled");
  };

  const list = (db[p.id]?.appointments || []).slice().reverse();
  const upcoming = list.filter(a => new Date(a.date) >= new Date() && a.status !== "Cancelled");
  const past = list.filter(a => new Date(a.date) < new Date() || a.status === "Cancelled");

  return (
    <div>
      <TBar title={`📅 All Appointments (${list.length})`} btnLabel="+ Book Appointment" onBtn={() => setOpen(!open)} />
      {open && (
        <AddBox title="Book Appointment">
          <div style={R.g2}>
            <F l="Date *" v={f.date} s={v => setF({ ...f, date: v })} type="date" />
            <F l="Time *" v={f.time} s={v => setF({ ...f, time: v })} type="time" />
            <Sel l="Type" v={f.type} s={v => setF({ ...f, type: v })} opts={apptTypes} />
            <F l="Doctor" v={f.doctor} s={v => setF({ ...f, doctor: v })} ph="Doctor name (optional)" />
          </div>
          <F l="Reason" v={f.reason} s={v => setF({ ...f, reason: v })} ph="Reason for visit" full />
          <F l="Notes" v={f.notes} s={v => setF({ ...f, notes: v })} ph="Additional notes…" full ta />
          <Btn onClick={book}>Book + Send SMS</Btn>
        </AddBox>
      )}
      {list.length === 0 && !open && <Empty icon="📅" msg="No appointments booked yet" />}
      {upcoming.length > 0 && <GrpLabel>🟢 Upcoming</GrpLabel>}
      {upcoming.map(a => <AptCard key={a.id} a={a} onCancel={() => cancel(a.id)} />)}
      {past.length > 0 && <GrpLabel>⬜ Past / Cancelled</GrpLabel>}
      {past.map(a => <AptCard key={a.id} a={a} past />)}
    </div>
  );
}

// ─── Lab Reports ──────────────────────────────────────────────────────────────
function LabTab({ p, db, persist, notify, refresh }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ testName: "", result: "", range: "", status: "Normal", notes: "", date: today() });
  const statuses = ["Normal", "Abnormal", "Critical", "Pending"];

  const save = async () => {
    if (!f.testName || !f.result) { notify("Enter test name and result", "err"); return; }
    const lab = { ...f, id: genLabId(), uploadedAt: new Date().toISOString() };
    const up = { ...db[p.id], labReports: [...(db[p.id].labReports || []), lab] };
    const u = { ...db, [p.id]: up }; await persist(u); refresh(p.id, u); notify("Lab report saved"); setOpen(false);
    setF({ testName: "", result: "", range: "", status: "Normal", notes: "", date: today() });
  };

  const send = async (lab) => {
    const msg = `[MediTrack] Lab Report\nTest: ${lab.testName}\nResult: ${lab.result}${lab.range ? " (Normal: " + lab.range + ")" : ""}\nStatus: ${lab.status}\nDate: ${fmt(lab.date)}${lab.notes ? "\nNotes: " + lab.notes : ""}`;
    const s = await mkSMS(p.phone, msg);
    const up = { ...db[p.id], smsLog: [...(db[p.id].smsLog || []), s] };
    const u = { ...db, [p.id]: up }; await persist(u); refresh(p.id, u); notify(`📱 Sent to ${p.phone}`);
  };

  const list = (db[p.id]?.labReports || []).slice().reverse();
  const sc = { Normal: "#5a9e8f", Abnormal: "#c9a87e", Critical: "#e07b7b", Pending: "#8fa3b0" };

  return (
    <div>
      <TBar title={`🔬 Lab Reports (${list.length})`} btnLabel="+ Add Report" onBtn={() => setOpen(!open)} />
      {open && (
        <AddBox title="Add Lab Report">
          <div style={R.g2}>
            <F l="Test Name *" v={f.testName} s={v => setF({ ...f, testName: v })} ph="e.g. Blood CBC" />
            <F l="Date" v={f.date} s={v => setF({ ...f, date: v })} type="date" />
            <F l="Result *" v={f.result} s={v => setF({ ...f, result: v })} ph="e.g. 11.2 g/dL" />
            <F l="Normal Range" v={f.range} s={v => setF({ ...f, range: v })} ph="e.g. 12–16 g/dL" />
            <Sel l="Status" v={f.status} s={v => setF({ ...f, status: v })} opts={statuses} />
          </div>
          <F l="Notes" v={f.notes} s={v => setF({ ...f, notes: v })} ph="Observations…" full ta />
          <Btn onClick={save}>Save Report</Btn>
        </AddBox>
      )}
      {list.length === 0 && !open && <Empty icon="🔬" msg="No lab reports uploaded yet" />}
      {list.map(lab => (
        <div key={lab.id} style={R.labCard}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#dce8ef" }}>{lab.testName}</div>
              <div style={{ fontSize: 11, color: "#3a4a52", fontFamily: "monospace" }}>{lab.id} · {fmt(lab.date)}</div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ ...R.sBadge, background: (sc[lab.status] || "#8fa3b0") + "22", color: sc[lab.status] || "#8fa3b0" }}>{lab.status}</span>
              <button style={R.sendBtn} className="btn" onClick={() => send(lab)}>📱 Send</button>
            </div>
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, color: "#a8bfc9" }}>Result: <b style={{ color: "#dce8ef" }}>{lab.result}</b></span>
            {lab.range && <span style={{ fontSize: 13, color: "#5a6a72" }}>Normal: {lab.range}</span>}
          </div>
          {lab.notes && <div style={R.rxNote}>{lab.notes}</div>}
        </div>
      ))}
    </div>
  );
}

// ─── SMS Tab ──────────────────────────────────────────────────────────────────
function SMSTab({ p, db, persist, notify, refresh }) {
  const [msg, setMsg] = useState("");

  const send = async (text) => {
    const s = await mkSMS(p.phone, `[MediTrack] ${text}`);
    const up = { ...db[p.id], smsLog: [...(db[p.id].smsLog || []), s] };
    const u = { ...db, [p.id]: up }; await persist(u); refresh(p.id, u);
    notify(s.status?.startsWith("sent") ? `📱 Sent to ${p.phone}` : `❌ SMS failed: ${s.error || "unknown"}`, s.status?.startsWith("sent") ? "ok" : "err");
  };

  const medReminder = () => {
    const rx = db[p.id]?.prescriptions?.slice(-1)[0];
    const m = rx ? rx.medicines.map(x => x.name).join(", ") : "your prescribed medicines";
    send(`Medicine Reminder 💊\nPlease take ${m} as prescribed. Stay well.`);
  };

  const visitReminder = () => {
    const next = (db[p.id]?.appointments || []).filter(a => new Date(a.date) > new Date() && a.status !== "Cancelled").sort((a, b) => new Date(a.date) - new Date(b.date))[0];
    const d = next ? `on ${fmt(next.date)} at ${next.time}` : "soon (please book)";
    send(`Visit Reminder 📅\nYou have an appointment ${d}. Please confirm or reschedule if needed.`);
  };

  const list = (db[p.id]?.smsLog || []).slice().reverse();

  return (
    <div>
      <TBar title={`📱 SMS Log (${list.length})`} />
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <button style={R.qBtn} className="btn" onClick={medReminder}>💊 Medicine Reminder</button>
        <button style={{ ...R.qBtn, borderColor: "#5a9e8f44", color: "#5a9e8f" }} className="btn" onClick={visitReminder}>📅 Visit Reminder</button>
      </div>
      <div style={{ ...R.addCard, marginBottom: 16 }}>
        <label style={R.lbl}>Custom message to {p.phone}</label>
        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <input style={{ ...R.input, flex: 1 }} value={msg} onChange={e => setMsg(e.target.value)}
            placeholder="Type a message…" onKeyDown={e => e.key === "Enter" && msg && (send(msg), setMsg(""))} />
          <Btn onClick={() => { if (msg) { send(msg); setMsg(""); } }}>Send</Btn>
        </div>
      </div>
      {list.length === 0 && <Empty icon="📱" msg="No SMS messages sent yet" />}
      {list.map(s => (
        <div key={s.id} style={R.smsCard}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, flexWrap: "wrap", gap: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: s.status?.startsWith("sent") ? "#5a9e8f" : "#e07b7b" }}>📱 {s.to}</span>
            <span style={{ fontSize: 11, color: "#3a4a52", fontFamily: "monospace" }}>{fmtDT(s.sentAt)}</span>
          </div>
          <div style={{ fontSize: 12, color: "#8fa3b0", whiteSpace: "pre-wrap", lineHeight: 1.65 }}>{s.message}</div>
          <div style={{ fontSize: 11, color: s.status?.startsWith("sent") ? "#5a9e8f" : "#e07b7b", marginTop:4 }}>Status: {s.status}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Shared Components ────────────────────────────────────────────────────────
function AptCard({ a, onCancel, past }) {
  const sc = { Scheduled: "#5a9e8f", Cancelled: "#e07b7b", Completed: "#7e9cc9" };
  return (
    <div style={{ ...R.aptCard, opacity: past ? 0.55 : 1 }}>
      <div style={R.aptLeft}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#7e9cc9", marginBottom: 2 }}>{fmt(a.date)}</div>
        <div style={{ fontSize: 11, color: "#5a6a72" }}>{a.time}</div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#dce8ef", marginBottom: 2 }}>{a.type}</div>
        {a.doctor && <div style={{ fontSize: 12, color: "#7e9cc9", marginBottom: 2 }}>👨‍⚕️ {a.doctor}</div>}
        {(a.reason || a.notes) && <div style={{ fontSize: 12, color: "#5a6a72" }}>{a.reason || a.notes}</div>}
        <div style={{ fontSize: 11, color: "#3a4a52", marginTop: 2 }}>Booked {fmt(a.bookedAt)}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
        <span style={{ ...R.sBadge, background: (sc[a.status] || "#8fa3b0") + "22", color: sc[a.status] || "#8fa3b0" }}>{a.status}</span>
        {!past && <button style={R.cancelBtn} className="btn" onClick={onCancel}>Cancel</button>}
      </div>
    </div>
  );
}

function F({ l, v, s, ph, type = "text", full, ta }) {
  return (
    <div style={{ marginBottom: 13, ...(full ? { gridColumn: "1/-1" } : {}) }}>
      <label style={R.lbl}>{l}</label>
      {ta
        ? <textarea style={{ ...R.input, minHeight: 78, resize: "vertical", width: "100%", boxSizing: "border-box" }} value={v} onChange={e => s(e.target.value)} placeholder={ph} />
        : <input style={{ ...R.input, width: full ? "100%" : undefined, boxSizing: full ? "border-box" : undefined }} type={type} value={v} onChange={e => s(e.target.value)} placeholder={ph} />
      }
    </div>
  );
}
function Sel({ l, v, s, opts }) {
  return (
    <div style={{ marginBottom: 13 }}>
      <label style={R.lbl}>{l}</label>
      <select style={R.input} value={v} onChange={e => s(e.target.value)}>
        <option value="">Select…</option>
        {opts.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
const Btn = ({ children, onClick, ghost, full }) => (
  <button style={{ ...(ghost ? R.ghostBtn : R.primaryBtn), width: full ? "100%" : undefined }} className="btn" onClick={onClick}>{children}</button>
);
const Card = ({ title, action, children }) => (
  <div style={R.card}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#dce8ef" }}>{title}</div>{action}
    </div>
    {children}
  </div>
);
const AddBox = ({ title, children }) => (
  <div style={R.addCard}><div style={{ fontSize: 14, fontWeight: 700, color: "#dce8ef", marginBottom: 13 }}>{title}</div>{children}</div>
);
const TBar = ({ title, btnLabel, onBtn }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
    <div style={{ fontSize: 17, fontWeight: 700, color: "#dce8ef" }}>{title}</div>
    {btnLabel && <button style={R.primaryBtn} className="btn" onClick={onBtn}>{btnLabel}</button>}
  </div>
);
const GrpLabel = ({ children }) => (
  <div style={{ fontSize: 10, color: "#3a4a52", letterSpacing: 2, textTransform: "uppercase", marginBottom: 7, marginTop: 12 }}>{children}</div>
);
const AlertBox = ({ c, icon, title, body }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, background: c + "11", border: `1px solid ${c}33`, borderRadius: 9, padding: "10px 13px", marginBottom: 9, fontSize: 13 }}>
    <span style={{ fontSize: 17 }}>{icon}</span>
    <div><div style={{ color: c, fontWeight: 700, fontSize: 10, letterSpacing: 1, textTransform: "uppercase", marginBottom: 2 }}>{title}</div>
      <div style={{ color: "#a8bfc9", fontSize: 13 }}>{body}</div></div>
  </div>
);
const Back = ({ onClick }) => <button style={R.backBtn} className="btn" onClick={onClick}>← Back</button>;
const Err = ({ msg }) => <div style={{ background: "rgba(224,123,123,0.08)", border: "1px solid rgba(224,123,123,0.25)", borderRadius: 7, padding: "8px 13px", color: "#e07b7b", fontSize: 12, marginBottom: 13 }}>{msg}</div>;
const Empty = ({ icon, msg }) => <div style={{ textAlign: "center", padding: "34px 0", color: "#3a4a52" }}><div style={{ fontSize: 34, marginBottom: 7 }}>{icon}</div>{msg}</div>;
const Toast = ({ msg, type }) => (
  <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 999, background: type === "err" ? "rgba(70,15,15,0.95)" : "rgba(15,38,32,0.95)", border: `1px solid ${type === "err" ? "#e07b7b44" : "#5a9e8f44"}`, borderRadius: 9, padding: "10px 16px", fontSize: 13, fontWeight: 600, color: "#dce8ef", backdropFilter: "blur(10px)", maxWidth: 310, boxShadow: "0 6px 28px rgba(0,0,0,0.4)" }}>{msg}</div>
);
const Nav = ({ count, onHome }) => (
  <header style={R.nav}>
    <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", touchAction: "manipulation" }} onClick={onHome}>
      <span style={{ fontSize: 28, filter: "drop-shadow(0 0 6px #5a9e8f88)" }}>⚕</span>
      <div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#dce8ef", letterSpacing: 0.5 }}>MediTrack</div>
        <div style={{ fontSize: 10, color: "#5a6a72", letterSpacing: 1.5, textTransform: "uppercase" }}>Patient Management</div>
      </div>
    </div>
    <div style={{ fontSize: 12, color: "#5a6a72", fontFamily: "monospace" }}>{count} patients</div>
  </header>
);
const Bg = () => (
  <>
    <div style={{ position: "fixed", inset: 0, zIndex: 0, backgroundImage: "linear-gradient(rgba(90,158,143,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(90,158,143,0.025) 1px,transparent 1px)", backgroundSize: "48px 48px", pointerEvents: "none" }} />
    <div style={{ position: "fixed", top: -250, right: -250, width: 600, height: 600, background: "radial-gradient(circle,rgba(90,158,143,0.07) 0%,transparent 70%)", zIndex: 0, pointerEvents: "none" }} />
    <div style={{ position: "fixed", bottom: -250, left: -250, width: 500, height: 500, background: "radial-gradient(circle,rgba(126,156,201,0.05) 0%,transparent 70%)", zIndex: 0, pointerEvents: "none" }} />
  </>
);
const Splash = () => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0d1a1f" }}>
    <div style={{ fontSize: 50, animation: "spin 2.5s linear infinite" }}>⚕</div>
    <div style={{ color: "#3a4a52", fontFamily: "monospace", marginTop: 14, letterSpacing: 2, fontSize: 13 }}>Loading MediTrack…</div>
  </div>
);

// ─── Styles ───────────────────────────────────────────────────────────────────
const R = {
  root: { minHeight: "100vh", background: "#0d1a1f", fontFamily: "'Georgia',serif", color: "#dce8ef", position: "relative", overflowX: "hidden" },
  main: { position: "relative", zIndex: 1, maxWidth: 940, margin: "0 auto", padding: "20px 16px 80px" },
  nav: { position: "sticky", top: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid rgba(90,158,143,0.12)", background: "rgba(13,26,31,0.96)", backdropFilter: "blur(14px)" },

  homeWrap: { paddingTop: 24, textAlign: "center" },
  heroBadge: { display: "inline-block", padding: "7px 18px", border: "1px solid rgba(90,158,143,0.28)", borderRadius: 20, fontSize: 12, color: "#5a9e8f", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 18 },
  heroTitle: { fontSize: "clamp(40px,10vw,64px)", fontWeight: 700, color: "#dce8ef", marginBottom: 10, marginTop: 0, lineHeight: 1.1 },
  heroSub: { color: "#8fa3b0", fontSize: 16, letterSpacing: 0.3, marginBottom: 32, marginTop: 0 },
  twoCol: { display: "grid", gridTemplateColumns: "1fr", gap: 14, maxWidth: 480, margin: "0 auto 28px", textAlign: "left" },
  hCard: { background: "rgba(90,158,143,0.05)", border: "1px solid rgba(90,158,143,0.14)", borderRadius: 16, padding: "22px 20px", cursor: "pointer", transition: "all 0.25s", textAlign: "left" },
  hCardIco: { width: 52, height: 52, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 14 },
  hCardLabel: { fontSize: 20, fontWeight: 700, color: "#dce8ef", marginBottom: 6 },
  hCardDesc: { color: "#8fa3b0", fontSize: 15, lineHeight: 1.6 },
  pills: { display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", padding: "0 8px" },
  pill: { padding: "6px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, fontSize: 12, color: "#5a6a72" },

  formWrap: { maxWidth: 680, margin: "0 auto" },
  formTitle: { fontSize: 24, fontWeight: 700, color: "#dce8ef", marginBottom: 4, marginTop: 4 },
  formNote: { color: "#8fa3b0", fontSize: 14, marginBottom: 20 },
  g2: { display: "grid", gridTemplateColumns: "1fr", gap: 0 },
  lbl: { display: "block", fontSize: 12, color: "#8fa3b0", marginBottom: 6, letterSpacing: 0.8, textTransform: "uppercase", fontWeight: 600 },
  input: { width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "13px 15px", color: "#dce8ef", fontSize: 16, outline: "none", boxSizing: "border-box", fontFamily: "inherit", WebkitAppearance: "none" },

  lookCard: { background: "rgba(90,158,143,0.05)", border: "1px solid rgba(90,158,143,0.14)", borderRadius: 18, padding: "32px 24px", textAlign: "center" },
  lookInput: { width: "100%", background: "rgba(255,255,255,0.04)", border: "2px solid rgba(90,158,143,0.3)", borderRadius: 12, padding: "16px 20px", color: "#dce8ef", fontSize: 20, letterSpacing: 3, textAlign: "center", outline: "none", boxSizing: "border-box", marginBottom: 16, fontFamily: "monospace", WebkitAppearance: "none" },

  primaryBtn: { background: "linear-gradient(135deg,#5a9e8f,#3d8070)", color: "#fff", border: "none", borderRadius: 12, padding: "15px 24px", fontSize: 16, fontWeight: 700, cursor: "pointer", transition: "all 0.2s", fontFamily: "inherit", letterSpacing: 0.3, touchAction: "manipulation" },
  ghostBtn: { background: "transparent", color: "#8fa3b0", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "15px 24px", fontSize: 16, cursor: "pointer", transition: "all 0.2s", fontFamily: "inherit", touchAction: "manipulation" },
  editBtn: { background: "transparent", color: "#7e9cc9", border: "1px solid rgba(126,156,201,0.28)", borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: "pointer", fontFamily: "inherit", touchAction: "manipulation" },
  backBtn: { background: "transparent", color: "#8fa3b0", border: "none", padding: "0 0 20px", fontSize: 15, cursor: "pointer", fontFamily: "inherit", display: "block", touchAction: "manipulation" },
  smBtn: { background: "rgba(90,158,143,0.1)", color: "#5a9e8f", border: "1px solid rgba(90,158,143,0.2)", borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer", fontFamily: "inherit", touchAction: "manipulation" },
  sendBtn: { background: "rgba(90,158,143,0.08)", color: "#5a9e8f", border: "1px solid rgba(90,158,143,0.2)", borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", touchAction: "manipulation" },
  cancelBtn: { background: "rgba(224,123,123,0.08)", color: "#e07b7b", border: "1px solid rgba(224,123,123,0.2)", borderRadius: 8, padding: "8px 13px", fontSize: 13, cursor: "pointer", fontFamily: "inherit", touchAction: "manipulation" },
  miniBtn: { background: "rgba(126,156,201,0.08)", color: "#7e9cc9", border: "1px solid rgba(126,156,201,0.2)", borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer", fontFamily: "inherit", touchAction: "manipulation" },
  xBtn: { background: "rgba(224,123,123,0.08)", color: "#e07b7b", border: "none", borderRadius: 8, padding: "10px 12px", cursor: "pointer", fontSize: 14, touchAction: "manipulation" },
  qBtn: { background: "rgba(126,156,201,0.08)", color: "#7e9cc9", border: "1px solid rgba(126,156,201,0.2)", borderRadius: 10, padding: "12px 18px", fontSize: 14, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s", touchAction: "manipulation" },

  idCard: { background: "linear-gradient(135deg,#0d1f28,#102030 60%,#0d1f28)", border: "1px solid rgba(90,158,143,0.25)", borderRadius: 20, padding: "28px 24px 16px", boxShadow: "0 20px 60px rgba(0,0,0,0.5),inset 0 1px 0 rgba(90,158,143,0.15)" },
  idTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  idHosp: { color: "#5a9e8f", fontSize: 15, fontWeight: 700, letterSpacing: 0.5 },
  idLbl: { background: "rgba(90,158,143,0.12)", border: "1px solid rgba(90,158,143,0.25)", borderRadius: 6, padding: "4px 10px", fontSize: 10, color: "#5a9e8f", letterSpacing: 1.5 },
  idBody: { display: "flex", alignItems: "center", gap: 16, marginBottom: 24 },
  idAv: { width: 64, height: 64, borderRadius: 16, background: "linear-gradient(135deg,#5a9e8f,#3d8070)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 700, color: "#fff", flexShrink: 0 },
  idName: { fontSize: 22, fontWeight: 700, color: "#dce8ef", marginBottom: 4 },
  idMeta: { fontSize: 14, color: "#8fa3b0", marginBottom: 3 },
  idFoot: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderTop: "1px solid rgba(90,158,143,0.12)", paddingTop: 16, marginBottom: 12 },
  idNum: { fontFamily: "monospace", fontSize: 20, fontWeight: 700, color: "#5a9e8f", letterSpacing: 2 },
  idDate: { fontSize: 12, color: "#5a6a72" },
  idBar: { fontFamily: "monospace", fontSize: 10, color: "rgba(90,158,143,0.2)", letterSpacing: 1, textAlign: "center" },

  dBanner: { display: "flex", alignItems: "center", gap: 14, background: "rgba(90,158,143,0.05)", border: "1px solid rgba(90,158,143,0.11)", borderRadius: 16, padding: "18px 16px", marginBottom: 18, flexWrap: "wrap" },
  dAv: { width: 56, height: 56, borderRadius: 14, background: "linear-gradient(135deg,#5a9e8f,#3d8070)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700, color: "#fff", flexShrink: 0 },
  dName: { fontSize: 20, fontWeight: 700, color: "#dce8ef", marginBottom: 3 },
  dMeta: { fontSize: 13, color: "#8fa3b0", marginBottom: 2 },
  visitBadge: { background: "rgba(90,158,143,0.1)", border: "1px solid rgba(90,158,143,0.2)", borderRadius: 8, padding: "5px 12px", fontSize: 12, color: "#5a9e8f", letterSpacing: 0.5 },
  tabBar: { display: "flex", gap: 0, borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 18, overflowX: "auto", WebkitOverflowScrolling: "touch" },
  tab: { background: "transparent", border: "none", borderBottom: "2px solid transparent", color: "#5a6a72", padding: "12px 14px", fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5, fontFamily: "inherit", transition: "all 0.2s", touchAction: "manipulation", flexShrink: 0 },
  tabOn: { color: "#5a9e8f", borderBottomColor: "#5a9e8f" },
  tBadge: { background: "rgba(90,158,143,0.15)", color: "#5a9e8f", borderRadius: 10, padding: "2px 7px", fontSize: 11, fontWeight: 700 },

  statsRow: { display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10, marginBottom: 14 },
  statCard: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "16px 12px", textAlign: "center" },
  statV: { fontSize: 28, fontWeight: 700, lineHeight: 1.1, marginTop: 4 },
  statL: { fontSize: 11, color: "#5a6a72", marginTop: 4, textTransform: "uppercase", letterSpacing: 0.8 },
  card: { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "18px 16px" },
  addCard: { background: "rgba(90,158,143,0.04)", border: "1px solid rgba(90,158,143,0.12)", borderRadius: 14, padding: "18px 16px", marginBottom: 18 },
  infoGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  iKey: { fontSize: 11, color: "#5a6a72", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 3, fontWeight: 600 },
  iVal: { fontSize: 14, color: "#a8bfc9" },

  hxCard: { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, marginBottom: 12, overflow: "hidden" },
  hxTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "16px", cursor: "pointer" },
  hxDate: { fontSize: 12, color: "#8fa3b0", marginBottom: 3 },
  hxDr: { color: "#7e9cc9" },
  hxDiag: { fontSize: 16, fontWeight: 700, color: "#dce8ef", marginBottom: 4 },
  hxCompl: { fontSize: 13, color: "#8fa3b0", lineHeight: 1.5 },
  hxBody: { borderTop: "1px solid rgba(255,255,255,0.05)", padding: "16px", background: "rgba(0,0,0,0.12)" },
  hxText: { fontSize: 14, color: "#a8bfc9", lineHeight: 1.7, whiteSpace: "pre-wrap" },

  drCard: { display: "flex", alignItems: "center", gap: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "16px", marginBottom: 10, cursor: "pointer", transition: "all 0.2s", touchAction: "manipulation" },
  drAv: { width: 48, height: 48, borderRadius: 12, background: "linear-gradient(135deg,#7e9cc9,#5a7ab0)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: "#fff", flexShrink: 0 },
  drName: { fontSize: 16, fontWeight: 700, color: "#dce8ef", marginBottom: 2 },
  drSpec: { fontSize: 13, color: "#7e9cc9" },
  drPhone: { fontSize: 12, color: "#5a6a72", marginTop: 2 },
  drBadge: { background: "rgba(126,156,201,0.1)", color: "#7e9cc9", border: "1px solid rgba(126,156,201,0.15)", borderRadius: 6, padding: "3px 9px", fontSize: 11 },
  drDetailBanner: { display: "flex", alignItems: "flex-start", gap: 14, background: "rgba(126,156,201,0.05)", border: "1px solid rgba(126,156,201,0.12)", borderRadius: 14, padding: "16px", marginBottom: 16, flexWrap: "wrap" },

  rxCard: { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "16px", marginBottom: 12 },
  rxTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, flexWrap: "wrap", gap: 8 },
  rxId: { fontFamily: "monospace", fontSize: 12, color: "#7e9cc9", marginBottom: 2 },
  rxDate: { fontSize: 12, color: "#5a6a72" },
  rxDiag: { fontSize: 14, color: "#8fa3b0", marginBottom: 10 },
  rxNote: { marginTop: 10, fontSize: 13, color: "#5a6a72", background: "rgba(255,255,255,0.02)", borderRadius: 8, padding: "10px 12px" },
  medRow: { display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" },
  medIn: { flex: 1, minWidth: 80, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "10px 10px", color: "#dce8ef", fontSize: 14, outline: "none", fontFamily: "inherit", WebkitAppearance: "none" },
  medChip: { display: "flex", justifyContent: "space-between", background: "rgba(90,158,143,0.06)", borderRadius: 8, padding: "10px 12px", flexWrap: "wrap", gap: 4 },

  aptCard: { display: "flex", gap: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "14px 16px", marginBottom: 10, alignItems: "flex-start", flexWrap: "wrap" },
  aptLeft: { minWidth: 78, textAlign: "center", background: "rgba(126,156,201,0.07)", borderRadius: 10, padding: "10px 12px" },
  sBadge: { borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 700, letterSpacing: 0.3 },

  labCard: { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "14px 16px", marginBottom: 10 },

  noteCard: { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "14px 16px", marginBottom: 10 },
  noteType: { fontSize: 12, fontWeight: 700, color: "#7e9cc9", background: "rgba(126,156,201,0.1)", borderRadius: 6, padding: "3px 10px" },
  noteText: { fontSize: 14, color: "#a8bfc9", lineHeight: 1.7, whiteSpace: "pre-wrap", marginTop: 6 },

  smsCard: { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "14px 16px", marginBottom: 10 },
};

const CSS = `
* { box-sizing: border-box; }
html { font-size: 16px; -webkit-text-size-adjust: 100%; }
body { margin: 0; -webkit-tap-highlight-color: transparent; }
.fi { animation: fi 0.3s ease; }
@keyframes fi { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
@keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
.btn:active { opacity:0.75; transform:scale(0.97); }
@media (hover: hover) {
  .btn:hover { opacity:0.82; transform:translateY(-1px); }
  .hcard:hover { background:rgba(90,158,143,0.08) !important; border-color:rgba(90,158,143,0.22) !important; }
  .tabBtn:hover { color:#8fa3b0 !important; }
}
.hcard:active { background:rgba(90,158,143,0.1) !important; }
input:focus, select:focus, textarea:focus { border-color:rgba(90,158,143,0.45) !important; box-shadow:0 0 0 3px rgba(90,158,143,0.08); outline:none; }
input, select, textarea { font-size:16px !important; }
::-webkit-scrollbar { width:3px; height:3px; }
::-webkit-scrollbar-track { background:transparent; }
::-webkit-scrollbar-thumb { background:rgba(90,158,143,0.15); border-radius:3px; }
@media (min-width: 600px) {
  .g2-responsive { grid-template-columns: repeat(2, 1fr) !important; }
  .twoCol-responsive { grid-template-columns: repeat(2, 1fr) !important; }
}
`;
