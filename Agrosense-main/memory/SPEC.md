# AgroSense AI Living Spec

## Product

Single-screen hackathon dashboard for a persistent farm intelligence agent.
AgroSense combines farmer and rover evidence with a Hindsight-shaped memory
loop. The central proof is that the same farm receives better context on Day 30
and Day 60 because validated outcomes are remembered.

## Data model

- **Farm:** Green Valley Farm, Tomato Field A, tomato crop, loamy soil, drip irrigation
- **Incident:** id, day, crop, field, symptoms, weather, diagnosis, treatment, outcome, expert validation, similarity
- **Evidence:** image, thermal supporting signal, weather, and GPS
- **Memory:** mode, label, historical incident count, validation count, positive outcome count, incidents
- **Demo snapshot:** current incident, rover evidence, agent steps, retrieval trace, memory, and conversation

## Key flows

1. Select Day 1, Day 30, Day 60, or Reset.
2. Start analysis to animate evidence collection, memory search, reasoning, recommendation, and expert validation.
3. Search memory to retrieve the deterministic historical cases for the selected day.
4. Request or approve expert validation.
5. Save the validated outcome to the backend demo memory abstraction.

## Demo behavior

- Day 1: no highly similar historical case; expert validation is requested.
- Day 30: Incident #101 is retrieved with high similarity and a positive validated outcome.
- Day 60: Incidents #101 and #102 are compared as multiple positive historical cases.
- Backend defaults to `HINDSIGHT_MODE=demo`; the UI never claims the real provider is connected.

## Auth and roles

No authentication. The farmer/scientist is the decision layer; AgroSense provides
contextual recommendations and requires expert validation before saving an outcome.