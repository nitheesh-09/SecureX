# SecureX — REST API Specification & Contract

## 1. Overview & Architectural Standards

- **Base URL**: `/api/v1`
- **Protocol**: HTTP/1.1 or HTTP/2
- **Data Format**: Requests and responses use `application/json` (except file upload which uses `multipart/form-data`, and file download which streams the binary).
- **Date/Time Standard**: ISO 8601 strings in UTC (`YYYY-MM-DDTHH:MM:SSZ`).
- **Identifier Format**: Standard UUID v4 for all file entities.

### Review 1 Scope & Input Rules
- **Accepted Files**: Individual **JPEG**, **PNG**, and **PDF** files only.
- **Single File Processing**: Each upload request accepts exactly one file.
- **Strict Restriction**: **ZIP input is NOT part of Review 1.** Uploading a `.zip` archive or multi-file package returns a `400 Bad Request` (`ZIP_INPUT_NOT_SUPPORTED`).
- **Workflow Order**:
  $$\text{UPLOAD} \longrightarrow \text{AI ANALYSIS} \longrightarrow \text{SHOW EXPOSED METADATA} \longrightarrow \text{USER CHOOSES WHAT TO REMOVE} \longrightarrow \text{SANITIZATION} \longrightarrow \text{SECURITY SCORE} \longrightarrow \text{DOWNLOAD SECURE FILE}$$

---

## 2. Standard Response & Error Formats

### 2.1 Standard Error Envelope
All error responses (4xx, 5xx) return a consistent JSON envelope:

```json
{
  "success": false,
  "error": {
    "code": "ZIP_INPUT_NOT_SUPPORTED",
    "message": "ZIP input is not supported in Review 1. Please upload an individual JPEG, PNG, or PDF file.",
    "details": {
      "provided_mime_type": "application/zip",
      "allowed_mime_types": [
        "image/jpeg",
        "image/png",
        "application/pdf"
      ]
    },
    "timestamp": "2026-09-14T14:45:00Z"
  }
}
```

---

## 3. Endpoints Specification

### 3.1 Upload File
Accepts a single individual file (JPEG, PNG, or PDF), verifies extension and magic bytes, and stores it in temporary storage.

- **Method**: `POST`
- **Path**: `/api/v1/files/upload`
- **Content-Type**: `multipart/form-data`

#### Request Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `file` | Binary File | Yes | Single individual file payload (`.jpg`, `.jpeg`, `.png`, `.pdf`). Max size: 25 MB. |

#### Response: `201 Created`
```json
{
  "success": true,
  "data": {
    "file_id": "7b6b1a5e-2f74-4b5a-9397-6a56c24151e3",
    "original_filename": "vacation_photo.jpg",
    "file_size_bytes": 3412580,
    "mime_type": "image/jpeg",
    "uploaded_at": "2026-09-14T14:45:00Z",
    "expires_at": "2026-09-14T15:00:00Z"
  }
}
```

#### Error Responses
- `400 Bad Request`: Invalid file type or ZIP upload attempt.
- `413 Payload Too Large`: Uploaded file exceeds 25 MB.

---

### 3.2 Trigger AI Analysis
Executes the `AnalysisService` AI prototype to extract embedded metadata tags, detect privacy hazards, categorize severity levels, and generate the initial Security Score.

- **Method**: `POST`
- **Path**: `/api/v1/analysis/{file_id}`
- **Content-Type**: `application/json`

#### URL Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `file_id` | UUID | Yes | Unique identifier of the uploaded file. |

