# Dummy Data for Legal AI Tools Testing

This folder contains realistic dummy data to verify all 3 legal AI tool endpoints.

---

## 📁 Folder Structure

```
dummy-data/
├── README.md
├── case-analyzer/          → POST /api/tools/case-analyzer
│   ├── case_01_cyber_fraud.txt
│   ├── case_02_domestic_violence.txt
│   └── case_03_road_accident.txt
├── contract-risk/          → POST /api/tools/contract-risk
│   ├── contract_01_employment_risky.txt
│   ├── contract_02_rental_unfair.txt
│   └── contract_03_freelance_unfair.txt
└── case-summarizer/        → POST /api/tools/case-summarizer
    ├── document_01_fir_cyberstalking.txt
    ├── document_02_chargesheet_assault.txt
    └── document_03_court_order_environment.txt
```

---

## 🧪 How to Test

### Prerequisites
1. RAG server running: `cd RAG && uvicorn main:app --port 8000`
2. Backend running: `cd backend && npm run dev`
3. Have a valid JWT token (login first via `/api/auth/login`)

### Using cURL

Replace `YOUR_JWT_TOKEN` with your actual token in all commands below.

#### 1. AI Case Analyzer

```bash
# Test with cyber fraud case
curl -X POST http://localhost:4000/api/tools/case-analyzer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d "{\"case_text\": \"$(cat dummy-data/case-analyzer/case_01_cyber_fraud.txt)\"}"
```

#### 2. Contract Risk Analyzer

```bash
# Test with risky employment contract
curl -X POST http://localhost:4000/api/tools/contract-risk \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d "{\"contract_text\": \"$(cat dummy-data/contract-risk/contract_01_employment_risky.txt)\"}"
```

#### 3. Case File Summarizer

```bash
# Test with FIR document
curl -X POST http://localhost:4000/api/tools/case-summarizer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d "{\"document_text\": \"$(cat dummy-data/case-summarizer/document_01_fir_cyberstalking.txt)\"}"
```

---

## 📋 Test Data Details

### Case Analyzer Data

| File | Scenario | Key Legal Areas |
|------|----------|----------------|
| `case_01_cyber_fraud.txt` | Fake e-commerce website fraud (Rs. 97K) | IT Act, BNS fraud/cheating sections |
| `case_02_domestic_violence.txt` | Dowry harassment & physical abuse | DV Act, Dowry Prohibition Act, BNS |
| `case_03_road_accident.txt` | Fatal drunk driving accident | Motor Vehicles Act, BNS (causing death) |

### Contract Risk Analyzer Data

| File | Scenario | Expected Risk Level |
|------|----------|-------------------|
| `contract_01_employment_risky.txt` | Unfair employment contract | **High** (70+) — non-compete, IP grab, one-sided termination |
| `contract_02_rental_unfair.txt` | Landlord-favored rental agreement | **High** (70+) — extreme penalties, waived tenant rights |
| `contract_03_freelance_unfair.txt` | Exploitative freelance agreement | **High** (65+) — unlimited liability, no freelancer termination |

### Case Summarizer Data

| File | Document Type | Content |
|------|-------------|---------|
| `document_01_fir_cyberstalking.txt` | FIR | Cyberstalking, revenge porn, criminal intimidation |
| `document_02_chargesheet_assault.txt` | Chargesheet | Grievous assault, illegal money lending |
| `document_03_court_order_environment.txt` | Court Order | Environmental pollution, Ramsar wetland protection |

---

## ✅ Expected Response Shape

### Case Analyzer & Summarizer
```json
{
  "ai_answer": "...",
  "supporting_sections": [...],
  "model_used": "...",
  "savedAnalysisId": "MongoDB ObjectId"
}
```

### Contract Risk Analyzer
```json
{
  "ai_answer": "...",
  "supporting_sections": [...],
  "risk_score": 75,
  "risk_level": "High",
  "flagged_clauses": ["...", "..."],
  "model_used": "...",
  "savedAnalysisId": "MongoDB ObjectId"
}
```
