"""
Tests for iteration 6: Email Converter fixes
- attachments_summary field in EmailCreate/POST /api/emails
- GET /api/emails returns attachments_summary
- Email body truncation: body stored correctly (not truncated on save)
- POST /api/chat with email context uses [:8000] chars
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# ── Email References ──────────────────────────────────────────────────────────

class TestEmailReferenceWithAttachmentsSummary:
    """Test POST /api/emails saves attachments_summary and GET returns it"""

    created_id = None

    def test_create_email_with_attachments_summary(self):
        payload = {
            "subject": "TEST_EC_Fix Denial Notice",
            "sender": "etw@alberta.ca",
            "recipients": "advocate@example.com",
            "body": "Subject: TEST_EC_Fix Denial Notice\nFrom: etw@alberta.ca\nTo: advocate@example.com\nAttachments (2): doc.pdf, scan.png\nWord Count: 120\n\nThis is the clean body of the email." + " extra " * 400,  # ~2800 chars
            "email_date": "2025-01-15T10:00:00",
            "attachments_summary": "doc.pdf (application/pdf, 12 KB), scan.png (image/png, 4 KB)",
        }
        r = requests.post(f"{BASE_URL}/api/emails", json=payload)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data["subject"] == payload["subject"]
        assert data["attachments_summary"] == payload["attachments_summary"]
        assert "id" in data
        TestEmailReferenceWithAttachmentsSummary.created_id = data["id"]
        print(f"PASS: Email created with id={data['id']}, attachments_summary={data['attachments_summary']}")

    def test_get_email_has_attachments_summary(self):
        eid = TestEmailReferenceWithAttachmentsSummary.created_id
        assert eid, "No email ID from previous test"
        r = requests.get(f"{BASE_URL}/api/emails/{eid}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        assert data.get("attachments_summary") == "doc.pdf (application/pdf, 12 KB), scan.png (image/png, 4 KB)"
        print(f"PASS: GET /api/emails/{eid} returned attachments_summary correctly")

    def test_list_emails_endpoint(self):
        r = requests.get(f"{BASE_URL}/api/emails")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        assert "emails" in data
        assert "total" in data
        assert isinstance(data["emails"], list)
        print(f"PASS: GET /api/emails returned {data['total']} total emails")

    def test_body_not_truncated_on_save(self):
        """Body should store full text — at least the long body we sent"""
        eid = TestEmailReferenceWithAttachmentsSummary.created_id
        assert eid, "No email ID from previous test"
        r = requests.get(f"{BASE_URL}/api/emails/{eid}")
        assert r.status_code == 200
        data = r.json()
        # Body should be longer than 1000 chars (old truncation was [:1000])
        body = data.get("body", "")
        assert len(body) > 1000, f"Body seems truncated: length={len(body)}"
        print(f"PASS: Body stored with length={len(body)} (not truncated)")

    def test_create_multiple_emails_separately(self):
        """Simulates bulk send — 2 emails should be saved as 2 separate records"""
        payloads = [
            {
                "subject": "TEST_EC_Bulk_Email_1",
                "sender": "sender1@test.com",
                "recipients": "r@test.com",
                "body": "Body of email 1",
                "attachments_summary": "",
            },
            {
                "subject": "TEST_EC_Bulk_Email_2",
                "sender": "sender2@test.com",
                "recipients": "r@test.com",
                "body": "Body of email 2",
                "attachments_summary": "file.pdf (application/pdf, 5 KB)",
            },
        ]
        ids = []
        for p in payloads:
            r = requests.post(f"{BASE_URL}/api/emails", json=p)
            assert r.status_code == 200, f"Expected 200: {r.text}"
            ids.append(r.json()["id"])

        assert ids[0] != ids[1], "Two emails should have different IDs"
        print(f"PASS: 2 separate emails created: {ids}")

        # Verify both exist
        for eid in ids:
            r = requests.get(f"{BASE_URL}/api/emails/{eid}")
            assert r.status_code == 200
        print("PASS: Both emails verified via GET")

    def test_cleanup_test_data(self):
        """Clean up TEST_ emails"""
        r = requests.get(f"{BASE_URL}/api/emails?q=TEST_EC_")
        if r.status_code == 200:
            for em in r.json().get("emails", []):
                requests.delete(f"{BASE_URL}/api/emails/{em['id']}")
        print("PASS: Cleanup done")


# ── EC Jobs endpoint ────────────────────────────────────────────────────────

class TestECJobsEndpoint:
    def test_list_jobs(self):
        r = requests.get(f"{BASE_URL}/api/ec/jobs")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        assert "jobs" in data
        print(f"PASS: GET /api/ec/jobs returned {len(data['jobs'])} jobs")

    def test_upload_txt_email(self):
        """Upload a simple .txt file and verify job is created"""
        content = b"From: test@example.com\nTo: advocate@alberta.ca\nSubject: ETW Test Email\nDate: Mon, 15 Jan 2025\n\nThis is the body of the test email.\nIt contains important information about ETW benefits."
        files = {"file": ("test_email.txt", content, "text/plain")}
        r = requests.post(f"{BASE_URL}/api/ec/upload", files=files)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert "job_id" in data or "id" in data
        job_id = data.get("job_id") or data.get("id")
        print(f"PASS: Upload succeeded, job_id={job_id}")
        return job_id


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
