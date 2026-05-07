# Nexus
NEXUS: Sovereign Local Agentic OS — Samsung PRISM OpenClaw!!!
# NEXUS: Sovereign Local Agentic OS 🦞
## 🎥 Project Demo Video
https://drive.google.com/file/d/1QmblTxJNndy5jC6uYAlDgjUfOdq59dsE/view?usp=drive_link

## 🤖 AI Disclosure
https://drive.google.com/file/d/1-SIzq70d0fhWXy_KoadNzgVeL_ytfdnO/view?usp=sharing

> **Samsung PRISM OpenClaw Submission | Clash of the Claws**
> *Your Private Digital Brain. Zero Cloud Liability.*

NEXUS is an Agentic Operating System layer built on the **OpenClaw** framework. It bridges the gap between powerful GenAI capabilities and absolute data sovereignty. By running inference entirely on-device, NEXUS acts as an autonomous digital worker that seamlessly orchestrates multi-app workflows (WhatsApp, Zomato, Calendar, Calls) without ever sending your private data to the cloud.

---

## 🚀 The Problem & Our Moat

**The Problem:** Current AI assistants are cloud-dependent (risking data privacy) and reactive. Everyday apps are fragmented—requiring manual context-switching to handle a single real-world event (e.g., running late to a meeting requires opening Calendar, WhatsApp, and a food delivery app separately).

**The NEXUS Moat:** **100% Local Execution.** NEXUS never talks to the cloud for reasoning. By processing the entire reasoning and execution loop on local hardware, we offer multi-app automation with absolute privacy.

---

## 🧠 Architecture: The Brain & The Hands

NEXUS utilizes a decoupled architecture to ensure safe, modular execution:

1. **The Brain (Evaluator Node):** Uses a local LLM (via Ollama/Phi-3) to parse user intent, evaluate context, and make autonomous decisions.
2. **The JSON Contract:** The Brain outputs a strictly validated JSON payload (defined in `shared/contract.schema.json`) detailing the tasks to be done.
3. **The Hands (Worker Nodes):** Specialized OpenClaw agents read the contract and execute the API calls (e.g., drafting a WhatsApp message, rescheduling a Calendar event).

---

## ✨ Key Features

* **Cross-App Orchestration:** Links distinct services into a single autonomous loop.
* **Standardized JSON Protocols:** Uses strictly enforced schemas (`contract.schema.json`) validated via `Ajv`, making it easy for developers to add new "Hands."
* **Cost & Priority Awareness:** Tasks include estimated costs and rollback actions if an execution fails.
* **Human-in-the-Loop:** High-risk tasks are flagged with `requires_approval: true`, prompting the user before execution.

---

## 🛡️ The Ultimate Privacy Moat: Zero Cloud Liability

Current AI assistants suffer from a fatal flaw: to be helpful, they require your most intimate data (chats, calendar events, eating habits, and real-time location) to be sent to a cloud LLM. 

**NEXUS eliminates this telemetry entirely.**
* **Local Inference:** The "Brain" evaluates user intent using locally hosted LLMs (like Ollama/Phi-3). Your thoughts, intents, and prompts never leave your hardware.
* **Encrypted State:** Context snapshots and memory excerpts (e.g., *User has weekly sync at 19:00 with Rahul*) are stored securely on-device.
* **Granular Task Approval:** High-risk or costly actions are strictly gated by the `requires_approval` flag in our JSON schema, ensuring the AI cannot spend money or send critical messages without human-in-the-loop consent.

---

## 🗺️ Sovereign Mapping & Geo-Intelligence

Location is the most sensitive data point a user generates. NEXUS introduces a privacy-first **Geo Node** designed to handle complex routing, ETAs, and spatial awareness without compromising physical security.

* **Anonymous Routing:** When calculating ETAs (e.g., navigating to a meeting), the Geo Node obfuscates exact starting coordinates and strips user identity before querying any external mapping APIs.
* **Contextual Location Masking:** Instead of continuously tracking GPS, the system relies on contextual triggers (e.g., Calendar event locations combined with a discrete `get_eta` payload).
* **The "I am Late" Scenario:** If you trigger *"I am late"*, the Brain safely generates a task to the Geo Node using `last_known_meeting_location`, cross-references it with the Calendar Node, and informs your contacts via the Comms Node—all without broadcasting your live GPS ping to a third-party LLM provider.

---## 🛠️ Tech Stack

* **Framework:** OpenClaw 
* **AI/Inference:** Local LLMs (Ollama)
* **Backend:** Node.js
* **Validation:** Ajv (JSON Schema Validator)
* **Integrations:** WhatsApp Web JS, Twilio (Calls), Custom Handlers (Zomato, Calendar, Geo)

---

## 📖 Scenario Walkthrough: "I am late"

When a user triggers the phrase *"I am late"*, NEXUS autonomously generates a contract to handle the logistics:

1. **Calendar Node:** Reschedules the current meeting (e.g., pushes from 19:00 to 19:20).
2. **Comms Node (WhatsApp/Slack):** Drafts and sends an update to the meeting attendees (*"Hey, running about 20 minutes late..."*).
3. **Geo Node:** Calculates the new ETA based on current traffic.
4. **Food Node (Zomato):** If working late, queues up the "usual" order.

*See `shared/mock-payloads/late-scenario.json` for the exact payload generated by the Brain.*

---

## 📂 Repository Structure

```text
📦 Nexus
 ┣ 📂 shared
 ┃ ┣ 📂 mock-payloads
 ┃ ┃ ┗ 📜 late-scenario.json      # Example generated task contract
 ┃ ┣ 📂 validators
 ┃ ┃ ┗ 📜 contract-validator.js   # Ajv validation logic
 ┃ ┗ 📜 contract.schema.json      # The core protocol schema
 ┣ 📜 package.json                # Node dependencies
 ┗ 📜 README.md



