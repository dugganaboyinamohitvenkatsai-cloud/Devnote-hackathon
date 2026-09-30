export type DemoDay = 1 | 30 | 60;
export type StepStatus = "complete" | "active" | "pending";

export interface FarmProfile {
  name: string;
  field: string;
  crop: string;
  soil: string;
  planting_date: string;
  irrigation: string;
  previous_issues: string;
  yield_status: string;
}

export interface Evidence {
  label: string;
  value: string;
  status: "captured" | "supporting";
}

export interface Incident {
  id: string;
  day: string;
  crop: string;
  field: string;
  symptoms: string;
  weather: string;
  diagnosis: string;
  treatment: string;
  outcome: string;
  expert_validated: boolean;
  similarity: string;
}

export interface CurrentIncident {
  id: string;
  crop: string;
  field: string;
  symptoms: string;
  weather: string;
  temperature: string;
  humidity: string;
  evidence: Evidence[];
  potential_diagnosis: string;
  recommendation: string;
  confidence: string;
}

export interface RoverEvidence {
  status: string;
  motto: string;
  sensors: string[];
  image_note: string;
  thermal_note: string;
  location_note: string;
}

export interface AgentStep {
  id: string;
  label: string;
  detail: string;
  status: StepStatus;
}

export interface MemoryRetrieval {
  current_incident: string;
  result_label: string;
  result_detail: string;
  reasoning: string[];
}

export interface MemoryStats {
  historical_incidents: number;
  expert_validations: number;
  successful_outcomes: number;
}

export interface MemoryResponse {
  mode: "demo" | "real";
  label: string;
  stats: MemoryStats;
  incidents: Incident[];
}

export interface DemoSnapshot {
  day: number;
  day_label: string;
  farm: FarmProfile;
  incident: CurrentIncident;
  rover: RoverEvidence;
  agent_state: string;
  agent_steps: AgentStep[];
  retrieval: MemoryRetrieval;
  memory: MemoryResponse;
  chat: { speaker: string; text: string }[];
}

export interface MemorySearchResponse {
  mode: "demo" | "real";
  found: number;
  incidents: Incident[];
  message: string;
}

export interface MemorySaveResponse {
  saved: boolean;
  mode: "demo" | "real";
  incident_id: string;
  message: string;
}

export interface HealthResponse {
  service: string;
  mode: "demo" | "real";
  connected: boolean;
  message: string;
}