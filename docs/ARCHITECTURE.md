# SecureX — System Architecture Document

## 1. Executive Summary

SecureX is built upon a **service-oriented architecture** that decouples the frontend client, API router, and core file processing services.

For **Review 1**, the application operates as an intelligent privacy prototype leveraging:
- A modern **Next.js + Tailwind** frontend.
- A **FastAPI** backend with strict Pydantic v2 schemas.
- Clean service abstractions: `AnalysisService`, `SanitizationService`, and `FileStorageService`.
- Review 1 input restricted to individual **JPEG**, **PNG**, and **PDF** files (ZIP input is strictly excluded).

The architecture ensures that the Review 1 AI prototype can later be replaced by deterministic production engines without requiring frontend modifications or API contract breakage.

---

## 2. Review 1 Workflow

Every component in the system adheres to the identical 7-stage sequential pipeline:

$$\text{UPLOAD} \longrightarrow \text{AI ANALYSIS} \longrightarrow \text{SHOW EXPOSED METADATA} \longrightarrow \text{USER CHOOSES WHAT TO REMOVE} \longrightarrow \text{SANITIZATION} \longrightarrow \text{SECURITY SCORE} \longrightarrow \text{DOWNLOAD SECURE FILE}$$

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant UI as Next.js + Tailwind UI
    participant API as FastAPI Router
    participant Storage as FileStorageService (Local)
    participant Analysis as AnalysisService (AI Prototype)
    participant Sanitizer as SanititizationService (Prototype)

    User->>UI: 1. UPLOAD (Individual JPEG, PNG, or PDF)
    UI->>API: POST /api/v1/files/upload (multipart/form-data)
    API->>Storage: Store original file in temporary directory
    Storage-->>API: file_id, file metadata
    API-->>UI: 201 Created { file_id }

    UI->>API: 2. AI ANALYSIS: POST /api/v1/analysis/{file_id}
    API->>Storage: Read file binary
    API->>Analysis: analyze_metadata(file_bytes, mime_type)
    Analysis-->>API: Categorized findings, severity levels, initial score
    API-->>UI: 200 OK { security_score, exposed_metadata }

    UI->>User: 3. SHOW EXPOSED METADATA (Risk cards with details)
    User->>UI: 4. USER CHOOSES WHAT TO REMOVE (Toggles metadata tags)
    User->>UI: Click "Sanitize File"

    UI->>API: 5. SANITIZATION: POST /api/v1/sanitization/{file_id} { fields_to_remove }
    API->>Storage: Retrieve original file
    API->>Sanitizer: sanitize_file(file_bytes, fields_to_remove)
    Sanitizer->>Storage: Store sanitized output file
    Sanitizer-->>API: Sanitization confirmation & updated metrics
    API-->>UI: 200 OK { sanitized_file_id, new_score, removed_fields }

    UI->>User: 6. SECURITY SCORE (Display updated score e.g. 35% -> 98%)
    User->>UI: 7. DOWNLOAD SECURE FILE (Click download)
    UI->>API: GET /api/v1/files/{sanitized_file_id}/download
    API->>Storage: Stream sanitized binary
    Storage-->>API: File stream
    API-->>UI: 200 OK (file binary)
    UI-->>User: File saved to user device
```

---

## 3. Review 1 Component Architecture

```mermaid
graph TD
    subgraph Client ["Client Tier (Next.js + Tailwind)"]
        UploadComp["Upload UI & File Selection"]
        ScanComp["Scan & Loading States"]
        FindingsComp["Exposed Metadata UI"]
        ToggleComp["Removal Selection Toggles"]
        ScoreComp["Security Score Display"]
        DownloadComp["Download UI & Error States"]
    end

    subgraph API ["API & Controller Tier (FastAPI)"]
        Router["FastAPI Router (/api/v1)"]
        Validation["Pydantic v2 Schema Validation"]
    end

    subgraph Core ["Service Abstraction Layer"]
        IAnalysis["AnalysisService (Interface)"]
        ISanitize["SanitizationService (Interface)"]
        IStorage["FileStorageService (Interface)"]
    end

    subgraph Review1Impl ["Review 1 Prototype Implementation"]
        AIAnalysis["AI-Based Prototype Analysis<br/>- Metadata Ingestion<br/>- Severity Categorization<br/>- Baseline Risk Assessment"]
        ProtoSanitize["Prototype Metadata Sanitization<br/>- JPEG Tag Stripping<br/>- PNG Chunk Stripping<br/>- PDF Catalog Stripping<br/>- Visible Content Preservation"]
        LocalStorage["Local Temporary File Storage<br/>- Session Temp Directory<br/>- 15-min TTL Eviction"]
    end

    UploadComp --> Router
    FindingsComp --> Router
    ToggleComp --> Router
    DownloadComp --> Router

    Router --> Validation
    Validation --> IAnalysis
    Validation --> ISanitize
    Validation --> IStorage

    IAnalysis --> AIAnalysis
    ISanitize --> ProtoSanitize
    IStorage --> LocalStorage
