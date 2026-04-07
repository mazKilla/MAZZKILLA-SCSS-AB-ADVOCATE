"""
Test suite for SCSS AB Advocate - iteration 3
Tests: security gate (frontend only), email converter API, chat API, debug endpoint
"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

@pytest.fixture
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ── Health ────────────────────────────────────────────────────────────

class TestHealth:
    def test_health(self, client):
        r = client.get(f"{BASE_URL}/api/health")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "ok"

    def test_debug_claude_model(self, client):
        r = client.get(f"{BASE_URL}/api/debug")
        assert r.status_code == 200
        data = r.json()
        claude = data["checks"]["claude"]
        assert claude["model"] == "claude-sonnet-4-6", f"Expected claude-sonnet-4-6, got {claude.get('model')}"
        assert claude["status"] == "ok"

    def test_debug_mongodb_ok(self, client):
        r = client.get(f"{BASE_URL}/api/debug")
        assert r.status_code == 200
        data = r.json()
        assert data["checks"]["mongodb"]["status"] == "ok"


# ── Email Converter Upload ─────────────────────────────────────────────

class TestECUpload:
    def test_upload_txt(self, client):
        """Upload .txt file creates a job"""
        txt_content = b"This is a test email body about ETW denial.\nSome content here."
        files = {"file": ("test_email.txt", io.BytesIO(txt_content), "text/plain")}
        r = requests.post(f"{BASE_URL}/api/ec/upload", files=files)
        assert r.status_code == 200
        data = r.json()
        assert "id" in data
        assert data["file_type"] == "txt"
        assert data["original_filename"] == "test_email.txt"
        return data["id"]

    def test_upload_pdf(self, client):
        """Upload .pdf file creates a job"""
        # minimal valid PDF
        pdf_bytes = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n190\n%%EOF"
        files = {"file": ("test_doc.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
        r = requests.post(f"{BASE_URL}/api/ec/upload", files=files)
        assert r.status_code == 200
        data = r.json()
        assert "id" in data
        assert data["file_type"] == "pdf"

    def test_upload_unsupported_rejected(self, client):
        """Upload .zip file returns 400"""
        zip_bytes = b"PK\x03\x04fake zip content"
        files = {"file": ("archive.zip", io.BytesIO(zip_bytes), "application/zip")}
        r = requests.post(f"{BASE_URL}/api/ec/upload", files=files)
        assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"

    def test_upload_eml(self, client):
        """Upload .eml file creates a job"""
        eml_content = b"From: test@example.com\r\nTo: recipient@example.com\r\nSubject: ETW Appeal Notice\r\nDate: Mon, 01 Jan 2024 12:00:00 +0000\r\n\r\nDear Client,\r\nYour ETW benefit has been denied.\r\n"
        files = {"file": ("email.eml", io.BytesIO(eml_content), "message/rfc822")}
        r = requests.post(f"{BASE_URL}/api/ec/upload", files=files)
        assert r.status_code == 200
        data = r.json()
        assert data["file_type"] == "eml"

    def test_upload_html(self, client):
        """Upload .html file creates a job"""
        html_bytes = b"<html><body><p>Test HTML email content</p></body></html>"
        files = {"file": ("email.html", io.BytesIO(html_bytes), "text/html")}
        r = requests.post(f"{BASE_URL}/api/ec/upload", files=files)
        assert r.status_code == 200
        data = r.json()
        assert data["file_type"] == "html"


# ── EC Jobs List ──────────────────────────────────────────────────────

class TestECJobs:
    def test_list_jobs(self, client):
        r = client.get(f"{BASE_URL}/api/ec/jobs")
        assert r.status_code == 200
        data = r.json()
        assert "jobs" in data
        assert "total" in data
        assert isinstance(data["jobs"], list)

    def test_job_detail_after_upload(self, client):
        """Upload then get job detail"""
        txt_content = b"Test document for job detail verification."
        files = {"file": ("detail_test.txt", io.BytesIO(txt_content), "text/plain")}
        r = requests.post(f"{BASE_URL}/api/ec/upload", files=files)
        assert r.status_code == 200
        job_id = r.json()["id"]

        # Get job detail
        import time; time.sleep(2)
        r2 = client.get(f"{BASE_URL}/api/ec/jobs/{job_id}")
        assert r2.status_code == 200
        data = r2.json()
        assert "job" in data
        assert "emails" in data
        assert data["job"]["id"] == job_id

    def test_delete_job(self, client):
        """Upload then delete job"""
        txt_content = b"Delete test content."
        files = {"file": ("delete_test.txt", io.BytesIO(txt_content), "text/plain")}
        r = requests.post(f"{BASE_URL}/api/ec/upload", files=files)
        assert r.status_code == 200
        job_id = r.json()["id"]

        r2 = client.delete(f"{BASE_URL}/api/ec/jobs/{job_id}")
        assert r2.status_code == 200

        r3 = client.get(f"{BASE_URL}/api/ec/jobs/{job_id}")
        assert r3.status_code == 404


# ── Chat ──────────────────────────────────────────────────────────────

class TestChat:
    def test_create_session(self, client):
        r = client.post(f"{BASE_URL}/api/sessions", json={"title": "TEST_Session", "model": "claude"})
        assert r.status_code == 200
        data = r.json()
        assert "id" in data
        return data["id"]

    def test_chat_message(self, client):
        """POST /api/chat returns a response"""
        # Create session first
        r = client.post(f"{BASE_URL}/api/sessions", json={"title": "TEST_ChatTest", "model": "claude"})
        assert r.status_code == 200
        session_id = r.json()["id"]

        # Send a simple message
        r2 = client.post(f"{BASE_URL}/api/chat", json={
            "session_id": session_id,
            "message": "What is ETW in Alberta? Brief answer.",
            "model": "claude",
            "search_enabled": False,
        })
        assert r2.status_code == 200, f"Chat failed: {r2.text}"
        data = r2.json()
        assert "response" in data
        assert len(data["response"]) > 10
        assert data["model"] == "claude"

        # Cleanup
        client.delete(f"{BASE_URL}/api/sessions/{session_id}")
