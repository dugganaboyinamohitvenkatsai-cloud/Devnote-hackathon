import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowDown,
  Bot,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  CloudRain,
  Database,
  FileCheck2,
  Gauge,
  History,
  Leaf,
  MapPin,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Thermometer,
  UserRound,
  Wifi,
  Workflow,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { apiGet, apiPost } from "@/lib/api";
import type {
  AgentStep,
  DemoDay,
  DemoSnapshot,
  Incident,
  MemorySearchResponse,
  MemorySaveResponse,
  StepStatus,
} from "@/lib/types";

const DAY_OPTIONS: DemoDay[] = [1, 30, 60];
const STAGE_ORDER = [
  "IDLE",
  "COLLECTING_EVIDENCE",
  "ANALYZING_EVIDENCE",
  "SEARCHING_HINDSIGHT",
  "FOUND_MEMORY",
  "REASONING",
  "RECOMMENDATION",
  "EXPERT_VALIDATION",
  "OUTCOME",
  "MEMORY_SAVED",
];
const STEP_ORDER: Record<string, number> = {
  evidence: 1,
  analyze: 2,
  search: 3,
  retrieve: 4,
  compare: 5,
  recommend: 6,
  expert: 7,
  save: 8,
};

const FALLBACK_SNAPSHOT: DemoSnapshot = {
  day: 1,
  day_label: "DAY 1",
  farm: {
    name: "Green Valley Farm",
    field: "Tomato Field A",
    crop: "Tomato",
    soil: "Loamy",
    planting_date: "June 12",
    irrigation: "Drip irrigation",
    previous_issues: "Leaf disease",
    yield_status: "Good",
  },
  incident: {
    id: "#101",
    crop: "Tomato",
    field: "Field A",
    symptoms: "Brown spots detected on tomato leaves",
    weather: "High humidity",
    temperature: "29°C",
    humidity: "82%",
    evidence: [
      { label: "Image", value: "Leaf image captured", status: "captured" },
      { label: "Thermal", value: "Slightly elevated leaf temperature", status: "supporting" },
      { label: "Weather", value: "High humidity · 82%", status: "captured" },
      { label: "GPS", value: "Field A · 34.052° N", status: "captured" },
    ],
    potential_diagnosis: "Potential fungal leaf disease",
    recommendation: "Insufficient historical evidence. Request expert validation.",
    confidence: "Moderate",
  },
  rover: {
    status: "CONNECTED",
    motto: "Rover = eyes and hands",
    sensors: ["Camera", "Thermal sensor", "GPS", "Field sensors"],
    image_note: "Leaf image captured",
    thermal_note: "Supporting signal · slightly elevated",
    location_note: "Field A · row 04",
  },
  agent_state: "IDLE",
  agent_steps: [
    { id: "evidence", label: "Evidence collected", detail: "Rover + farmer signal", status: "complete" },
    { id: "analyze", label: "Crop and symptoms analyzed", detail: "Tomato / brown spots", status: "complete" },
    { id: "search", label: "Searching Hindsight", detail: "Querying persistent farm experience", status: "complete" },
    { id: "retrieve", label: "Historical incidents retrieved", detail: "0 relevant case(s)", status: "active" },
    { id: "compare", label: "Previous outcomes compared", detail: "Evidence-weighted reasoning", status: "pending" },
    { id: "recommend", label: "Recommendation generated", detail: "Contextual, not authoritative", status: "active" },
    { id: "expert", label: "Expert validation", detail: "Decision layer required", status: "active" },
    { id: "save", label: "Outcome saved", detail: "Becomes future experience", status: "pending" },
  ],
  retrieval: {
    current_incident: "Current incident · Tomato / brown spots",
    result_label: "No highly similar previous incident found",
    result_detail: "The memory bank has limited context for this first case.",
    reasoning: ["Crop and symptoms indexed", "No validated outcome to compare", "Expert validation requested"],
  },
  memory: { mode: "demo", label: "DEMO MEMORY · NOT REAL HINDSIGHT", stats: { historical_incidents: 0, expert_validations: 0, successful_outcomes: 0 }, incidents: [] },
  chat: [
    { speaker: "FARMER", text: "My tomato leaves have brown spots." },
    { speaker: "AGROSENSE", text: "I have limited prior memory for this crop issue." },
    { speaker: "AGROSENSE", text: "I am requesting expert validation before recommending action." },
  ],
};