```

---

## 4. Service Abstraction Contracts

The backend enforces decoupling through three explicit abstract interfaces:

### 4.1 `AnalysisService`
- **Role**: Ingests raw file bytes (JPEG, PNG, or PDF) and returns structured privacy findings.
- **Review 1 Implementation**: AI-based prototype analysis. Inspects raw metadata fields, assigns severity levels (Critical, High, Medium, Low), generates user-friendly explanations, and computes the initial Privacy Security Score (0–100).
- **Future Implementation**: Deterministic metadata extraction (ExifTool / PyMuPDF / Pillow), regex-based privacy pattern classification, and deterministic risk-scoring rules.

### 4.2 `SanitizationService`
- **Role**: Receives the original file and a list of user-selected metadata concerns, producing a verified sanitized binary.
- **Review 1 Implementation**: Prototype metadata sanitization engine. Strips selected metadata fields while strictly preserving visible file content (zero image re-compression degradation and fully intact PDF rendering).
- **Future Implementation**: Production-hardened deterministic byte-level sanitization engines.

### 4.3 `FileStorageService`
- **Role**: Manages the persistence, retrieval, and lifecycle of original and sanitized files.
- **Review 1 Implementation**: Ephemeral local disk storage with UUID isolation and automated 15-minute TTL eviction.
- **Future Implementation**: Cloud object storage (S3/GCS) with presigned URLs and optional ZIP packaging for multiple sanitized files.

---

## 5. Architectural Evolution: Review 1 vs. Future

| Dimension | Review 1 Prototype | Future Production Architecture |
| :--- | :--- | :--- |
| **Analysis Engine** | AI-based prototype analysis behind `AnalysisService` | Deterministic extraction + Regex privacy classification + Rule-based risk scoring |
| **Sanitization Engine** | Prototype selective metadata stripper behind `SanitizationService` | Deterministic lossless metadata sanitization |
| **File Storage** | Ephemeral local disk storage behind `FileStorageService` | Cloud/object storage (S3/GCS) with presigned URLs |
| **Input Files** | Individual JPEG, PNG, and PDF files only (**No ZIP input**) | JPEG, PNG, PDF, plus optional multi-file batch processing |
| **Output Delivery** | Single sanitized file download | Single download or optional multi-file ZIP archive bundle |
| **Frontend UI** | Next.js + Tailwind with unified single-file flow | Next.js + Tailwind with multi-file queue and batch actions |
| **Scope Boundaries** | Single file, no auth, no OCR, no encryption, no Office formats | Multi-file ZIP export, OCR redaction, face blurring, Office documents |

---

## 6. Future Architecture Blueprint

```mermaid
graph TD
    subgraph ClientTier ["Client Tier (Next.js + Tailwind)"]
        Web["Web Application"]
    end

    subgraph APITier ["FastAPI Gateway"]
        Gateway["API Router & Rate Limiting"]
    end

    subgraph ServiceLayer ["Service Abstraction Layer"]
        AnalysisSvc["AnalysisService"]
        SanitizeSvc["SanitizationService"]
        StorageSvc["FileStorageService"]
        ZipPackagerSvc["ZIPPackagingService (Future)"]
    end

    subgraph DeterministicEngines ["Future Deterministic Engines"]
        ExifEngine["Deterministic ExifTool / PyMuPDF Extraction"]
        RegexEngine["Regex Privacy Classification"]
        RuleScorer["Deterministic Rule-Based Risk Scoring"]
        ByteSanitizer["Deterministic Lossless Sanitization"]
        CloudStorage["S3 / GCS Cloud Storage"]
        ZipModule["Multi-File Sanitized ZIP Packager"]
    end

    Web --> Gateway
    Gateway --> ServiceLayer

    AnalysisSvc --> ExifEngine
    AnalysisSvc --> RegexEngine
    AnalysisSvc --> RuleScorer

    SanitizeSvc --> ByteSanitizer
    StorageSvc --> CloudStorage
    ZipPackagerSvc --> ZipModule
```

---

## 7. Privacy & Security Principles

1. **Zero Data Retention**: Temporary uploaded and sanitized files are deleted upon session completion or after a 15-minute TTL.
2. **Strict Single-File Validation**: Input validation strictly accepts only individual JPEG, PNG, and PDF payloads, rejecting ZIP archives and unsupported MIME types.
3. **Lossless Quality Guarantee**: The sanitization pipeline strips only metadata bytes, guaranteeing that visible raster pixels and PDF visual layouts remain completely unaltered.
4. **No Client-Side Privacy Logic**: All metadata analysis and stripping happens strictly on the backend behind service abstractions, ensuring consistency and preventing tampering.
