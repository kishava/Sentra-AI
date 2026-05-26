import type { WorldEngineReport } from "@/types/world-engine";

export function createDemoWorldReport(query: string): WorldEngineReport {
  const scenarioMode = /\b(if|scenario|simulate|replaces?|impact|what happens)\b/i.test(query);

  return {
    id: crypto.randomUUID(),
    query,
    generatedAt: new Date().toISOString(),
    provider: "demo",
    scenarioMode,
    headline: scenarioMode
      ? "Scenario lattice: automation pressure propagates through labor, policy, and demand"
      : "World pulse: technology acceleration intersects with cyber, climate, and market risk",
    executiveSummary: scenarioMode
      ? "This simulation models an automation shock as a cascading system rather than a prediction. Productivity gains may arrive quickly, while reskilling, wage pressure, and policy response determine social stability."
      : "Demo-mode intelligence reveals a connected risk landscape: AI investment velocity, infrastructure exposure, energy resilience, and geopolitical supply routes amplify one another across regions.",
    riskIndex: scenarioMode ? 78 : 64,
    confidence: scenarioMode ? 58 : 71,
    outlook: scenarioMode
      ? "Outcomes diverge sharply based on labor transition investment and distribution of productivity gains."
      : "Near-term attention should center on cyber resilience, compute supply, and policy reactions to rapid AI deployment.",
    recommendation: scenarioMode
      ? "Run policy-sensitive variants for retraining, wage support, and adoption pacing before treating any path as actionable."
      : "Corroborate active signals with live sources and prioritize cross-domain risks with the highest propagation velocity.",
    visualizations: scenarioMode
      ? ["globe", "network", "scenario", "forecast", "radar", "sentiment"]
      : ["globe", "network", "forecast", "radar", "sentiment"],
    signals: [
      { id: "north-america", title: "AI infrastructure investment", region: "North America", latitude: 38, longitude: -98, severity: "high", domain: "ai", sentiment: 42, intensity: 86, summary: "Compute demand and enterprise adoption remain prominent growth drivers." },
      { id: "europe", title: "Energy and regulatory pressure", region: "Europe", latitude: 50, longitude: 10, severity: "medium", domain: "climate", sentiment: -18, intensity: 62, summary: "Energy resilience and governance are coupled to industrial competitiveness." },
      { id: "east-asia", title: "Semiconductor supply sensitivity", region: "East Asia", latitude: 34, longitude: 128, severity: "critical", domain: "markets", sentiment: -35, intensity: 91, summary: "Supply concentration increases technology and market propagation risk." },
      { id: "south-asia", title: "Digital labor transition", region: "South Asia", latitude: 20, longitude: 78, severity: "high", domain: "ai", sentiment: 5, intensity: 76, summary: "Services employment is especially exposed to fast-moving automation scenarios." },
      { id: "middle-east", title: "Shipping route volatility", region: "Middle East", latitude: 25, longitude: 45, severity: "high", domain: "geopolitics", sentiment: -48, intensity: 82, summary: "Trade routes remain a possible amplifier for global pricing risk." },
      { id: "latin-america", title: "Climate-linked supply disruption", region: "Latin America", latitude: -12, longitude: -58, severity: "medium", domain: "climate", sentiment: -24, intensity: 57, summary: "Commodity exposure connects extreme weather to input prices." },
    ],
    nodes: [
      { id: "ai", label: "AI Adoption", kind: "technology", influence: 94, risk: 64 },
      { id: "compute", label: "Compute Supply", kind: "market", influence: 88, risk: 77 },
      { id: "labor", label: "Labor Markets", kind: "market", influence: 80, risk: 72 },
      { id: "policy", label: "Public Policy", kind: "government", influence: 71, risk: 55 },
      { id: "cyber", label: "Cyber Threats", kind: "conflict", influence: 84, risk: 86 },
      { id: "energy", label: "Energy Grid", kind: "market", influence: 68, risk: 63 },
      { id: "supply", label: "Supply Routes", kind: "trend", influence: 67, risk: 75 },
    ],
    links: [
      { source: "ai", target: "compute", strength: 93, rationale: "AI deployment requires accelerating compute capacity." },
      { source: "ai", target: "labor", strength: 84, rationale: "Automation changes role demand and skills allocation." },
      { source: "compute", target: "energy", strength: 77, rationale: "Compute expansion raises power and resilience requirements." },
      { source: "cyber", target: "compute", strength: 81, rationale: "Critical infrastructure concentrates attack exposure." },
      { source: "labor", target: "policy", strength: 72, rationale: "Employment shifts drive regulatory response." },
      { source: "supply", target: "compute", strength: 68, rationale: "Logistics disruption affects component supply." },
    ],
    forecasts: [
      { horizon: "30D", title: "Compute demand stays elevated", probability: 78, impact: 72, direction: "positive", rationale: "AI deployment momentum increases infrastructure need." },
      { horizon: "90D", title: "Cyber exposure prompts resilience spend", probability: 69, impact: 67, direction: "mixed", rationale: "Higher criticality typically increases defense investment and disruption concern." },
      { horizon: "180D", title: "Policy intervention on labor transition", probability: scenarioMode ? 74 : 52, impact: 81, direction: "mixed", rationale: "Rapid adoption can increase demand for workforce protections." },
      { horizon: "12M", title: "Productivity effects diverge by sector", probability: scenarioMode ? 81 : 63, impact: 76, direction: "mixed", rationale: "Adoption capacity and task composition vary across industries." },
    ],
    pulse: [
      { domain: "ai", intensity: 92, change: 18, sentiment: 48 },
      { domain: "finance", intensity: 62, change: 4, sentiment: 11 },
      { domain: "cybersecurity", intensity: 84, change: 21, sentiment: -38 },
      { domain: "geopolitics", intensity: 74, change: 8, sentiment: -41 },
      { domain: "climate", intensity: 58, change: -3, sentiment: -22 },
      { domain: "markets", intensity: 70, change: 6, sentiment: 7 },
    ],
    reasoning: [
      { stage: "Signal ingestion", finding: "Cross-domain signals were clustered by region and theme.", confidence: 96 },
      { stage: "Entity resolution", finding: "AI adoption, compute, labor, cyber, energy, and supply routes form the active network.", confidence: 80 },
      { stage: "Propagation model", finding: "Compute dependency is the highest-connectivity transmission path.", confidence: 72 },
      { stage: "Forecast synthesis", finding: "Scenario projections remain contingent and require live corroboration.", confidence: 58 },
    ],
    scenario: scenarioMode
      ? [
          { stage: "T+0", sector: "Knowledge work", effect: "Routine task displacement and productivity uplift occur simultaneously.", magnitude: 82, probability: 78 },
          { stage: "T+6M", sector: "Consumer demand", effect: "Wage uncertainty may suppress demand without transition support.", magnitude: 66, probability: 61 },
          { stage: "T+12M", sector: "Education + reskilling", effect: "Rapid demand for applied AI transition programs.", magnitude: 75, probability: 73 },
          { stage: "T+18M", sector: "Public policy", effect: "Labor protections and redistribution proposals intensify.", magnitude: 79, probability: 68 },
        ]
      : [],
    briefings: {
      quick: scenarioMode
        ? "Scenario briefing: a large automation shock could raise productivity while sharply increasing labor transition risk. The critical variable is policy and reskilling response."
        : "World pulse briefing: AI acceleration is connected to compute, cyber resilience, energy, and supply-route pressure. Verify live signals before action.",
      executive: scenarioMode
        ? "Executive briefing. This simulation is not a forecast. Under a high automation assumption, early productivity benefits can coincide with displacement pressure. Labor markets connect directly to policy response and consumer demand. Prioritize transition investment and run alternative adoption-rate variants."
        : "Executive briefing. Technology acceleration is the central network node, with compute capacity and cybersecurity as the strongest transmission routes. Regional activity points indicate connected market and resilience risks. Obtain live-source corroboration before elevating operational alerts.",
      deep: "Deep analyst mode: inspect the signal globe for geographic concentration, follow neural graph links for propagation logic, then test forecast paths and scenario cascades against independent evidence and explicit assumptions.",
    },
    sources: [],
    limitations: [
      "Demo mode uses illustrative signals and is not a statement of current world events.",
      "Forecast paths and scenario cascades are hypotheses, not verified future outcomes.",
    ],
  };
}
