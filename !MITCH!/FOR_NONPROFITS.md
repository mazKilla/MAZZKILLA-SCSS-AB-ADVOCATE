# SCSS AB Advocate — Overview for Non-Profit Organizations
### For Organizations like ECLC, Legal Aid Alberta, AUPE, Community Legal Clinics

---

## What Is This Tool?

**SCSS AB Advocate** is a free, AI-powered advocacy and research assistant built specifically
for Alberta social benefit cases.

It is designed to help **community organizations, legal clinics, social workers, and advocates**
support clients who are navigating:

- Alberta Works / Income Support appeals
- ETW (Expected to Work) designation challenges
- AISH applications and appeals
- SCSS (Seniors and Community Support Services) benefit disputes
- Citizens Appeal Panel (CAP) hearings
- Caseworker conduct complaints
- FOIP requests related to benefit files

---

## What It Does

| Capability | Description |
|-----------|-------------|
| **AI Advocacy Chat** | Ask any question about Alberta benefit policy — gets real-time answers grounded in IESA, regulations, and Alberta.ca policy manuals |
| **Appeal Strategy** | Identifies all grounds for appeal, procedural errors, and rights violations in a client's situation |
| **Policy Research** | Searches and retrieves live Alberta.ca policy documents and legislation |
| **Email Analysis** | Upload client correspondence from ALSS/caseworkers — the AI reads and flags key issues |
| **Email Converter** | Reformats client communications into proper appeal-ready language |
| **Draft Language** | Generates Notice of Appeal text, hearing submissions, and rights-based arguments |
| **Dual AI Models** | Claude (Anthropic) + Grok (xAI) — cross-reference answers for accuracy |

---

## Who It Is Built For

**Primary users:**
- Intake workers at community legal clinics
- Social benefit advocates and paralegals
- Front-line social workers helping clients navigate appeals
- Self-represented clients with basic computer access

**Secondary users:**
- Non-profit program directors building case documentation
- Students in social work / legal assistant programs
- Alberta community organizations doing systemic advocacy

---

## How It Helps Your Organization

### Speed Up Intake
Instead of spending 45 minutes researching ETW criteria for a new client,
an intake worker can get a policy-grounded answer in under 2 minutes.

### Consistency
Every caseworker at your organization accesses the same up-to-date policy knowledge —
no more variation based on who happens to know what.

### Client Empowerment
Put the tool directly in front of clients who are capable of self-advocacy —
the AI is designed to speak directly to claimants, not just professionals.

### Documentation
Upload client emails and ALSS correspondence — the AI flags procedural errors,
missed deadlines, and rights violations that might otherwise be overlooked.

### Appeal Preparation
The tool drafts appeal language grounded in specific sections of the
Income and Employment Supports Act (IESA) and related regulations.

---

## What It Does NOT Do

- It does not provide legal advice or create a lawyer-client relationship
- It does not file documents on behalf of clients
- It does not access client files in government systems
- It does not replace the judgment of a qualified advocate or lawyer
- It is a **research and drafting assistant** — human review is always required

---

## Privacy & Data

- The tool runs on your own infrastructure (no data sent to third-party servers beyond the AI API)
- Client information entered into the chat is processed by Anthropic (Claude) — same as any Claude.ai conversation
- **Do not enter full legal names, SIN numbers, or file numbers** — use initials or case codes
- All session data is stored in your own MongoDB database — you control it

---

## Deployment

The tool runs locally on a Windows machine or server on your LAN.
Any device on your office network can access it via a browser — no installation required on client machines.

```
Your office server  →  http://[server-ip]:3000  ←  Any browser on your LAN
```

**Requirements to run:**
- Windows 10/11 PC or server
- Python 3.10+, Node.js 18+
- MongoDB Atlas account (free tier sufficient)
- Anthropic API key (pay-as-you-go, approx $0.003–0.015 per conversation)

---

## Contact / Support

This tool was built by and for Alberta benefit advocates.
For deployment help, customization, or to report issues, contact the project maintainer.

---

*SCSS AB Advocate — Built for Alberta. Built for clients.*
*Version: First Working Build (2026-04-06)*
