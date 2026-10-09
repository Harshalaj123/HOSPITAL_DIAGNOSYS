import React, { useMemo, useState, useEffect } from "react";
import {
  Activity, ArrowRight, Brain, Check, CheckCircle2, ChevronDown,
  CircleHelp, ClipboardList, Clock, FileText, HeartPulse, Home,
  Info, ListChecks, Menu, RotateCcw, Search, ShieldCheck, Stethoscope,
  X, Zap, ActivitySquare, AlertCircle
} from "lucide-react";
import "./styles.css";

const SYMPTOMS = [
  { id: "fever", label: "Fever", group: "General" },
  { id: "cough", label: "Cough", group: "Respiratory" },
  { id: "sore_throat", label: "Sore throat", group: "Respiratory" },
  { id: "runny_nose", label: "Runny nose", group: "Respiratory" },
  { id: "headache", label: "Headache", group: "General" },
  { id: "fatigue", label: "Fatigue", group: "General" },
  { id: "nausea", label: "Nausea", group: "Digestive" },
  { id: "vomiting", label: "Vomiting", group: "Digestive" },
  { id: "diarrhea", label: "Diarrhea", group: "Digestive" },
  { id: "itchy_eyes", label: "Itchy eyes", group: "Other" },
  { id: "sneezing", label: "Sneezing", group: "Respiratory" },
  { id: "breathing_difficulty", label: "Difficulty breathing", group: "Urgent" },
];

const RULES = [
  {
    id: "R-01",
    label: "Illustrative respiratory symptom pattern",
    requires: ["cough", "sore_throat"],
    conclusion: "Respiratory symptom pattern",
    type: "finding",
  },
  {
    id: "R-02",
    label: "Illustrative upper-respiratory symptom pattern",
    requires: ["runny_nose", "sneezing"],
    conclusion: "Upper-respiratory symptom pattern",
    type: "finding",
  },
  {
    id: "R-03",
    label: "Illustrative general symptom pattern",
    requires: ["fever", "fatigue"],
    conclusion: "General symptom pattern",
    type: "finding",
  },
  {
    id: "R-04",
    label: "Illustrative allergy-like symptom pattern",
    requires: ["itchy_eyes", "sneezing", "runny_nose"],
    conclusion: "Allergy-like symptom pattern",
    type: "finding",
  },
];

const labelFor = (id) => SYMPTOMS.find((s) => s.id === id)?.label || id;

function runForward(selected) {
  const facts = new Set(selected);
  const trace = [];
  let changed = true;
  while (changed) {
    changed = false;
    for (const rule of RULES) {
      const matched = rule.requires.every((fact) => facts.has(fact));
      if (matched && !facts.has(rule.conclusion)) {
        facts.add(rule.conclusion);
        trace.push({
          ruleId: rule.id,
          label: rule.label,
          status: "matched",
          detail: `Required facts present: ${rule.requires.map(labelFor).join(", ")}.`,
          conclusion: rule.conclusion,
        });
        changed = true;
      } else if (!trace.some((t) => t.ruleId === rule.id)) {
        const missing = rule.requires.filter((fact) => !facts.has(fact));
        trace.push({
          ruleId: rule.id,
          label: rule.label,
          status: matched ? "already-derived" : "not-matched",
          detail: matched
            ? "Conclusion already derived."
            : `Missing facts: ${missing.map(labelFor).join(", ")}.`,
          conclusion: rule.conclusion,
        });
      }
    }
  }
  const matches = RULES.filter((r) => r.requires.every((fact) => facts.has(fact)));
  return { matches, trace, facts: [...facts] };
}

function runBackward(selected, goal) {
  const facts = new Set(selected);
  const visited = new Set();
  const trace = [];

  function prove(target, depth = 0) {
    if (facts.has(target)) {
      trace.push({ ruleId: "FACT", label: `Check: ${target}`, status: "matched", detail: "Fact is available.", depth });
      return true;
    }
    if (visited.has(target)) return false;
    visited.add(target);

    const rule = RULES.find((r) => r.conclusion === target);
    if (!rule) {
      trace.push({ ruleId: "NO-RULE", label: `Check: ${target}`, status: "unknown", detail: "No rule to establish goal.", depth });
      return false;
    }
    trace.push({ ruleId: rule.id, label: `Goal: ${target}`, status: "checking", detail: `Checking: ${rule.requires.map(labelFor).join(" AND ")}.`, depth });
    const missing = rule.requires.filter((fact) => !facts.has(fact));
    if (missing.length === 0) {
      trace.push({ ruleId: rule.id, label: rule.label, status: "matched", detail: "All prerequisites met.", depth });
      return true;
    }
    trace.push({ ruleId: rule.id, label: rule.label, status: "not-matched", detail: `Missing: ${missing.map(labelFor).join(", ")}.`, depth });
    return false;
  }

  const success = prove(goal);
  return { success, trace };
}