const iconForEvidence: Record<string, LucideIcon> = {
  Image: Camera,
  Thermal: Thermometer,
  Weather: CloudRain,
  GPS: MapPin,
};

const stateLabel: Record<string, string> = {
  IDLE: "Ready for a new farm incident",
  COLLECTING_EVIDENCE: "Collecting rover evidence",
  ANALYZING_EVIDENCE: "Analyzing crop signals",
  SEARCHING_HINDSIGHT: "Searching persistent memory",
  FOUND_MEMORY: "Historical evidence retrieved",
  REASONING: "Comparing previous outcomes",
  RECOMMENDATION: "Contextual recommendation ready",
  EXPERT_VALIDATION: "Awaiting expert validation",
  OUTCOME: "Outcome ready to record",
  MEMORY_SAVED: "Experience saved to memory",
};

function Panel({ children, className = "", testId }: { children: React.ReactNode; className?: string; testId: string }) {
  return <section data-testid={testId} className={`rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.16)] ${className}`}>{children}</section>;
}

function Eyebrow({ children, testId }: { children: React.ReactNode; testId: string }) {
  return <p data-testid={testId} className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-400/80">{children}</p>;
}

function SectionTitle({ icon: Icon, children, testId }: { icon: LucideIcon; children: React.ReactNode; testId: string }) {
  return <div data-testid={testId} className="mb-5 flex items-center gap-3"><div className="flex size-8 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"><Icon size={16} /></div><h2 className="font-heading text-base font-semibold tracking-tight text-zinc-100">{children}</h2></div>;
}

function StatusDot({ active = true }: { active?: boolean }) {
  return <span className={`inline-block size-1.5 rounded-full ${active ? "bg-emerald-400 shadow-[0_0_9px_rgba(52,211,153,0.75)]" : "bg-zinc-600"}`} />;
}

function Stat({ label, value, testId }: { label: string; value: number; testId: string }) {
  return <div data-testid={testId} className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3"><p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">{label}</p><p className="mt-1 font-heading text-2xl font-semibold text-zinc-100">{value}</p></div>;
}