#### Response: `200 OK`
```json
{
  "success": true,
  "data": {
    "file_id": "7b6b1a5e-2f74-4b5a-9397-6a56c24151e3",
    "filename": "vacation_photo.jpg",
    "mime_type": "image/jpeg",
    "security_score": 32,
    "overall_risk_level": "CRITICAL",
    "summary": "File contains critical geolocation coordinates and hardware identifiers exposing personal whereabouts.",
    "category_breakdown": {
      "location": {
        "detected_count": 2,
        "risk_level": "CRITICAL"
      },
      "device_hardware": {
        "detected_count": 2,
        "risk_level": "HIGH"
      },
      "author_identity": {
        "detected_count": 1,
        "risk_level": "MEDIUM"
      },
      "software_history": {
        "detected_count": 1,
        "risk_level": "LOW"
      }
    },
    "exposed_metadata": [
      {
        "id": "meta_gps_coords",
        "category": "location",
        "tag_name": "GPSCoordinates",
        "raw_value": "37°46'29.8\"N 122°25'09.8\"W",
        "display_value": "37.7749, -122.4194",
        "risk_level": "CRITICAL",
        "description": "Precise geographic location where the file was captured.",
        "recommendation": "REMOVE"
      },
      {
        "id": "meta_camera_serial",
        "category": "device_hardware",
        "tag_name": "BodySerialNumber",
        "raw_value": "SN-8849201948",
        "display_value": "SN-8849201948",
        "risk_level": "HIGH",
        "description": "Unique camera body hardware identifier.",
        "recommendation": "REMOVE"
      },
      {
        "id": "meta_author_creator",
        "category": "author_identity",
        "tag_name": "Artist / Creator",
        "raw_value": "Alex Mercer",
        "display_value": "Alex Mercer",
        "risk_level": "MEDIUM",
        "description": "Embedded author or creator identity.",
        "recommendation": "REMOVE"
      },
      {
        "id": "meta_color_space",
        "category": "software_history",
        "tag_name": "ColorSpace",
        "raw_value": "sRGB",
        "display_value": "sRGB",
        "risk_level": "LOW",
        "description": "Standard color profile required for proper screen rendering.",
        "recommendation": "KEEP"
      }
    ]
  }
}
```

#### Error Responses
- `404 Not Found`: `file_id` does not exist or has expired.
- `422 Unprocessable Entity`: File is corrupted and cannot be parsed.

---

### 3.3 Execute Metadata Sanitization
Submits the user's selected metadata concerns to strip. Invokes `SanitizationService` to produce a clean binary (preserving visible content) and recalculates the updated Security Score.

- **Method**: `POST`
- **Path**: `/api/v1/sanitization/{file_id}`
- **Content-Type**: `application/json`

#### URL Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `file_id` | UUID | Yes | Target file identifier. |

#### Request Body
```json
{
  "fields_to_remove": [
    "meta_gps_coords",
    "meta_camera_serial",
    "meta_author_creator"
  ]
}
```

#### Response: `200 OK`
```json
{
  "success": true,
  "data": {
    "sanitized_file_id": "c19b2e48-8384-4903-b09e-73cbb7621db8",
    "original_file_id": "7b6b1a5e-2f74-4b5a-9397-6a56c24151e3",
    "original_security_score": 32,
    "new_security_score": 98,
    "score_improvement": "+66%",
    "overall_risk_level": "SAFE",
    "removed_fields": [
      "GPSCoordinates",
      "BodySerialNumber",
      "Artist / Creator"
    ],
    "retained_fields": [
      "ColorSpace"
    ],
    "sanitized_file_size_bytes": 3410120,
    "download_url": "/api/v1/files/c19b2e48-8384-4903-b09e-73cbb7621db8/download",
    "expires_at": "2026-09-14T15:00:00Z"
  }
}
```

#### Error Responses
- `400 Bad Request`: Invalid field IDs provided.
- `404 Not Found`: Original file not found.
- `500 Internal Server Error`: Sanitization engine failed.

---

### 3.4 Download Sanitized File
Streams the sanitized file to the user's browser.

- **Method**: `GET`
- **Path**: `/api/v1/files/{file_id}/download`

#### URL Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `file_id` | UUID | Yes | Identifier of the sanitized file. |

#### Response: `200 OK`
- **Content-Type**: `image/jpeg` (or `image/png`, `application/pdf`)
- **Headers**:
  ```http
  Content-Disposition: attachment; filename="sanitized_vacation_photo.jpg"
  Content-Length: 3410120
  Cache-Control: no-store, no-cache, must-revalidate
  ```
- **Body**: Raw binary stream.

#### Error Responses
- `404 Not Found`: File not found or expired.

---

### 3.5 Health Check
Returns backend status and service readiness.

- **Method**: `GET`
- **Path**: `/api/v1/health`

#### Response: `200 OK`
```json
{
  "status": "healthy",
  "version": "0.1.0",
  "services": {
    "analysis_service": "online",
    "sanitization_service": "online",
    "storage_service": "online"
  },
  "review_milestone": "Review 1 Prototype"
}
```
