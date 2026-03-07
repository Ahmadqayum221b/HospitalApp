import { useState, useEffect, useRef } from "react";

// ─── Helpers ────────────────────────────────────────────────────────────────
const genId = () => "MED-" + Math.floor(10000 + Math.random() * 90000);
const genRxId = () => "RX-" + Date.now().toString(36).toUpperCase();
const genApptId = () => "APT-" + Date.now().toString(36).toUpperCase();
const genLabId = () => "LAB-" + Date.now().toString(36).toUpperCase();

const fmt = (iso) => iso ? new Date(iso).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" }) : "—";
const fmtTime = (iso) => iso ? new Date(iso).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" }) : "—";
const fmtDT = (iso) => iso ? `${fmt(iso)} ${fmtTime(iso)}` : "—";

const PATIENTS_KEY = "hms_patients_v2";
const bloodGroups = ["A+","A-","B+","B-","AB+","AB-","O+","O-"];
const genders = ["Male","Female","Other"];

// ─── Storage ─────────────────────────────────────────────────────────────────
async function loadAll() {
  try {
    const r = await window.storage.get(PATIENTS_KEY);
    return r ? JSON.parse(r.value) : {};
  } catch { return {}; }
}
async function saveAll(data) {
  try { await window.storage.set(PATIENTS_KEY, JSON.stringify(data)); } catch {}
}