function RetrievalTrace({ snapshot, searchResult }: { snapshot: DemoSnapshot; searchResult: MemorySearchResponse | null }) {
  const incidents = searchResult?.incidents ?? snapshot.memory.incidents;
  const found = searchResult ? searchResult.found > 0 : incidents.length > 0;
  const trace = [
    { label: "Current incident", value: "Tomato · brown spots", icon: Leaf, active: true },
    { label: "Search Hindsight", value: "Persistent farm experience", icon: Search, active: true },
    { label: "Similar historical cases", value: found ? `${incidents.length} case${incidents.length === 1 ? "" : "s"} retrieved` : "No highly similar case", icon: History, active: found },
    { label: "Previous outcomes", value: found ? "Expert-validated improvement" : "No outcome to compare", icon: CheckCircle2, active: found },
    { label: "Contextual reasoning", value: found ? "Recommendation informed by memory" : "Expert validation requested", icon: Workflow, active: true },
  ];
  return <div data-testid="hindsight-retrieval-trace" className="relative space-y-1">{trace.map((item, index) => { const Icon = item.icon; return <div data-testid={`retrieval-step-${index + 1}`} key={item.label} className="relative flex gap-3 py-2"><div className="relative z-10 flex size-7 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-500"><Icon size={13} className={item.active ? "text-emerald-400" : "text-zinc-600"} /></div>{index < trace.length - 1 && <span className="absolute left-[13px] top-9 h-7 w-px bg-zinc-800" />}<div className="min-w-0"><p className={`text-xs font-medium ${item.active ? "text-zinc-200" : "text-zinc-500"}`}>{item.label}</p><p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500">{item.value}</p></div></div>; })}</div>;
}

function MemoryCard({ incident, index }: { incident: Incident; index: number }) {
  return <article data-testid={`memory-incident-card-${index + 1}`} className="agrosense-rise rounded-xl border border-emerald-500/20 border-t-emerald-400/70 bg-zinc-950/60 p-4" style={{ animationDelay: `${index * 80}ms` }}><div className="flex items-start justify-between gap-3"><div><p className="font-mono text-[10px] uppercase tracking-widest text-emerald-400">{incident.id} · {incident.day}</p><h3 className="mt-2 text-sm font-semibold text-zinc-100">{incident.symptoms}</h3></div><span className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-emerald-300">{incident.similarity}</span></div><div className="mt-3 space-y-1.5 text-[11px] text-zinc-500"><p><span className="text-zinc-400">Diagnosis:</span> {incident.diagnosis}</p><p><span className="text-zinc-400">Outcome:</span> {incident.outcome}</p></div><div className="mt-3 flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-emerald-400"><ShieldCheck size={12} /> Expert validated</div></article>;
}

function AgentTimeline({ steps, state, outcomeSaved }: { steps: AgentStep[]; state: string; outcomeSaved: boolean }) {
  const progress = state === "MEMORY_SAVED" || outcomeSaved ? 8 : Math.max(0, STAGE_ORDER.indexOf(state) - 1);
  return <div data-testid="agent-state-timeline" className="space-y-1">{steps.map((step, index) => { const status: StepStatus = outcomeSaved || index + 1 < progress ? "complete" : index + 1 === progress ? "active" : "pending"; return <div data-testid={`agent-step-${step.id}`} key={step.id} className="group relative flex gap-3 py-2.5"><div className="relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border border-zinc-800 bg-zinc-950">{status === "complete" ? <Check size={13} className="text-emerald-400" /> : status === "active" ? <span className="size-2 rounded-full bg-emerald-400 agrosense-pulse" /> : <span className="size-1.5 rounded-full bg-zinc-700" />}</div>{index < steps.length - 1 && <span className={`absolute left-[13px] top-9 h-8 w-px ${status === "complete" ? "bg-emerald-500/35" : "bg-zinc-800"}`} />}<div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className={`text-xs font-medium ${status === "pending" ? "text-zinc-600" : "text-zinc-200"}`}>{step.label}</p>{status === "active" && <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-emerald-400">active</span>}</div><p className="mt-0.5 text-[11px] text-zinc-500">{step.detail}</p></div></div>; })}</div>;
}

export default function Home() {
  const [selectedDay, setSelectedDay] = useState<DemoDay>(1);
  const [agentState, setAgentState] = useState("IDLE");
  const [expertApproved, setExpertApproved] = useState(false);
  const [outcomeSaved, setOutcomeSaved] = useState(false);
  const [searchResult, setSearchResult] = useState<MemorySearchResponse | null>(null);

  const snapshotQuery = useQuery({
    queryKey: ["demo", selectedDay],
    queryFn: () => apiGet<DemoSnapshot>(`/demo/day/${selectedDay}`),
    retry: false,
  });
  const snapshot = snapshotQuery.data ?? FALLBACK_SNAPSHOT;

  const searchMutation = useMutation({
    mutationFn: () => apiPost<MemorySearchResponse>("/memory/search", { day: selectedDay, query: snapshot.incident.symptoms }),
    onSuccess: (result) => { setSearchResult(result); setAgentState("FOUND_MEMORY"); toast.success(result.message); },
    onError: () => toast.error("Memory search is unavailable; the static demo view remains available."),
  });
  const saveMutation = useMutation({
    mutationFn: () => apiPost<MemorySaveResponse>("/memory/save", { day: selectedDay, expert_validated: true, outcome: "Condition improved after treatment" }),
    onSuccess: (result) => { setOutcomeSaved(true); setAgentState("MEMORY_SAVED"); toast.success(result.message); },
    onError: () => toast.error("Save requires the local API to be available."),
  });
  const resetMutation = useMutation({
    mutationFn: () => apiPost<DemoSnapshot>("/demo/reset"),
    onSuccess: () => { setSelectedDay(1); setAgentState("IDLE"); setExpertApproved(false); setOutcomeSaved(false); setSearchResult(null); toast.success("Demo reset to Day 1."); },
  });

  const visibleIncidents = useMemo(() => searchResult?.incidents ?? snapshot.memory.incidents, [searchResult, snapshot.memory.incidents]);

  function changeDay(day: DemoDay) {
    setSelectedDay(day);
    setAgentState("IDLE");
    setExpertApproved(false);
    setOutcomeSaved(false);
    setSearchResult(null);
  }

  function runAnalysis() {
    setExpertApproved(false);
    setOutcomeSaved(false);
    setAgentState("COLLECTING_EVIDENCE");
    searchMutation.mutate();
    const sequence = ["COLLECTING_EVIDENCE", "ANALYZING_EVIDENCE", "SEARCHING_HINDSIGHT", "FOUND_MEMORY", "REASONING", "RECOMMENDATION", "EXPERT_VALIDATION"];
    sequence.forEach((nextState, index) => window.setTimeout(() => setAgentState(nextState), index * 330));
  }

  function requestExpert() {
    setAgentState("EXPERT_VALIDATION");
    toast("Expert validation requested", { description: "The decision layer stays with the farmer or scientist." });
  }

  function approveExpert() {
    setExpertApproved(true);
    setAgentState("OUTCOME");
    toast.success("Expert approved potential diagnosis", { description: "You can now save the observed outcome." });
  }

  return <main data-testid="app-shell" className="min-h-screen overflow-hidden bg-[#09090b] text-zinc-100">
    <div className="pointer-events-none fixed inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(255,255,255,0.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.8)_1px,transparent_1px)] [background-size:44px_44px]" />
    <div className="relative mx-auto max-w-[1640px] px-5 py-5 sm:px-8 lg:px-10 lg:py-8">
      <header data-testid="app-header" className="flex flex-col gap-5 border-b border-zinc-800 pb-7 lg:flex-row lg:items-start lg:justify-between">
        <div><div className="flex items-center gap-3"><div data-testid="brand-mark" className="flex size-10 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-500/10 text-emerald-400"><Leaf size={20} /></div><div><p data-testid="brand-name" className="font-heading text-lg font-semibold tracking-tight text-zinc-100">AgroSense <span className="text-emerald-400">AI</span></p><p data-testid="brand-tagline" className="font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-500">Persistent Farm Intelligence Agent</p></div></div><div className="mt-7 max-w-3xl"><Eyebrow testId="header-eyebrow">Field intelligence / memory layer / {snapshot.day_label}</Eyebrow><h1 data-testid="hero-title" className="mt-3 max-w-3xl font-heading text-3xl font-semibold tracking-[-0.04em] text-zinc-100 sm:text-5xl">An agricultural AI that <span className="text-emerald-400">remembers</span> what happened before.</h1><p data-testid="hero-description" className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400">Combining field evidence, agent reasoning and persistent experience to make future farm decisions more contextual.</p></div></div>
        <div data-testid="system-status-cluster" className="flex flex-wrap items-center gap-2 lg:justify-end"><span data-testid="demo-mode-badge" className="rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1.5 font-mono text-[10px] font-medium uppercase tracking-wider text-amber-300">DEMO MODE</span><span data-testid="agent-online-status" className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-emerald-300"><StatusDot /> Agent online</span><span data-testid="rover-connected-status" className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-zinc-400"><Wifi size={11} /> Rover connected</span></div>
      </header>

      <div data-testid="differentiator-banner" className="my-7 grid gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.045] p-5 sm:grid-cols-[1.3fr_1fr] sm:items-center sm:p-6"><div className="flex gap-3"><Sparkles className="mt-1 shrink-0 text-emerald-400" size={18} /><div><p className="font-heading text-lg font-medium tracking-tight text-zinc-100">Most agricultural AI answers the current question.</p><p className="font-heading text-lg font-medium tracking-tight text-emerald-400">AgroSense remembers the previous ones.</p></div></div><p className="border-l border-zinc-700 pl-4 text-xs leading-6 text-zinc-400">Every validated outcome becomes experience for the next incident. Memory is the differentiator, not decoration.</p></div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(250px,0.82fr)_minmax(480px,1.65fr)_minmax(270px,0.9fr)]">
        <aside data-testid="hindsight-memory-rail" className="flex flex-col gap-6">
          <Panel testId="hindsight-memory-panel" className="border-emerald-500/20">
            <div className="flex items-start justify-between gap-3"><SectionTitle icon={Database} testId="hindsight-panel-title">Hindsight memory</SectionTitle><span data-testid="memory-mode-label" className="rounded-md border border-amber-400/20 bg-amber-400/10 px-2 py-1 font-mono text-[9px] text-amber-300">DEMO</span></div>
            <p data-testid="memory-mode-explanation" className="-mt-2 mb-5 text-xs leading-5 text-zinc-500">Deterministic local memory fallback. Not a real Hindsight connection.</p>
            <div data-testid="memory-stats" className="grid grid-cols-3 gap-2"><Stat label="Incidents" value={snapshot.memory.stats.historical_incidents} testId="historical-incidents-stat" /><Stat label="Validated" value={snapshot.memory.stats.expert_validations} testId="expert-validations-stat" /><Stat label="Positive" value={snapshot.memory.stats.successful_outcomes} testId="successful-outcomes-stat" /></div>
            <div className="my-6 h-px bg-zinc-800" />
            <Eyebrow testId="retrieval-eyebrow">Memory retrieval</Eyebrow><h3 data-testid="retrieval-title" className="mt-2 font-heading text-lg font-semibold text-zinc-100">Experience changes the answer.</h3><p data-testid="retrieval-description" className="mt-2 text-xs leading-5 text-zinc-500">The agent does not just classify the leaf. It follows the chain from evidence to outcomes.</p>
            <div className="mt-5"><RetrievalTrace snapshot={snapshot} searchResult={searchResult} /></div>
          </Panel>
          <Panel testId="historical-incidents-panel"><div className="mb-4 flex items-center justify-between"><Eyebrow testId="historical-eyebrow">Retrieved cases</Eyebrow><span data-testid="retrieved-count" className="font-mono text-[10px] text-zinc-500">{visibleIncidents.length} FOUND</span></div>{visibleIncidents.length ? <div className="space-y-3">{visibleIncidents.map((incident, index) => <MemoryCard key={incident.id} incident={incident} index={index} />)}</div> : <div data-testid="empty-memory-state" className="rounded-xl border border-dashed border-zinc-800 p-4"><CircleDot className="text-zinc-600" size={16} /><p className="mt-3 text-xs font-medium text-zinc-400">No highly similar previous incident found.</p><p className="mt-1 text-[11px] leading-5 text-zinc-600">Day 1 is where experience starts. Expert validation will create the first durable reference.</p></div>}</Panel>
        </aside>

        <section data-testid="main-command-column" className="flex min-w-0 flex-col gap-6">
          <Panel testId="current-incident-panel" className="relative overflow-hidden border-zinc-700 p-6 sm:p-7"><div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-emerald-500/5 blur-3xl" /><div className="relative flex flex-col gap-6"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start"><div><div className="flex items-center gap-2"><Eyebrow testId="current-incident-eyebrow">Current farm incident</Eyebrow><span data-testid="incident-day-label" className="rounded border border-zinc-700 px-1.5 py-0.5 font-mono text-[9px] text-zinc-500">{snapshot.day_label}</span></div><h2 data-testid="current-incident-title" className="mt-3 font-heading text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">{snapshot.farm.field}</h2><p data-testid="current-incident-summary" className="mt-2 max-w-xl text-sm text-zinc-400">{snapshot.incident.symptoms}</p></div><span data-testid="agent-state-badge" className="flex w-fit items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-emerald-300"><Activity size={12} /> {stateLabel[agentState] ?? agentState}</span></div><div data-testid="incident-metrics" className="grid grid-cols-2 gap-3 sm:grid-cols-4"><div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3"><p className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">Crop</p><p className="mt-2 text-sm font-semibold text-zinc-200">{snapshot.incident.crop}</p></div><div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3"><p className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">Temperature</p><p className="mt-2 text-sm font-semibold text-zinc-200">{snapshot.incident.temperature}</p></div><div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3"><p className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">Humidity</p><p className="mt-2 text-sm font-semibold text-amber-300">{snapshot.incident.humidity}</p></div><div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3"><p className="font-mono text-[10px] uppercase tracking-wider">Confidence</p><p className="mt-2 text-sm font-semibold text-emerald-400">{snapshot.incident.confidence}</p></div></div><div data-testid="evidence-list" className="grid gap-2 sm:grid-cols-2">{snapshot.incident.evidence.map((evidence) => { const Icon = iconForEvidence[evidence.label] ?? FileCheck2; return <div data-testid={`evidence-${evidence.label.toLowerCase()}`} key={evidence.label} className="flex items-center gap-2.5 rounded-lg border border-zinc-800/80 bg-zinc-950/40 px-3 py-2.5"><Icon size={14} className={evidence.status === "supporting" ? "text-amber-300" : "text-emerald-400"} /><span className="text-xs text-zinc-400">{evidence.value}</span><Check size={12} className="ml-auto text-emerald-500" /></div>; })}</div><div data-testid="current-recommendation" className="rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-4"><div className="flex gap-3"><ShieldCheck className="mt-0.5 shrink-0 text-amber-300" size={16} /><div><p className="font-mono text-[10px] uppercase tracking-widest text-amber-300">Safety-aware recommendation</p><p className="mt-1 text-sm leading-6 text-zinc-300">{snapshot.incident.recommendation}</p></div></div></div><button data-testid="start-agent-analysis-button" type="button" onClick={runAnalysis} className="group flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-zinc-950 shadow-[0_0_24px_rgba(16,185,129,0.16)] transition-[background-color,box-shadow,transform] hover:-translate-y-0.5 hover:bg-emerald-400 hover:shadow-[0_0_30px_rgba(16,185,129,0.28)] disabled:cursor-wait disabled:opacity-60" disabled={searchMutation.isPending}>{searchMutation.isPending ? "Searching memory…" : "Start agent analysis"}<ChevronRight size={16} className="transition-transform group-hover:translate-x-1" /></button></div></Panel>

          <Panel testId="agent-reasoning-panel"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><Eyebrow testId="agent-eyebrow">AgroSense agent</Eyebrow><h2 data-testid="agent-panel-title" className="mt-2 font-heading text-xl font-semibold text-zinc-100">Reasoning loop</h2></div><div data-testid="agent-state-machine" className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2 font-mono text-[10px] text-zinc-500"><Bot size={13} className="text-emerald-400" /> {agentState}</div></div><div className="mt-5"><AgentTimeline steps={snapshot.agent_steps} state={agentState} outcomeSaved={outcomeSaved} /></div></Panel>

          <Panel testId="rover-evidence-panel"><div className="flex items-start justify-between gap-4"><SectionTitle icon={Gauge} testId="rover-panel-title">Rover evidence</SectionTitle><span data-testid="rover-card-status" className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 font-mono text-[9px] tracking-wider text-emerald-300"><StatusDot /> {snapshot.rover.status}</span></div><div className="grid gap-4 sm:grid-cols-[1fr_1.25fr]"><div data-testid="rover-sensor-list" className="grid grid-cols-2 gap-2">{snapshot.rover.sensors.map((sensor) => <div data-testid={`rover-sensor-${sensor.toLowerCase().replaceAll(" ", "-")}`} key={sensor} className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-[11px] text-zinc-400"><span className="size-1.5 rounded-full bg-emerald-400" />{sensor}</div>)}</div><div data-testid="rover-evidence-notes" className="space-y-2 border-l border-zinc-800 pl-4"><p className="text-xs text-zinc-400"><Camera size={13} className="mr-2 inline text-emerald-400" />{snapshot.rover.image_note}</p><p className="text-xs text-zinc-400"><Thermometer size={13} className="mr-2 inline text-amber-300" />{snapshot.rover.thermal_note}</p><p className="text-xs text-zinc-400"><MapPin size={13} className="mr-2 inline text-emerald-400" />{snapshot.rover.location_note}</p><p data-testid="rover-motto" className="pt-2 font-mono text-[10px] uppercase tracking-wider text-zinc-600">{snapshot.rover.motto}</p></div></div></Panel>
        </section>

        <aside data-testid="action-rail" className="flex flex-col gap-6">
          <Panel testId="demo-controls-panel"><div className="flex items-start justify-between"><div><Eyebrow testId="demo-controls-eyebrow">Demo controls</Eyebrow><h2 data-testid="demo-controls-title" className="mt-2 font-heading text-xl font-semibold text-zinc-100">Walk the memory</h2></div><Zap size={16} className="text-lime-300" /></div><p data-testid="demo-controls-description" className="mt-2 text-xs leading-5 text-zinc-500">Jump through the same farm’s experience. No waiting, no random behavior.</p><div data-testid="demo-day-buttons" className="mt-5 grid grid-cols-3 gap-2">{DAY_OPTIONS.map((day) => <button data-testid={`demo-day-${day}-button`} type="button" key={day} onClick={() => changeDay(day)} className={`rounded-lg border px-2 py-3 font-mono text-[10px] uppercase tracking-wider transition-[background-color,border-color,color,transform] hover:-translate-y-0.5 ${selectedDay === day ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-300" : "border-zinc-800 bg-zinc-950/40 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"}`}>Day {day}</button>)}</div><button data-testid="reset-demo-button" type="button" onClick={() => resetMutation.mutate()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/40 py-2.5 text-xs text-zinc-500 transition-[border-color,color,transform] hover:-translate-y-0.5 hover:border-zinc-600 hover:text-zinc-200"><RotateCcw size={13} /> Reset demo</button></Panel>

          <Panel testId="expert-action-panel" className="border-emerald-500/20"><SectionTitle icon={ShieldCheck} testId="expert-panel-title">Decision layer</SectionTitle><div data-testid="expert-validation-status" className={`rounded-xl border p-4 ${expertApproved ? "border-emerald-500/25 bg-emerald-500/10" : "border-amber-400/20 bg-amber-400/[0.06]"}`}><div className="flex items-start gap-3">{expertApproved ? <CheckCircle2 size={17} className="mt-0.5 text-emerald-400" /> : <UserRound size={17} className="mt-0.5 text-amber-300" />}<div><p className={`font-mono text-[10px] uppercase tracking-widest ${expertApproved ? "text-emerald-300" : "text-amber-300"}`}>{expertApproved ? "Expert approved" : "Requires expert validation"}</p><p data-testid="expert-validation-copy" className="mt-2 text-xs leading-5 text-zinc-400">{expertApproved ? "Potential fungal leaf disease is approved as a contextual reference." : "AgroSense is not an unquestionable agricultural authority. Validate before action."}</p></div></div></div><div className="mt-4 space-y-2"><button data-testid="search-hindsight-button" type="button" onClick={() => { setAgentState("SEARCHING_HINDSIGHT"); searchMutation.mutate(); }} className="flex w-full items-center justify-center gap-2 rounded-full border border-zinc-700 bg-zinc-800/70 px-4 py-2.5 text-xs font-medium text-zinc-200 transition-[background-color,border-color,transform] hover:-translate-y-0.5 hover:border-zinc-500 hover:bg-zinc-700"><Search size={14} /> Search Hindsight</button><button data-testid="request-expert-button" type="button" onClick={requestExpert} className="flex w-full items-center justify-center gap-2 rounded-full border border-zinc-700 bg-transparent px-4 py-2.5 text-xs font-medium text-zinc-300 transition-[background-color,border-color,transform] hover:-translate-y-0.5 hover:border-amber-300/50 hover:bg-amber-400/10"><UserRound size={14} /> Request expert</button><button data-testid="approve-expert-button" type="button" onClick={approveExpert} className="flex w-full items-center justify-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-medium text-emerald-300 transition-[background-color,border-color,transform] hover:-translate-y-0.5 hover:border-emerald-400 hover:bg-emerald-500/20"><CheckCircle2 size={14} /> Approve</button><button data-testid="save-outcome-button" type="button" onClick={() => saveMutation.mutate()} disabled={!expertApproved || saveMutation.isPending || outcomeSaved} className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 px-4 py-2.5 text-xs font-semibold text-zinc-950 transition-[background-color,transform,opacity] hover:-translate-y-0.5 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40">{outcomeSaved ? <Check size={14} /> : <Database size={14} />}{outcomeSaved ? "Saved to memory" : saveMutation.isPending ? "Saving…" : "Save outcome"}</button></div></Panel>

          <Panel testId="farm-context-panel"><SectionTitle icon={Leaf} testId="farm-context-title">Farm context</SectionTitle><div data-testid="farm-context-details" className="space-y-3 text-xs"><div className="flex justify-between gap-3"><span className="text-zinc-500">Farm</span><span className="text-right text-zinc-200">{snapshot.farm.name}</span></div><div className="flex justify-between gap-3"><span className="text-zinc-500">Soil</span><span className="text-right text-zinc-300">{snapshot.farm.soil}</span></div><div className="flex justify-between gap-3"><span className="text-zinc-500">Irrigation</span><span className="text-right text-zinc-300">{snapshot.farm.irrigation}</span></div><div className="flex justify-between gap-3"><span className="text-zinc-500">Yield</span><span data-testid="farm-yield-status" className="text-right text-emerald-400">{snapshot.farm.yield_status}</span></div></div><div className="mt-5 border-t border-zinc-800 pt-4"><p data-testid="farmer-agent-role-copy" className="text-[11px] leading-5 text-zinc-500"><span className="text-zinc-300">Farmer / scientist</span> = decision layer<br /><span className="text-emerald-400">AgroSense</span> = memory and reasoning</p></div></Panel>
        </aside>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <Panel testId="memory-timeline-panel"><div className="flex items-start justify-between gap-3"><div><Eyebrow testId="memory-timeline-eyebrow">Longitudinal learning</Eyebrow><h2 data-testid="memory-timeline-title" className="mt-2 font-heading text-xl font-semibold text-zinc-100">Memory timeline</h2></div><History className="text-emerald-400" size={18} /></div><div data-testid="memory-timeline" className="mt-6 grid gap-4 md:grid-cols-3">{[
          { day: "DAY 1", id: "Incident #101", title: "Outcome recorded", detail: "Expert validated · Positive outcome", active: selectedDay === 1 },
          { day: "DAY 30", id: "Incident #102", title: "Previous memory reused", detail: "1 similar case · Positive outcome", active: selectedDay === 30 },
          { day: "DAY 60", id: "Incident #103", title: "Multiple cases considered", detail: "2 historical cases · Contextual reasoning", active: selectedDay === 60 },
        ].map((item, index) => <div data-testid={`timeline-day-${item.day.replace(" ", "-").toLowerCase()}`} key={item.day} className="relative rounded-xl border border-zinc-800 bg-zinc-950/50 p-4"><div className="flex items-center gap-2"><span className={`size-2 rounded-full ${item.active ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.55)]" : "bg-zinc-700"}`} /><p className="font-mono text-[10px] uppercase tracking-widest text-emerald-400">{item.day}</p>{index < 2 && <ArrowDown className="ml-auto rotate-[-90deg] text-zinc-700" size={14} />}</div><p className="mt-4 text-sm font-semibold text-zinc-200">{item.id}</p><p className="mt-1 text-xs text-zinc-400">{item.title}</p><p className="mt-3 text-[11px] leading-5 text-zinc-600">{item.detail}</p></div>)}</div></Panel>

        <Panel testId="agent-chat-panel"><div className="flex items-start justify-between"><div><Eyebrow testId="agent-chat-eyebrow">Agent conversation</Eyebrow><h2 data-testid="agent-chat-title" className="mt-2 font-heading text-xl font-semibold text-zinc-100">What changed?</h2></div><Bot className="text-emerald-400" size={18} /></div><div data-testid="agent-chat-messages" className="mt-5 space-y-3">{snapshot.chat.map((message, index) => <div data-testid={`chat-message-${index + 1}`} key={`${message.speaker}-${index}`} className={`rounded-xl border p-3 ${message.speaker === "FARMER" ? "border-zinc-800 bg-zinc-950/50" : "border-emerald-500/15 bg-emerald-500/[0.045]"}`}><p className={`font-mono text-[9px] uppercase tracking-widest ${message.speaker === "FARMER" ? "text-zinc-500" : "text-emerald-400"}`}>{message.speaker}</p><p className="mt-1.5 text-xs leading-5 text-zinc-300">{message.text}</p></div>)}</div></Panel>
      </div>

      <footer data-testid="app-footer" className="flex flex-col gap-3 border-t border-zinc-800 py-8 text-xs text-zinc-600 sm:flex-row sm:items-center sm:justify-between"><p>AgroSense AI · Persistent Farm Intelligence Agent</p><p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider"><Database size={12} className="text-emerald-500" /> Local demo memory · no external AI calls</p></footer>
    </div>
  </main>;
}