export default function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState("forward");
  const [goal, setGoal] = useState(RULES[0].conclusion);
  const [result, setResult] = useState(null);
  const [notice, setNotice] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const filteredSymptoms = useMemo(
    () => SYMPTOMS.filter((s) => s.label.toLowerCase().includes(search.toLowerCase())),
    [search]
  );

  function toggleSymptom(id) {
    setSelectedSymptoms((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    );
    setResult(null);
    setNotice("");
  }

  function analyze() {
    if (selectedSymptoms.length === 0) {
      setNotice("Select at least one symptom to run the demonstration.");
      return;
    }
    if (mode === "forward") {
      setResult({ mode, ...runForward(selectedSymptoms) });
    } else {
      setResult({ mode, ...runBackward(selectedSymptoms, goal), goal });
    }
    setActivePage("results");
    setNotice("");
    setSidebarOpen(false);
  }

  function reset() {
    setSelectedSymptoms([]);
    setResult(null);
    setSearch("");
    setNotice("");
    setActivePage("symptoms");
  }

  if (!isLoaded) return <div className="loading-screen"><HeartPulse className="pulse-icon" size={40}/></div>;

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <div className="logo-box">
            <HeartPulse size={24} className="logo-icon" />
          </div>
          <div className="logo-text">
            <h2>MedRule <span>AI</span></h2>
            <p>EXPERT SYSTEM</p>
          </div>
          <button className="mobile-close" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="nav-menu">
          <p className="nav-label">WORKSPACE</p>
          {[
            { id: "dashboard", icon: Home, label: "Overview" },
            { id: "symptoms", icon: ClipboardList, label: "Symptom Checker" },
            { id: "results", icon: Brain, label: "Reasoning Output" },
            { id: "how", icon: CircleHelp, label: "How It Works" },
          ].map((item) => (
            <button
              key={item.id}
              className={`nav-btn ${activePage === item.id ? "active" : ""}`}
              onClick={() => { setActivePage(item.id); setSidebarOpen(false); }}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
              {item.id === "results" && result && <div className="nav-indicator" />}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="disclaimer-box">
            <ShieldCheck size={18} />
            <div className="disclaimer-text">
              <strong>Educational Demo</strong>
              <p>Not for medical diagnosis.</p>
            </div>
          </div>
        </div>
      </aside>

      {sidebarOpen && <div className="overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Main Content */}
      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu" onClick={() => setSidebarOpen(true)}>
              <Menu size={24} />
            </button>
            <div className="breadcrumbs">
              <span>Workspace</span>
              <ChevronDown size={14} className="breadcrumb-sep" />
              <span className="current-path">
                {activePage.charAt(0).toUpperCase() + activePage.slice(1)}
              </span>
            </div>
          </div>
          <div className="topbar-right">
            <div className="demo-badge">
              <span className="live-dot" /> PROTOTYPE
            </div>
            <div className="user-avatar">MR</div>
          </div>
        </header>

        <div className="page-container">
          {activePage === "dashboard" && (
            <Dashboard 
              onStart={() => setActivePage("symptoms")} 
              selectedCount={selectedSymptoms.length}
            />
          )}
          {activePage === "symptoms" && (
            <SymptomPage 
              search={search} setSearch={setSearch}
              filteredSymptoms={filteredSymptoms}
              selectedSymptoms={selectedSymptoms}
              toggleSymptom={toggleSymptom}
              mode={mode} setMode={setMode}
              goal={goal} setGoal={setGoal}
              notice={notice}
              onAnalyze={analyze}
              onReset={reset}
            />
          )}
          {activePage === "results" && (
            <ResultsPage 
              result={result} 
              selectedSymptoms={selectedSymptoms} 
              onStart={() => setActivePage("symptoms")} 
            />
          )}
          {activePage === "how" && (
            <HowPage onStart={() => setActivePage("symptoms")} />
          )}
        </div>
      </main>
    </div>
  );
}

function Dashboard({ onStart, selectedCount }) {
  return (
    <div className="dashboard-page fade-in">
      <div className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">AI REASONING ENGINE</div>
          <h1>Advanced Rule-Based<br/><span>Medical Expert System</span></h1>
          <p>Experience how artificial intelligence processes symptoms and applies rule-based logic to arrive at clinical patterns.</p>
          <div className="hero-actions">
            <button className="btn-primary" onClick={onStart}>
              Start Inference Engine <ArrowRight size={18} />
            </button>
          </div>
        </div>
        <div className="hero-graphics">
          <div className="glow-orb"></div>
          <div className="glass-card g-card-1">
            <CheckCircle2 size={20} className="g-icon success" />
            <div>
              <h4>Pattern Matched</h4>
              <p>Rule conditions met</p>
            </div>
          </div>
          <div className="glass-card g-card-2">
            <Brain size={20} className="g-icon primary" />
            <div>
              <h4>Inference Active</h4>
              <p>Processing facts</p>
            </div>
          </div>
        </div>
      </div>

      <div className="stats-grid mt-8">
        <div className="stat-card">
          <div className="icon-wrapper bg-blue"><ClipboardList size={22}/></div>
          <div><h3>12</h3><p>Example Symptoms</p></div>
        </div>
        <div className="stat-card">
          <div className="icon-wrapper bg-indigo"><ListChecks size={22}/></div>
          <div><h3>04</h3><p>Inference Rules</p></div>
        </div>
        <div className="stat-card">
          <div className="icon-wrapper bg-cyan"><Brain size={22}/></div>
          <div><h3>02</h3><p>Reasoning Chains</p></div>
        </div>
        <div className="stat-card">
          <div className="icon-wrapper bg-rose"><ShieldCheck size={22}/></div>
          <div><h3>Edu</h3><p>Not validated</p></div>
        </div>
      </div>
    </div>
  );
}

function SymptomPage({ search, setSearch, filteredSymptoms, selectedSymptoms, toggleSymptom, mode, setMode, goal, setGoal, notice, onAnalyze, onReset }) {
  const groups = ["General", "Respiratory", "Digestive", "Other", "Urgent"];
  return (
    <div className="symptom-page fade-in">
      <div className="page-header">
        <h1>Symptom Checker</h1>
        <p>Select facts to supply to the inference engine.</p>
      </div>

      <div className="symptom-layout mt-6">
        <div className="symptom-main panel">
          <div className="panel-header">
            <h3>Available Facts</h3>
            <span className="badge">{selectedSymptoms.length} Selected</span>
          </div>
          
          <div className="search-bar">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search symptoms..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && <button className="clear-search" onClick={() => setSearch("")}><X size={16}/></button>}
          </div>

          <div className="symptoms-list">
            {groups.map(group => {
              const items = filteredSymptoms.filter(s => s.group === group);
              if (!items.length) return null;
              return (
                <div key={group} className="symptom-group">
                  <h4 className="group-title">{group}</h4>
                  <div className="grid-2">
                    {items.map(s => {
                      const isSelected = selectedSymptoms.includes(s.id);
                      return (
                        <button 
                          key={s.id} 
                          className={`symptom-toggle ${isSelected ? "selected" : ""}`}
                          onClick={() => toggleSymptom(s.id)}
                        >
                          <div className="checkbox">
                            {isSelected && <Check size={14} />}
                          </div>
                          <span>{s.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {filteredSymptoms.length === 0 && (
              <div className="empty-state">
                <Search size={32} />
                <p>No symptoms found</p>
              </div>
            )}
          </div>
          
          <div className="panel-footer">
            <button className="btn-text" onClick={onReset}><RotateCcw size={16}/> Clear Selections</button>
          </div>
        </div>

        <div className="symptom-sidebar panel">
          <div className="panel-header">
            <h3>Configuration</h3>
          </div>
          
          <div className="mode-selector">
            <button className={`mode-card ${mode === "forward" ? "active" : ""}`} onClick={() => setMode("forward")}>
              <div className="mode-icon"><ArrowRight size={20}/></div>
              <div className="mode-info">
                <h4>Forward Chaining</h4>
                <p>Data-driven logic</p>
              </div>
            </button>

            <button className={`mode-card ${mode === "backward" ? "active" : ""}`} onClick={() => setMode("backward")}>
              <div className="mode-icon"><RotateCcw size={20}/></div>
              <div className="mode-info">
                <h4>Backward Chaining</h4>
                <p>Goal-driven logic</p>
              </div>
            </button>
          </div>

          {mode === "backward" && (
            <div className="goal-picker mt-4">
              <label>Select Target Goal</label>
              <select value={goal} onChange={(e) => setGoal(e.target.value)}>
                {RULES.map(r => (
                  <option key={r.id} value={r.conclusion}>{r.conclusion}</option>
                ))}
              </select>
            </div>
          )}

          {notice && (
            <div className="alert alert-error mt-4">
              <AlertCircle size={16}/> {notice}
            </div>
          )}

          <button className="btn-primary full-width mt-6" onClick={onAnalyze}>
            Execute Engine <Zap size={18}/>
          </button>
        </div>
      </div>
    </div>
  );
}

function ResultsPage({ result, selectedSymptoms, onStart }) {
  if (!result) {
    return (
      <div className="empty-results fade-in">
        <Brain size={48} className="empty-icon" />
        <h2>Awaiting Execution</h2>
        <p>No reasoning traces exist yet. Please select facts and execute the engine.</p>
        <button className="btn-primary mt-4" onClick={onStart}>Configure Engine <ArrowRight size={18}/></button>
      </div>
    );
  }

  const isForward = result.mode === "forward";

  return (
    <div className="results-page fade-in">
      <div className="page-header">
        <h1>Reasoning Output</h1>
        <p>Trace of the inference engine's execution path.</p>
      </div>

      <div className="results-grid mt-6">
        <div className="panel highlight-panel">
          <div className="panel-header">
            <h3>Execution Summary</h3>
            <span className="badge-outline">{isForward ? "FORWARD CHAINING" : "BACKWARD CHAINING"}</span>
          </div>
          <div className="result-main">
            <h2>{isForward 
              ? `${result.matches.length} Conclusions Derived` 
              : result.success ? "Goal Established" : "Goal Failed"}</h2>
            <p>Engine evaluated <b>{selectedSymptoms.length}</b> input facts against the knowledge base.</p>
          </div>
        </div>

        <div className="panel input-facts-panel">
          <div className="panel-header">
            <h3>Provided Facts</h3>
          </div>
          <div className="facts-wrap">
            {selectedSymptoms.map(id => (
              <span key={id} className="fact-tag"><Check size={14}/> {labelFor(id)}</span>
            ))}
            {selectedSymptoms.length === 0 && <span className="text-muted">No facts provided.</span>}
          </div>
        </div>
      </div>

      <div className="panel mt-6">
        <div className="panel-header">
          <h3>Inference Trace</h3>
          <span className="badge">{result.trace.length} Steps</span>
        </div>
        <div className="trace-list">
          {result.trace.map((step, idx) => (
            <div key={idx} className="trace-row">
              <div className={`status-indicator ${step.status}`}>
                {step.status === "matched" ? <Check size={16}/> : idx + 1}
              </div>
              <div className="trace-details">
                <div className="trace-head">
                  <h4>{step.label}</h4>
                  <span className={`trace-badge ${step.status}`}>{step.status}</span>
                </div>
                <p>{step.detail}</p>
              </div>
            </div>
          ))}
          {result.trace.length === 0 && (
            <p className="text-muted p-4">No steps were executed.</p>
          )}
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button className="btn-primary" onClick={onStart}>
          New Execution <RotateCcw size={18}/>
        </button>
      </div>
    </div>
  );
}

function HowPage() {
  return (
    <div className="how-page fade-in">
      <div className="page-header">
        <h1>System Architecture</h1>
        <p>Understanding the reasoning logic.</p>
      </div>

      <div className="grid-2 mt-6">
        <div className="panel">
          <div className="icon-wrapper bg-blue mb-4"><ArrowRight size={24}/></div>
          <h3>Forward Chaining</h3>
          <p className="text-muted mt-2">Data-driven inference. The system applies logical rules to provided facts to deduce new conclusions.</p>
          <div className="code-block mt-4">
            <code>IF (cough AND sore_throat)<br/>THEN Respiratory Pattern</code>
          </div>
        </div>

        <div className="panel">
          <div className="icon-wrapper bg-indigo mb-4"><RotateCcw size={24}/></div>
          <h3>Backward Chaining</h3>
          <p className="text-muted mt-2">Goal-driven inference. The system starts with a hypothesis and works backward to check if facts support it.</p>
          <div className="code-block mt-4">
            <code>GOAL: Respiratory Pattern<br/>CHECK: cough AND sore_throat</code>
          </div>
        </div>
      </div>

      <div className="panel mt-6 disclaimer-panel">
        <AlertCircle size={24} className="text-rose" />
        <div>
          <h3>Academic Prototype</h3>
          <p>This system uses illustrative rules for educational purposes. Do not use for medical decisions.</p>
        </div>
      </div>
    </div>
  );
}