// ─── SMS Simulator ───────────────────────────────────────────────────────────
function simulateSMS(to, message) {
  return { to, message, sentAt: new Date().toISOString(), id: "SMS-" + Date.now() };
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [db, setDb] = useState({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("home");
  const [patient, setPatient] = useState(null);
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);

  useEffect(() => {
    loadAll().then(d => { setDb(d); setLoading(false); });
  }, []);

  const persist = async (updated) => {
    setDb(updated);
    await saveAll(updated);
  };

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const refreshPatient = (id, updatedDb) => {
    const source = updatedDb || db;
    if (id && source[id]) setPatient(source[id]);
  };

  if (loading) return <Loader />;

  return (
    <div style={S.root}>
      <style>{css}</style>
      <BgFx />
      <Header patientCount={Object.keys(db).length} onHome={() => { setView("home"); setPatient(null); }} />

      {toast && <Toast msg={toast.msg} type={toast.type} />}
      {modal && <Modal modal={modal} onClose={() => setModal(null)} db={db} persist={persist} showToast={showToast} refreshPatient={refreshPatient} />}

      <main style={S.main}>
        {view === "home" && <HomeView setView={setView} />}
        {view === "register" && <RegisterView db={db} persist={persist} setView={setView} setPatient={setPatient} showToast={showToast} />}
        {view === "lookup" && <LookupView db={db} setView={setView} setPatient={setPatient} showToast={showToast} persist={persist} />}
        {view === "dashboard" && patient && (
          <Dashboard
            patient={patient} db={db} persist={persist}
            showToast={showToast} setModal={setModal}
            refreshPatient={refreshPatient} setView={setView}
          />
        )}
        {view === "card" && patient && <IDCard patient={patient} setView={setView} />}
      </main>
    </div>
  );
}

// ─── Views ────────────────────────────────────────────────────────────────────

function HomeView({ setView }) {
  return (
    <div style={S.homeWrap} className="fadeIn">
      <div style={S.heroBlock}>
        <div style={S.heroBadge}>⚕ Hospital Management System</div>
        <h1 style={S.heroTitle}>MediTrack<br /><span style={S.heroSub}>Patient Portal</span></h1>
        <p style={S.heroDesc}>Prescriptions · Appointments · Lab Reports · SMS Reminders</p>
      </div>
      <div style={S.cardRow}>
        {[
          { icon: "👤", title: "New Patient", desc: "Register and receive a permanent ID card", action: "register", accent: "#0ea5e9" },
          { icon: "🔍", title: "Returning Patient", desc: "Look up your record using your patient ID", action: "lookup", accent: "#10b981" },
        ].map(c => (
          <button key={c.action} style={{ ...S.homeCard, borderColor: c.accent + "40" }} className="homeCard" onClick={() => setView(c.action)}>
            <div style={{ ...S.homeCardIcon, background: c.accent + "20", color: c.accent }}>{c.icon}</div>
            <div style={S.homeCardTitle}>{c.title}</div>
            <div style={S.homeCardDesc}>{c.desc}</div>
            <div style={{ ...S.homeCardArrow, color: c.accent }}>→</div>
          </button>
        ))}
      </div>
      <div style={S.featurePills}>
        {["💊 Prescription History","📅 Appointments","📋 Lab Reports","📱 SMS Reminders","🖨 Digital Prescriptions"].map(f => (
          <span key={f} style={S.pill}>{f}</span>
        ))}
      </div>
    </div>
  );
}

function RegisterView({ db, persist, setView, setPatient, showToast }) {
  const [f, setF] = useState({ name:"",age:"",gender:"",blood:"",phone:"",address:"",allergies:"",conditions:"",emergency:"",notes:"" });
  const [err, setErr] = useState("");

  const submit = async () => {
    if (!f.name || !f.age || !f.gender || !f.blood || !f.phone) { setErr("Please fill all required (*) fields."); return; }
    const id = genId();
    const p = { ...f, id, registeredAt: new Date().toISOString(), visits: 0, prescriptions: [], appointments: [], labReports: [], smsLog: [] };
    const updated = { ...db, [id]: p };
    await persist(updated);
    setPatient(p);
    showToast("Patient registered! ID: " + id);
    setView("card");
  };

  return (
    <div style={S.formWrap} className="fadeIn">
      <BackBtn onClick={() => setView("home")} />
      <h2 style={S.formTitle}>New Patient Registration</h2>
      <p style={S.formNote}>Fields marked * are required</p>
      {err && <div style={S.errBox}>{err}</div>}
      <div style={S.grid2}>
        <F label="Full Name *" value={f.name} set={v => setF({...f,name:v})} placeholder="Ahmed Khan" />
        <F label="Age *" value={f.age} set={v => setF({...f,age:v})} placeholder="35" type="number" />
        <Sel label="Gender *" value={f.gender} set={v => setF({...f,gender:v})} opts={genders} />
        <Sel label="Blood Group *" value={f.blood} set={v => setF({...f,blood:v})} opts={bloodGroups} />
        <F label="Phone * (for SMS)" value={f.phone} set={v => setF({...f,phone:v})} placeholder="0300-1234567" />
        <F label="Emergency Contact" value={f.emergency} set={v => setF({...f,emergency:v})} placeholder="Name & number" />
      </div>
      <F label="Home Address" value={f.address} set={v => setF({...f,address:v})} placeholder="Full address" full />
      <F label="Known Allergies" value={f.allergies} set={v => setF({...f,allergies:v})} placeholder="e.g. Penicillin" full />
      <F label="Existing Conditions" value={f.conditions} set={v => setF({...f,conditions:v})} placeholder="e.g. Diabetes" full />
      <F label="Initial Notes" value={f.notes} set={v => setF({...f,notes:v})} placeholder="Doctor's observations..." full textarea />
      <button style={S.primaryBtn} className="btn" onClick={submit}>Generate Patient ID Card →</button>
    </div>
  );
}

function LookupView({ db, setView, setPatient, showToast, persist }) {
  const [id, setId] = useState("");
  const [err, setErr] = useState("");

  const lookup = () => {
    const key = id.trim().toUpperCase();
    if (!key) { setErr("Please enter a Patient ID."); return; }
    const p = db[key];
    if (!p) { setErr("No patient found. Please register first."); return; }
    const updated_p = { ...p, visits: (p.visits||0)+1, lastVisit: new Date().toISOString() };
    const updatedDb = { ...db, [key]: updated_p };
    persist(updatedDb);
    setPatient(updated_p);
    showToast(`Welcome back, ${p.name}!`);
    setView("dashboard");
  };

  return (
    <div style={S.lookupWrap} className="fadeIn">
      <BackBtn onClick={() => setView("home")} />
      <h2 style={S.formTitle}>Returning Patient</h2>
      <div style={S.lookupCard}>
        <div style={S.lookupIcon}>🪪</div>
        <p style={{ color:"#94a3b8", marginBottom:24 }}>Enter your Patient ID to access your full medical record</p>
        {err && <div style={S.errBox}>{err}</div>}
        <input style={S.lookupInput} value={id} onChange={e => setId(e.target.value.toUpperCase())}
          placeholder="e.g. MED-12345" onKeyDown={e => e.key==="Enter" && lookup()} autoFocus />
        <button style={S.primaryBtn} className="btn" onClick={lookup}>Retrieve Record →</button>
      </div>
    </div>
  );
}

function IDCard({ patient: p, setView }) {
  return (
    <div style={S.cardPageWrap} className="fadeIn">
      <div style={S.idCard}>
        <div style={S.idTop}>
          <span style={S.idHospital}>⚕ MediTrack Hospital</span>
          <span style={S.idBadgeLabel}>PATIENT CARD</span>
        </div>
        <div style={S.idBody}>
          <div style={S.idAvatar}>{p.name[0].toUpperCase()}</div>
          <div>
            <div style={S.idName}>{p.name}</div>
            <div style={S.idMeta}>{p.age} yrs · {p.gender} · {p.blood}</div>
            <div style={S.idMeta}>📞 {p.phone}</div>
          </div>
        </div>
        <div style={S.idFoot}>
          <div style={S.idNum}>{p.id}</div>
          <div style={S.idDate}>Registered: {fmt(p.registeredAt)}</div>
        </div>
        <div style={S.idBar}>▐█▌▐▌██▌▐█▌▐██▌▐▌█▌▐█▌▐</div>
      </div>
      <p style={{ color:"#10b981", textAlign:"center", margin:"20px 0", fontSize:15 }}>✅ Patient registered successfully! Save this ID for future visits.</p>
      <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
        <button style={S.primaryBtn} className="btn" onClick={() => setView("dashboard")}>Open Dashboard →</button>
        <button style={S.ghostBtn} className="btn" onClick={() => setView("home")}>Register Another</button>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard({ patient, db, persist, showToast, setModal, refreshPatient, setView }) {
  const [tab, setTab] = useState("overview");
  const p = db[patient.id] || patient;

  const tabs = [
    { id:"overview", label:"Overview", icon:"🏥" },
    { id:"prescriptions", label:"Prescriptions", icon:"💊" },
    { id:"appointments", label:"Appointments", icon:"📅" },
    { id:"lab", label:"Lab Reports", icon:"🔬" },
    { id:"sms", label:"SMS Log", icon:"📱" },
  ];

  return (
    <div style={S.dashWrap} className="fadeIn">
      {/* Patient Header */}
      <div style={S.dashHeader}>
        <div style={S.dashAvatar}>{p.name[0].toUpperCase()}</div>
        <div style={{ flex:1 }}>
          <div style={S.dashName}>{p.name}</div>
          <div style={S.dashMeta}>{p.id} · {p.age} yrs · {p.gender} · Blood: <b style={{ color:"#f87171" }}>{p.blood}</b></div>
          <div style={S.dashMeta}>📞 {p.phone} {p.lastVisit && `· Last visit: ${fmt(p.lastVisit)}`}</div>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <span style={S.visitBadge}>Visit #{p.visits || 1}</span>
          <button style={S.idBtn} className="btn" onClick={() => setView("card")}>🪪 ID Card</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={S.tabBar}>
        {tabs.map(t => (
          <button key={t.id} style={{ ...S.tab, ...(tab===t.id ? S.tabActive : {}) }} className="tabBtn" onClick={() => setTab(t.id)}>
            <span>{t.icon}</span> {t.label}
            {t.id==="prescriptions" && p.prescriptions?.length > 0 && <span style={S.tabBadge}>{p.prescriptions.length}</span>}
            {t.id==="appointments" && p.appointments?.length > 0 && <span style={S.tabBadge}>{p.appointments.length}</span>}
            {t.id==="lab" && p.labReports?.length > 0 && <span style={S.tabBadge}>{p.labReports.length}</span>}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={S.tabContent}>
        {tab==="overview" && <OverviewTab p={p} db={db} persist={persist} showToast={showToast} refreshPatient={refreshPatient} />}
        {tab==="prescriptions" && <PrescriptionsTab p={p} db={db} persist={persist} showToast={showToast} setModal={setModal} refreshPatient={refreshPatient} />}
        {tab==="appointments" && <AppointmentsTab p={p} db={db} persist={persist} showToast={showToast} refreshPatient={refreshPatient} />}
        {tab==="lab" && <LabTab p={p} db={db} persist={persist} showToast={showToast} refreshPatient={refreshPatient} />}
        {tab==="sms" && <SMSTab p={p} db={db} persist={persist} showToast={showToast} refreshPatient={refreshPatient} />}
      </div>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab({ p, db, persist, showToast, refreshPatient }) {
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState({ ...p });

  const save = async () => {
    const updated = { ...db, [p.id]: { ...db[p.id], ...f } };
    await persist(updated);
    refreshPatient(p.id, updated);
    showToast("Profile updated!");
    setEditing(false);
  };

  const latest_rx = p.prescriptions?.slice(-1)[0];
  const next_apt = p.appointments?.filter(a => new Date(a.date) > new Date()).sort((a,b)=>new Date(a.date)-new Date(b.date))[0];

  return (
    <div>
      {/* Quick Stats */}
      <div style={S.statsRow}>
        {[
          { label:"Prescriptions", val: p.prescriptions?.length||0, icon:"💊", color:"#0ea5e9" },
          { label:"Appointments", val: p.appointments?.length||0, icon:"📅", color:"#10b981" },
          { label:"Lab Reports", val: p.labReports?.length||0, icon:"🔬", color:"#f59e0b" },
          { label:"SMS Sent", val: p.smsLog?.length||0, icon:"📱", color:"#8b5cf6" },
        ].map(s => (
          <div key={s.label} style={{ ...S.statCard, borderColor: s.color+"40" }}>
            <div style={{ fontSize:24 }}>{s.icon}</div>
            <div style={{ ...S.statVal, color: s.color }}>{s.val}</div>
            <div style={S.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {latest_rx && (
        <div style={S.alertCard}>
          <span style={{ fontSize:18 }}>💊</span>
          <div><div style={{ color:"#0ea5e9", fontWeight:700, fontSize:13 }}>LATEST PRESCRIPTION</div>
          <div style={{ color:"#e2e8f0", fontSize:14 }}>{latest_rx.medicines?.map(m=>m.name).join(", ")} — {fmt(latest_rx.date)}</div></div>
        </div>
      )}
      {next_apt && (
        <div style={{ ...S.alertCard, borderColor:"#10b98140" }}>
          <span style={{ fontSize:18 }}>📅</span>
          <div><div style={{ color:"#10b981", fontWeight:700, fontSize:13 }}>NEXT APPOINTMENT</div>
          <div style={{ color:"#e2e8f0", fontSize:14 }}>{fmt(next_apt.date)} at {next_apt.time} — {next_apt.type}</div></div>
        </div>
      )}

      {/* Profile Edit */}
      <div style={S.sectionCard}>
        <div style={S.sectionHead}>
          <span style={S.sectionTitle}>Patient Information</span>
          <button style={S.editBtn} className="btn" onClick={() => setEditing(!editing)}>{editing ? "Cancel" : "✏️ Edit"}</button>
        </div>
        {editing ? (
          <div>
            <div style={S.grid2}>
              <F label="Full Name" value={f.name} set={v=>setF({...f,name:v})} />
              <F label="Age" value={f.age} set={v=>setF({...f,age:v})} type="number" />
              <F label="Phone" value={f.phone} set={v=>setF({...f,phone:v})} />
              <F label="Emergency" value={f.emergency} set={v=>setF({...f,emergency:v})} />
            </div>
            <F label="Address" value={f.address} set={v=>setF({...f,address:v})} full />
            <F label="Allergies" value={f.allergies} set={v=>setF({...f,allergies:v})} full />
            <F label="Conditions" value={f.conditions} set={v=>setF({...f,conditions:v})} full />
            <F label="Notes" value={f.notes} set={v=>setF({...f,notes:v})} full textarea />
            <button style={S.primaryBtn} className="btn" onClick={save}>💾 Save Changes</button>
          </div>
        ) : (
          <div style={S.infoGrid}>
            {[["Blood Group",p.blood],["Phone",p.phone],["Emergency",p.emergency||"—"],["Address",p.address||"—"],["Allergies",p.allergies||"None"],["Conditions",p.conditions||"None"]].map(([k,v])=>(
              <div key={k} style={S.infoItem}><div style={S.infoKey}>{k}</div><div style={S.infoVal}>{v}</div></div>
            ))}
            {p.notes && <div style={{ ...S.infoItem, gridColumn:"1/-1" }}><div style={S.infoKey}>Notes</div><div style={S.infoVal}>{p.notes}</div></div>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Prescriptions Tab ────────────────────────────────────────────────────────
function PrescriptionsTab({ p, db, persist, showToast, refreshPatient }) {
  const [adding, setAdding] = useState(false);
  const [rx, setRx] = useState({ diagnosis:"", medicines:[{name:"",dose:"",freq:"",days:""}], instructions:"" });

  const addMed = () => setRx({...rx, medicines:[...rx.medicines,{name:"",dose:"",freq:"",days:""}]});
  const updMed = (i, field, val) => {
    const m = [...rx.medicines]; m[i]={...m[i],[field]:val}; setRx({...rx,medicines:m});
  };
  const remMed = (i) => { const m = rx.medicines.filter((_,idx)=>idx!==i); setRx({...rx,medicines:m}); };

  const savePrescription = async () => {
    if (!rx.diagnosis || rx.medicines.some(m=>!m.name)) { showToast("Fill diagnosis and all medicine names","error"); return; }
    const newRx = { ...rx, id: genRxId(), date: new Date().toISOString(), doctor:"Dr. Attending" };
    const updated_p = { ...db[p.id], prescriptions:[...(db[p.id].prescriptions||[]), newRx] };
    const updatedDb = { ...db, [p.id]: updated_p };
    await persist(updatedDb);
    refreshPatient(p.id, updatedDb);
    showToast("Prescription saved!");
    setAdding(false);
    setRx({ diagnosis:"", medicines:[{name:"",dose:"",freq:"",days:""}], instructions:"" });
  };

  const sendToPhone = async (rxItem) => {
    const msg = `[MediTrack] Prescription ${rxItem.id}\nDiagnosis: ${rxItem.diagnosis}\nMedicines: ${rxItem.medicines.map(m=>`${m.name} ${m.dose} x${m.freq} for ${m.days} days`).join(", ")}\nInstructions: ${rxItem.instructions||"None"}`;
    const sms = simulateSMS(p.phone, msg);
    const updated_p = { ...db[p.id], smsLog:[...(db[p.id].smsLog||[]), sms] };
    const updatedDb = { ...db, [p.id]: updated_p };
    await persist(updatedDb);
    refreshPatient(p.id, updatedDb);
    showToast(`📱 Prescription sent to ${p.phone}`);
  };

  const prescriptions = (db[p.id]?.prescriptions || []).slice().reverse();

  return (
    <div>
      <div style={S.tabActionBar}>
        <span style={S.tabHeading}>💊 Prescription History ({prescriptions.length})</span>
        <button style={S.primaryBtn} className="btn" onClick={()=>setAdding(!adding)}>{adding?"Cancel":"+ New Prescription"}</button>
      </div>

      {adding && (
        <div style={S.addCard}>
          <h3 style={S.addCardTitle}>Write New Prescription</h3>
          <F label="Diagnosis *" value={rx.diagnosis} set={v=>setRx({...rx,diagnosis:v})} placeholder="e.g. Upper Respiratory Infection" full />
          <div style={{ marginBottom:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
              <label style={S.label}>Medicines *</label>
              <button style={S.addMedBtn} className="btn" onClick={addMed}>+ Add Medicine</button>
            </div>
            {rx.medicines.map((m,i)=>(
              <div key={i} style={S.medRow}>
                <input style={{...S.medInput,flex:2}} placeholder="Medicine name" value={m.name} onChange={e=>updMed(i,"name",e.target.value)} />
                <input style={S.medInput} placeholder="Dose (e.g. 500mg)" value={m.dose} onChange={e=>updMed(i,"dose",e.target.value)} />
                <input style={S.medInput} placeholder="Frequency (e.g. 3x/day)" value={m.freq} onChange={e=>updMed(i,"freq",e.target.value)} />
                <input style={{...S.medInput,width:70}} placeholder="Days" value={m.days} onChange={e=>updMed(i,"days",e.target.value)} />
                {rx.medicines.length>1 && <button style={S.remBtn} onClick={()=>remMed(i)}>✕</button>}
              </div>
            ))}
          </div>
          <F label="Instructions" value={rx.instructions} set={v=>setRx({...rx,instructions:v})} placeholder="Take after meals, avoid driving..." full textarea />
          <div style={{ display:"flex", gap:10 }}>
            <button style={S.primaryBtn} className="btn" onClick={savePrescription}>💾 Save Prescription</button>
          </div>
        </div>
      )}

      {prescriptions.length === 0 && !adding && <EmptyState icon="💊" msg="No prescriptions yet" />}

      {prescriptions.map(rx => (
        <div key={rx.id} style={S.rxCard}>
          <div style={S.rxCardHead}>
            <div>
              <div style={S.rxId}>{rx.id}</div>
              <div style={S.rxDate}>{fmtDT(rx.date)} · {rx.doctor}</div>
            </div>
            <button style={S.sendBtn} className="btn" onClick={()=>sendToPhone(rx)}>📱 Send to Phone</button>
          </div>
          <div style={S.rxDiag}>Diagnosis: <b>{rx.diagnosis}</b></div>
          <div style={S.rxMedList}>
            {rx.medicines.map((m,i)=>(
              <div key={i} style={S.rxMedItem}>
                <span style={S.rxMedName}>💊 {m.name}</span>
                <span style={S.rxMedDetail}>{m.dose} · {m.freq} · {m.days} days</span>
              </div>
            ))}
          </div>
          {rx.instructions && <div style={S.rxNote}>📋 {rx.instructions}</div>}
        </div>
      ))}
    </div>
  );
}

// ─── Appointments Tab ─────────────────────────────────────────────────────────
function AppointmentsTab({ p, db, persist, showToast, refreshPatient }) {
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ date:"", time:"09:00", type:"General Checkup", notes:"" });
  const apptTypes = ["General Checkup","Follow-up","Lab Review","Emergency","Specialist Referral","Vaccination"];

  const book = async () => {
    if (!f.date || !f.time) { showToast("Select date and time","error"); return; }
    const apt = { ...f, id: genApptId(), bookedAt: new Date().toISOString(), status:"Scheduled" };
    // SMS reminder
    const msg = `[MediTrack] Appointment Confirmed\nDate: ${fmt(f.date)} at ${f.time}\nType: ${f.type}\nPatient: ${p.name} (${p.id})\nPlease arrive 10 mins early.`;
    const sms = simulateSMS(p.phone, msg);
    const updated_p = {
      ...db[p.id],
      appointments: [...(db[p.id].appointments||[]), apt],
      smsLog: [...(db[p.id].smsLog||[]), sms]
    };
    const updatedDb = { ...db, [p.id]: updated_p };
    await persist(updatedDb);
    refreshPatient(p.id, updatedDb);
    showToast(`📅 Appointment booked + SMS sent to ${p.phone}`);
    setAdding(false);
    setF({ date:"", time:"09:00", type:"General Checkup", notes:"" });
  };

  const cancel = async (aptId) => {
    const apts = (db[p.id].appointments||[]).map(a => a.id===aptId ? {...a, status:"Cancelled"} : a);
    const updated_p = { ...db[p.id], appointments: apts };
    const updatedDb = { ...db, [p.id]: updated_p };
    await persist(updatedDb);
    refreshPatient(p.id, updatedDb);
    showToast("Appointment cancelled");
  };

  const appointments = (db[p.id]?.appointments || []).slice().reverse();
  const upcoming = appointments.filter(a => new Date(a.date) >= new Date() && a.status!=="Cancelled");
  const past = appointments.filter(a => new Date(a.date) < new Date() || a.status==="Cancelled");

  return (
    <div>
      <div style={S.tabActionBar}>
        <span style={S.tabHeading}>📅 Appointments ({appointments.length})</span>
        <button style={S.primaryBtn} className="btn" onClick={()=>setAdding(!adding)}>{adding?"Cancel":"+ Book Appointment"}</button>
      </div>

      {adding && (
        <div style={S.addCard}>
          <h3 style={S.addCardTitle}>Book New Appointment</h3>
          <div style={S.grid2}>
            <F label="Date *" value={f.date} set={v=>setF({...f,date:v})} type="date" />
            <F label="Time *" value={f.time} set={v=>setF({...f,time:v})} type="time" />
            <Sel label="Type" value={f.type} set={v=>setF({...f,type:v})} opts={apptTypes} span />
          </div>
          <F label="Notes" value={f.notes} set={v=>setF({...f,notes:v})} placeholder="Reason for visit..." full />
          <button style={S.primaryBtn} className="btn" onClick={book}>📅 Book + Send SMS Reminder</button>
        </div>
      )}

      {upcoming.length > 0 && <div style={S.aptGroupLabel}>🟢 Upcoming</div>}
      {upcoming.map(a => <AptCard key={a.id} a={a} onCancel={()=>cancel(a.id)} />)}
      {past.length > 0 && <div style={S.aptGroupLabel}>⬜ Past / Cancelled</div>}
      {past.map(a => <AptCard key={a.id} a={a} past />)}
      {appointments.length === 0 && !adding && <EmptyState icon="📅" msg="No appointments booked" />}
    </div>
  );
}

function AptCard({ a, onCancel, past }) {
  const statusColor = { Scheduled:"#10b981", Cancelled:"#ef4444", Completed:"#0ea5e9" };
  return (
    <div style={{ ...S.aptCard, opacity: past ? 0.6 : 1 }}>
      <div style={S.aptCardLeft}>
        <div style={S.aptDate}>{fmt(a.date)}</div>
        <div style={S.aptTime}>{a.time}</div>
      </div>
      <div style={S.aptCardMid}>
        <div style={S.aptType}>{a.type}</div>
        {a.notes && <div style={S.aptNotes}>{a.notes}</div>}
        <div style={S.aptBooked}>Booked: {fmt(a.bookedAt)}</div>
      </div>
      <div style={S.aptCardRight}>
        <span style={{ ...S.statusBadge, background: (statusColor[a.status]||"#64748b")+"22", color: statusColor[a.status]||"#94a3b8" }}>{a.status}</span>
        {!past && <button style={S.cancelBtn} className="btn" onClick={onCancel}>Cancel</button>}
      </div>
    </div>
  );
}

// ─── Lab Reports Tab ──────────────────────────────────────────────────────────
function LabTab({ p, db, persist, showToast, refreshPatient }) {
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ testName:"", result:"", range:"", status:"Normal", notes:"", date: new Date().toISOString().slice(0,10) });
  const statuses = ["Normal","Abnormal","Critical","Pending"];

  const save = async () => {
    if (!f.testName || !f.result) { showToast("Enter test name and result","error"); return; }
    const lab = { ...f, id: genLabId(), uploadedAt: new Date().toISOString() };
    const updated_p = { ...db[p.id], labReports:[...(db[p.id].labReports||[]), lab] };
    const updatedDb = { ...db, [p.id]: updated_p };
    await persist(updatedDb);
    refreshPatient(p.id, updatedDb);
    showToast("Lab report saved!");
    setAdding(false);
    setF({ testName:"", result:"", range:"", status:"Normal", notes:"", date: new Date().toISOString().slice(0,10) });
  };

  const sendReport = async (lab) => {
    const msg = `[MediTrack] Lab Report\nTest: ${lab.testName}\nResult: ${lab.result} (Normal range: ${lab.range||"N/A"})\nStatus: ${lab.status}\nDate: ${fmt(lab.date)}\n${lab.notes?"Notes: "+lab.notes:""}`;
    const sms = simulateSMS(p.phone, msg);
    const updated_p = { ...db[p.id], smsLog:[...(db[p.id].smsLog||[]), sms] };
    const updatedDb = { ...db, [p.id]: updated_p };
    await persist(updatedDb);
    refreshPatient(p.id, updatedDb);
    showToast(`📱 Lab report sent to ${p.phone}`);
  };

  const reports = (db[p.id]?.labReports || []).slice().reverse();
  const statusColor = { Normal:"#10b981", Abnormal:"#f59e0b", Critical:"#ef4444", Pending:"#64748b" };

  return (
    <div>
      <div style={S.tabActionBar}>
        <span style={S.tabHeading}>🔬 Lab Reports ({reports.length})</span>
        <button style={S.primaryBtn} className="btn" onClick={()=>setAdding(!adding)}>{adding?"Cancel":"+ Add Report"}</button>
      </div>

      {adding && (
        <div style={S.addCard}>
          <h3 style={S.addCardTitle}>Add Lab Report</h3>
          <div style={S.grid2}>
            <F label="Test Name *" value={f.testName} set={v=>setF({...f,testName:v})} placeholder="e.g. Blood CBC, HbA1c" />
            <F label="Date" value={f.date} set={v=>setF({...f,date:v})} type="date" />
            <F label="Result *" value={f.result} set={v=>setF({...f,result:v})} placeholder="e.g. 11.2 g/dL" />
            <F label="Normal Range" value={f.range} set={v=>setF({...f,range:v})} placeholder="e.g. 12–16 g/dL" />
            <Sel label="Status" value={f.status} set={v=>setF({...f,status:v})} opts={statuses} />
          </div>
          <F label="Notes" value={f.notes} set={v=>setF({...f,notes:v})} placeholder="Doctor's observations..." full textarea />
          <button style={S.primaryBtn} className="btn" onClick={save}>💾 Save Report</button>
        </div>
      )}

      {reports.length === 0 && !adding && <EmptyState icon="🔬" msg="No lab reports uploaded" />}

      {reports.map(lab => (
        <div key={lab.id} style={S.labCard}>
          <div style={S.labCardHead}>
            <div>
              <div style={S.labTestName}>{lab.testName}</div>
              <div style={S.labDate}>{fmt(lab.date)} · {lab.id}</div>
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <span style={{ ...S.statusBadge, background:(statusColor[lab.status]||"#64748b")+"22", color:statusColor[lab.status]||"#94a3b8" }}>{lab.status}</span>
              <button style={S.sendBtn} className="btn" onClick={()=>sendReport(lab)}>📱 Send</button>
            </div>
          </div>
          <div style={S.labResultRow}>
            <div style={S.labResult}>Result: <b style={{ color:"#e2e8f0" }}>{lab.result}</b></div>
            {lab.range && <div style={S.labRange}>Normal: {lab.range}</div>}
          </div>
          {lab.notes && <div style={S.rxNote}>📋 {lab.notes}</div>}
        </div>
      ))}
    </div>
  );
}

// ─── SMS Tab ──────────────────────────────────────────────────────────────────
function SMSTab({ p, db, persist, showToast, refreshPatient }) {
  const [msg, setMsg] = useState("");

  const sendCustom = async () => {
    if (!msg.trim()) return;
    const sms = simulateSMS(p.phone, `[MediTrack] ${msg}`);
    const updated_p = { ...db[p.id], smsLog:[...(db[p.id].smsLog||[]), sms] };
    const updatedDb = { ...db, [p.id]: updated_p };
    await persist(updatedDb);
    refreshPatient(p.id, updatedDb);
    showToast(`📱 SMS sent to ${p.phone}`);
    setMsg("");
  };

  const sendMedReminder = async () => {
    const latest = db[p.id]?.prescriptions?.slice(-1)[0];
    const meds = latest ? latest.medicines.map(m=>m.name).join(", ") : "your prescribed medicines";
    const sms = simulateSMS(p.phone, `[MediTrack] Medicine Reminder 💊\nPlease take ${meds} as prescribed.\nStay healthy! — MediTrack`);
    const updated_p = { ...db[p.id], smsLog:[...(db[p.id].smsLog||[]), sms] };
    const updatedDb = { ...db, [p.id]: updated_p };
    await persist(updatedDb);
    refreshPatient(p.id, updatedDb);
    showToast("💊 Medicine reminder sent!");
  };

  const sendVisitReminder = async () => {
    const next = db[p.id]?.appointments?.filter(a=>new Date(a.date)>new Date()&&a.status!=="Cancelled").sort((a,b)=>new Date(a.date)-new Date(b.date))[0];
    const detail = next ? `on ${fmt(next.date)} at ${next.time}` : "soon (please book an appointment)";
    const sms = simulateSMS(p.phone, `[MediTrack] Visit Reminder 📅\nYou have an upcoming visit ${detail}.\nPlease confirm or contact us if you need to reschedule.`);
    const updated_p = { ...db[p.id], smsLog:[...(db[p.id].smsLog||[]), sms] };
    const updatedDb = { ...db, [p.id]: updated_p };
    await persist(updatedDb);
    refreshPatient(p.id, updatedDb);
    showToast("📅 Visit reminder sent!");
  };

  const smsLog = (db[p.id]?.smsLog || []).slice().reverse();

  return (
    <div>
      <div style={S.tabActionBar}>
        <span style={S.tabHeading}>📱 SMS Log ({smsLog.length})</span>
      </div>

      <div style={S.smsQuickBtns}>
        <button style={S.quickBtn} className="btn" onClick={sendMedReminder}>💊 Send Medicine Reminder</button>
        <button style={{ ...S.quickBtn, borderColor:"#10b98140", color:"#10b981" }} className="btn" onClick={sendVisitReminder}>📅 Send Visit Reminder</button>
      </div>

      <div style={S.smsComposeBox}>
        <label style={S.label}>Custom SMS to {p.phone}</label>
        <div style={{ display:"flex", gap:8 }}>
          <input style={{ ...S.lookupInput, flex:1 }} value={msg} onChange={e=>setMsg(e.target.value)} placeholder="Type a custom message..." onKeyDown={e=>e.key==="Enter"&&sendCustom()} />
          <button style={S.primaryBtn} className="btn" onClick={sendCustom}>Send</button>
        </div>
      </div>

      {smsLog.length === 0 && <EmptyState icon="📱" msg="No SMS messages sent yet" />}

      {smsLog.map(sms => (
        <div key={sms.id} style={S.smsCard}>
          <div style={S.smsHead}>
            <span style={S.smsTo}>📱 {sms.to}</span>
            <span style={S.smsTime}>{fmtDT(sms.sentAt)}</span>
          </div>
          <div style={S.smsMsg}>{sms.message}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Small Components ─────────────────────────────────────────────────────────
function F({ label, value, set, placeholder, type="text", full, textarea }) {
  const w = full ? "100%" : undefined;
  return (
    <div style={{ marginBottom:14, width:w }}>
      <label style={S.label}>{label}</label>
      {textarea
        ? <textarea style={{ ...S.input, ...S.textarea, width:"100%", boxSizing:"border-box" }} value={value} onChange={e=>set(e.target.value)} placeholder={placeholder} />
        : <input style={{ ...S.input, width: full?"100%":undefined, boxSizing: full?"border-box":undefined }} type={type} value={value} onChange={e=>set(e.target.value)} placeholder={placeholder} />
      }
    </div>
  );
}

function Sel({ label, value, set, opts }) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={S.label}>{label}</label>
      <select style={S.input} value={value} onChange={e=>set(e.target.value)}>
        <option value="">Select…</option>
        {opts.map(o=><option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function BackBtn({ onClick }) {
  return <button style={S.backBtn} className="btn" onClick={onClick}>← Back</button>;
}

function EmptyState({ icon, msg }) {
  return <div style={S.emptyState}><div style={{ fontSize:40, marginBottom:8 }}>{icon}</div><div style={{ color:"#64748b" }}>{msg}</div></div>;
}

function Toast({ msg, type }) {
  return <div style={{ ...S.toast, background: type==="error"?"#7f1d1d":"#064e3b", borderColor: type==="error"?"#ef444440":"#10b98140" }}>{msg}</div>;
}

function Modal() { return null; }

function Loader() {
  return (
    <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh",background:"#040d1a" }}>
      <div style={{ fontSize:60,animation:"spin 2s linear infinite" }}>⚕</div>
      <div style={{ color:"#475569",fontFamily:"monospace",marginTop:16 }}>Loading MediTrack…</div>
    </div>
  );
}

function Header({ patientCount, onHome }) {
  return (
    <header style={S.header}>
      <div style={S.logo} onClick={onHome}>
        <span style={S.logoIcon}>⚕</span>
        <div>
          <div style={S.logoName}>MediTrack</div>
          <div style={S.logoSub}>Hospital Management System</div>
        </div>
      </div>
      <div style={S.headerStats}>{patientCount} patients on record</div>
    </header>
  );
}

function BgFx() {
  return (
    <>
      <div style={{ position:"fixed",inset:0,zIndex:0,backgroundImage:"linear-gradient(rgba(14,165,233,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(14,165,233,0.03) 1px,transparent 1px)",backgroundSize:"44px 44px",pointerEvents:"none" }} />
      <div style={{ position:"fixed",top:-300,right:-300,width:700,height:700,background:"radial-gradient(circle,rgba(14,165,233,0.1) 0%,transparent 70%)",zIndex:0,pointerEvents:"none" }} />
      <div style={{ position:"fixed",bottom:-300,left:-300,width:600,height:600,background:"radial-gradient(circle,rgba(99,102,241,0.08) 0%,transparent 70%)",zIndex:0,pointerEvents:"none" }} />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  root:{ minHeight:"100vh",background:"#040d1a",fontFamily:"'Palatino Linotype','Book Antiqua',Palatino,serif",color:"#e2e8f0",position:"relative",overflowX:"hidden" },
  main:{ position:"relative",zIndex:1,maxWidth:920,margin:"0 auto",padding:"24px 20px 60px" },
  header:{ position:"sticky",top:0,zIndex:100,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 32px",borderBottom:"1px solid rgba(14,165,233,0.12)",background:"rgba(4,13,26,0.92)",backdropFilter:"blur(12px)" },
  logo:{ display:"flex",alignItems:"center",gap:12,cursor:"pointer" },
  logoIcon:{ fontSize:28,filter:"drop-shadow(0 0 8px #0ea5e9)" },
  logoName:{ fontSize:20,fontWeight:700,color:"#e2e8f0",letterSpacing:1 },
  logoSub:{ fontSize:11,color:"#475569",letterSpacing:2,textTransform:"uppercase" },
  headerStats:{ fontSize:12,color:"#475569",fontFamily:"monospace" },

  homeWrap:{ paddingTop:32 },
  heroBlock:{ textAlign:"center",marginBottom:40 },
  heroBadge:{ display:"inline-block",padding:"6px 18px",border:"1px solid rgba(14,165,233,0.3)",borderRadius:20,fontSize:12,color:"#0ea5e9",letterSpacing:2,textTransform:"uppercase",marginBottom:20 },
  heroTitle:{ fontSize:"clamp(36px,6vw,64px)",fontWeight:700,lineHeight:1.1,color:"#f1f5f9",marginBottom:12 },
  heroSub:{ color:"#0ea5e9" },
  heroDesc:{ color:"#64748b",fontSize:15,letterSpacing:1 },
  cardRow:{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:20,marginBottom:32 },
  homeCard:{ background:"rgba(14,165,233,0.04)",border:"1px solid rgba(14,165,233,0.15)",borderRadius:16,padding:28,textAlign:"left",cursor:"pointer",transition:"all 0.25s" },
  homeCardAlt:{ borderColor:"rgba(16,185,129,0.15)" },
  homeCardIcon:{ width:48,height:48,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,marginBottom:16 },
  homeCardTitle:{ fontSize:20,fontWeight:700,color:"#f1f5f9",marginBottom:8 },
  homeCardDesc:{ color:"#64748b",fontSize:14,lineHeight:1.6,marginBottom:20 },
  homeCardArrow:{ fontSize:18,fontWeight:700 },
  featurePills:{ display:"flex",flexWrap:"wrap",gap:8,justifyContent:"center",paddingTop:8 },
  pill:{ padding:"6px 14px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:20,fontSize:12,color:"#94a3b8" },

  formWrap:{ maxWidth:680,margin:"0 auto" },
  formTitle:{ fontSize:26,fontWeight:700,color:"#f1f5f9",marginBottom:4,marginTop:8 },
  formNote:{ color:"#64748b",fontSize:13,marginBottom:24 },
  errBox:{ background:"rgba(239,68,68,0.12)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:8,padding:"10px 14px",color:"#fca5a5",fontSize:13,marginBottom:16 },
  grid2:{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:"0 20px" },
  label:{ display:"block",fontSize:12,color:"#64748b",marginBottom:5,letterSpacing:1,textTransform:"uppercase" },
  input:{ width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,padding:"10px 14px",color:"#e2e8f0",fontSize:14,outline:"none",boxSizing:"border-box",fontFamily:"inherit" },
  textarea:{ resize:"vertical",minHeight:90 },

  lookupWrap:{ maxWidth:480,margin:"40px auto" },
  lookupCard:{ background:"rgba(14,165,233,0.05)",border:"1px solid rgba(14,165,233,0.15)",borderRadius:16,padding:32,textAlign:"center" },
  lookupIcon:{ fontSize:52,marginBottom:12 },
  lookupInput:{ width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(14,165,233,0.3)",borderRadius:8,padding:"12px 16px",color:"#e2e8f0",fontSize:16,letterSpacing:2,textAlign:"center",outline:"none",boxSizing:"border-box",marginBottom:16,fontFamily:"monospace" },

  primaryBtn:{ background:"linear-gradient(135deg,#0ea5e9,#0284c7)",color:"#fff",border:"none",borderRadius:8,padding:"11px 22px",fontSize:14,fontWeight:600,cursor:"pointer",transition:"all 0.2s",letterSpacing:0.5,fontFamily:"inherit" },
  ghostBtn:{ background:"transparent",color:"#94a3b8",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"11px 22px",fontSize:14,cursor:"pointer",transition:"all 0.2s",fontFamily:"inherit" },
  editBtn:{ background:"transparent",color:"#0ea5e9",border:"1px solid rgba(14,165,233,0.3)",borderRadius:6,padding:"6px 14px",fontSize:12,cursor:"pointer",fontFamily:"inherit" },
  backBtn:{ background:"transparent",color:"#64748b",border:"none",padding:"0 0 20px",fontSize:14,cursor:"pointer",fontFamily:"inherit",display:"block" },
  idBtn:{ background:"rgba(14,165,233,0.1)",color:"#0ea5e9",border:"1px solid rgba(14,165,233,0.2)",borderRadius:6,padding:"6px 12px",fontSize:12,cursor:"pointer",fontFamily:"inherit" },
  sendBtn:{ background:"rgba(16,185,129,0.1)",color:"#10b981",border:"1px solid rgba(16,185,129,0.2)",borderRadius:6,padding:"5px 12px",fontSize:12,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap" },
  cancelBtn:{ background:"rgba(239,68,68,0.1)",color:"#ef4444",border:"1px solid rgba(239,68,68,0.2)",borderRadius:6,padding:"5px 12px",fontSize:12,cursor:"pointer",fontFamily:"inherit" },
  addMedBtn:{ background:"rgba(14,165,233,0.1)",color:"#0ea5e9",border:"1px solid rgba(14,165,233,0.2)",borderRadius:6,padding:"5px 12px",fontSize:12,cursor:"pointer",fontFamily:"inherit" },
  remBtn:{ background:"rgba(239,68,68,0.1)",color:"#ef4444",border:"none",borderRadius:6,padding:"8px 10px",cursor:"pointer",fontSize:12 },
  quickBtn:{ background:"rgba(14,165,233,0.08)",color:"#0ea5e9",border:"1px solid rgba(14,165,233,0.25)",borderRadius:8,padding:"10px 18px",fontSize:13,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s" },

  cardPageWrap:{ maxWidth:480,margin:"40px auto",textAlign:"center" },
  idCard:{ background:"linear-gradient(135deg,#0c1628 0%,#0f2240 50%,#0c1628 100%)",border:"1px solid rgba(14,165,233,0.3)",borderRadius:16,padding:"28px 28px 16px",position:"relative",overflow:"hidden",boxShadow:"0 20px 60px rgba(0,0,0,0.5),inset 0 1px 0 rgba(14,165,233,0.2)" },
  idTop:{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24 },
  idHospital:{ color:"#0ea5e9",fontSize:14,fontWeight:700,letterSpacing:1 },
  idBadgeLabel:{ background:"rgba(14,165,233,0.15)",border:"1px solid rgba(14,165,233,0.3)",borderRadius:4,padding:"3px 8px",fontSize:10,color:"#7dd3fc",letterSpacing:2 },
  idBody:{ display:"flex",alignItems:"center",gap:18,marginBottom:24 },
  idAvatar:{ width:60,height:60,borderRadius:12,background:"linear-gradient(135deg,#0ea5e9,#0284c7)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,fontWeight:700,color:"#fff",flexShrink:0 },
  idName:{ fontSize:22,fontWeight:700,color:"#f1f5f9",marginBottom:4 },
  idMeta:{ fontSize:13,color:"#94a3b8",marginBottom:2 },
  idFoot:{ display:"flex",justifyContent:"space-between",alignItems:"flex-end",borderTop:"1px solid rgba(14,165,233,0.15)",paddingTop:16,marginBottom:12 },
  idNum:{ fontFamily:"monospace",fontSize:20,fontWeight:700,color:"#0ea5e9",letterSpacing:3 },
  idDate:{ fontSize:11,color:"#475569" },
  idBar:{ fontFamily:"monospace",fontSize:11,color:"rgba(14,165,233,0.3)",letterSpacing:1,textAlign:"center" },

  dashWrap:{ },
  dashHeader:{ display:"flex",alignItems:"center",gap:16,background:"rgba(14,165,233,0.05)",border:"1px solid rgba(14,165,233,0.12)",borderRadius:14,padding:"20px 24px",marginBottom:20,flexWrap:"wrap" },
  dashAvatar:{ width:56,height:56,borderRadius:12,background:"linear-gradient(135deg,#0ea5e9,#0284c7)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,fontWeight:700,color:"#fff",flexShrink:0 },
  dashName:{ fontSize:22,fontWeight:700,color:"#f1f5f9",marginBottom:3 },
  dashMeta:{ fontSize:13,color:"#94a3b8",marginBottom:2 },
  visitBadge:{ background:"rgba(16,185,129,0.12)",border:"1px solid rgba(16,185,129,0.25)",borderRadius:6,padding:"4px 10px",fontSize:11,color:"#10b981",letterSpacing:1 },
  tabBar:{ display:"flex",gap:4,borderBottom:"1px solid rgba(255,255,255,0.06)",marginBottom:20,overflowX:"auto",paddingBottom:1 },
  tab:{ background:"transparent",border:"none",color:"#64748b",padding:"10px 16px",fontSize:13,cursor:"pointer",borderBottom:"2px solid transparent",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:6,fontFamily:"inherit",transition:"all 0.2s" },
  tabActive:{ color:"#0ea5e9",borderBottomColor:"#0ea5e9" },
  tabBadge:{ background:"#0ea5e920",color:"#0ea5e9",borderRadius:10,padding:"1px 6px",fontSize:10,fontWeight:700 },
  tabContent:{ },
  tabActionBar:{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8 },
  tabHeading:{ fontSize:16,fontWeight:700,color:"#f1f5f9" },
  aptGroupLabel:{ fontSize:11,color:"#475569",letterSpacing:2,textTransform:"uppercase",marginBottom:8,marginTop:16 },

  statsRow:{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:12,marginBottom:16 },
  statCard:{ background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:12,padding:"16px",textAlign:"center" },
  statVal:{ fontSize:28,fontWeight:700,lineHeight:1 },
  statLabel:{ fontSize:11,color:"#475569",marginTop:4,textTransform:"uppercase",letterSpacing:1 },
  alertCard:{ display:"flex",alignItems:"center",gap:12,background:"rgba(14,165,233,0.06)",border:"1px solid rgba(14,165,233,0.15)",borderRadius:10,padding:"12px 16px",marginBottom:12,fontSize:13 },
  sectionCard:{ background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:12,padding:20 },
  sectionHead:{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 },
  sectionTitle:{ fontSize:15,fontWeight:700,color:"#f1f5f9" },
  infoGrid:{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12 },
  infoItem:{ },
  infoKey:{ fontSize:11,color:"#475569",textTransform:"uppercase",letterSpacing:1,marginBottom:3 },
  infoVal:{ fontSize:14,color:"#e2e8f0" },

  addCard:{ background:"rgba(14,165,233,0.04)",border:"1px solid rgba(14,165,233,0.15)",borderRadius:12,padding:20,marginBottom:20 },
  addCardTitle:{ fontSize:15,fontWeight:700,color:"#f1f5f9",marginBottom:16,marginTop:0 },
  medRow:{ display:"flex",gap:6,marginBottom:8,flexWrap:"wrap" },
  medInput:{ flex:1,minWidth:80,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:6,padding:"8px 10px",color:"#e2e8f0",fontSize:13,outline:"none",fontFamily:"inherit" },

  rxCard:{ background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:12,padding:"16px 18px",marginBottom:12 },
  rxCardHead:{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10,flexWrap:"wrap",gap:8 },
  rxId:{ fontFamily:"monospace",fontSize:12,color:"#0ea5e9",marginBottom:2 },
  rxDate:{ fontSize:12,color:"#475569" },
  rxDiag:{ fontSize:14,color:"#94a3b8",marginBottom:10 },
  rxMedList:{ display:"flex",flexDirection:"column",gap:6 },
  rxMedItem:{ display:"flex",justifyContent:"space-between",background:"rgba(14,165,233,0.06)",borderRadius:6,padding:"8px 12px",flexWrap:"wrap",gap:4 },
  rxMedName:{ color:"#e2e8f0",fontSize:13,fontWeight:600 },
  rxMedDetail:{ color:"#64748b",fontSize:12 },
  rxNote:{ marginTop:10,fontSize:12,color:"#64748b",background:"rgba(255,255,255,0.02)",borderRadius:6,padding:"8px 12px" },

  aptCard:{ display:"flex",gap:16,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:12,padding:"14px 16px",marginBottom:10,alignItems:"center",flexWrap:"wrap" },
  aptCardLeft:{ minWidth:80,textAlign:"center",background:"rgba(14,165,233,0.06)",borderRadius:8,padding:"8px 12px" },
  aptDate:{ fontSize:13,fontWeight:700,color:"#0ea5e9" },
  aptTime:{ fontSize:12,color:"#64748b" },
  aptCardMid:{ flex:1 },
  aptType:{ fontSize:14,fontWeight:700,color:"#e2e8f0",marginBottom:3 },
  aptNotes:{ fontSize:12,color:"#64748b",marginBottom:3 },
  aptBooked:{ fontSize:11,color:"#334155" },
  aptCardRight:{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6 },
  statusBadge:{ borderRadius:6,padding:"3px 9px",fontSize:11,fontWeight:700,letterSpacing:0.5 },

  labCard:{ background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:12,padding:"14px 16px",marginBottom:10 },
  labCardHead:{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,flexWrap:"wrap",gap:8 },
  labTestName:{ fontSize:15,fontWeight:700,color:"#f1f5f9" },
  labDate:{ fontSize:11,color:"#475569",fontFamily:"monospace" },
  labResultRow:{ display:"flex",gap:16,flexWrap:"wrap" },
  labResult:{ fontSize:13,color:"#94a3b8" },
  labRange:{ fontSize:13,color:"#475569" },

  smsComposeBox:{ background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:10,padding:16,marginBottom:16 },
  smsQuickBtns:{ display:"flex",gap:10,marginBottom:16,flexWrap:"wrap" },
  smsCard:{ background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:10,padding:"12px 14px",marginBottom:8 },
  smsHead:{ display:"flex",justifyContent:"space-between",marginBottom:6,flexWrap:"wrap",gap:4 },
  smsTo:{ fontSize:12,fontWeight:700,color:"#10b981" },
  smsTime:{ fontSize:11,color:"#334155",fontFamily:"monospace" },
  smsMsg:{ fontSize:12,color:"#94a3b8",whiteSpace:"pre-wrap",lineHeight:1.6 },

  emptyState:{ textAlign:"center",padding:"40px 0",color:"#475569" },
  toast:{ position:"fixed",bottom:24,right:24,zIndex:999,border:"1px solid",borderRadius:10,padding:"12px 20px",fontSize:13,fontWeight:600,color:"#e2e8f0",backdropFilter:"blur(8px)",maxWidth:340,boxShadow:"0 8px 32px rgba(0,0,0,0.5)" },
};

const css = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap');
* { box-sizing: border-box; }
body { margin: 0; }
.fadeIn { animation: fadeIn 0.4s ease; }
@keyframes fadeIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
@keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
.btn:hover { opacity: 0.85; transform: translateY(-1px); }
.homeCard:hover { transform: translateY(-4px); background: rgba(14,165,233,0.08) !important; }
.tabBtn:hover { color: #94a3b8 !important; }
input:focus, select:focus, textarea:focus { border-color: rgba(14,165,233,0.4) !important; }
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(14,165,233,0.2); border-radius: 3px; }
`;