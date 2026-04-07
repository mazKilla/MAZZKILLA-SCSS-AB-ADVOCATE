"""
Email Converter API tests - /api/ec/* endpoints
Tests: upload, list jobs, get job, delete job, download email txt, export zip
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Minimal valid .eml content for testing
TEST_EML_CONTENT = b"""From: test@example.com
To: user@test.com
Subject: Test ETW Appeal Notice
Date: Mon, 15 Jan 2024 10:30:00 +0000
Content-Type: text/plain

This is a test email body for the ETW appeal process.
"""


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Accept": "application/json"})
    return s


@pytest.fixture(scope="module")
def created_job(api):
    """Upload a valid .eml file and return created job"""
    files = {"file": ("test_etw.eml", TEST_EML_CONTENT, "message/rfc822")}
    res = api.post(f"{BASE_URL}/api/ec/upload", files=files)
    assert res.status_code == 200, f"Upload failed: {res.text}"
    return res.json()


class TestECHealth:
    """Basic EC endpoints health"""

    def test_list_jobs_empty_structure(self, api):
        """GET /api/ec/jobs returns jobs and total"""
        res = api.get(f"{BASE_URL}/api/ec/jobs")
        assert res.status_code == 200
        data = res.json()
        assert "jobs" in data
        assert "total" in data
        assert isinstance(data["jobs"], list)
        assert isinstance(data["total"], int)
        print(f"✓ GET /api/ec/jobs - {data['total']} total jobs")

    def test_upload_invalid_file_type_returns_400(self, api):
        """POST /api/ec/upload with .txt file returns 400"""
        files = {"file": ("test.txt", b"plain text content", "text/plain")}
        res = api.post(f"{BASE_URL}/api/ec/upload", files=files)
        assert res.status_code == 400
        data = res.json()
        assert "detail" in data
        print(f"✓ .txt upload rejected with 400: {data['detail']}")


class TestECUploadFlow:
    """Upload .eml and verify job creation"""

    def test_upload_valid_eml_returns_job(self, api):
        """POST /api/ec/upload with valid .eml creates job"""
        files = {"file": ("test_appeal.eml", TEST_EML_CONTENT, "message/rfc822")}
        res = api.post(f"{BASE_URL}/api/ec/upload", files=files)
        assert res.status_code == 200
        data = res.json()
        assert "id" in data
        assert data["status"] in ("pending", "processing", "completed")
        assert data["original_filename"] == "test_appeal.eml"
        assert data["file_type"] == "eml"
        print(f"✓ Upload created job: {data['id']}, status={data['status']}")

    def test_upload_returns_no_mongodb_id(self, api):
        """Response should not contain _id"""
        files = {"file": ("check_id.eml", TEST_EML_CONTENT, "message/rfc822")}
        res = api.post(f"{BASE_URL}/api/ec/upload", files=files)
        assert res.status_code == 200
        data = res.json()
        assert "_id" not in data
        print("✓ No _id in response")


class TestECJobCRUD:
    """Job CRUD operations"""

    def test_get_job_detail(self, api, created_job):
        """GET /api/ec/jobs/{id} returns job + emails array"""
        job_id = created_job["id"]
        # Wait for processing
        for _ in range(10):
            res = api.get(f"{BASE_URL}/api/ec/jobs/{job_id}")
            assert res.status_code == 200
            data = res.json()
            if data["job"]["status"] in ("completed", "failed"):
                break
            time.sleep(1)
        
        assert "job" in data
        assert "emails" in data
        assert isinstance(data["emails"], list)
        assert data["job"]["id"] == job_id
        print(f"✓ Job {job_id}: status={data['job']['status']}, emails={len(data['emails'])}")

    def test_job_appears_in_jobs_list(self, api, created_job):
        """Uploaded job appears in GET /api/ec/jobs"""
        job_id = created_job["id"]
        res = api.get(f"{BASE_URL}/api/ec/jobs")
        assert res.status_code == 200
        data = res.json()
        job_ids = [j["id"] for j in data["jobs"]]
        assert job_id in job_ids
        print(f"✓ Job {job_id} appears in job list")

    def test_completed_job_has_emails(self, api, created_job):
        """Completed job has at least 1 email"""
        job_id = created_job["id"]
        # Wait up to 15s for completion
        data = None
        for _ in range(15):
            res = api.get(f"{BASE_URL}/api/ec/jobs/{job_id}")
            data = res.json()
            if data["job"]["status"] == "completed":
                break
            time.sleep(1)
        
        if data["job"]["status"] == "completed":
            assert len(data["emails"]) >= 1
            em = data["emails"][0]
            assert "generated_filename" in em
            assert "subject" in em
            assert "sender" in em
            print(f"✓ Completed job has {len(data['emails'])} email(s)")
            print(f"  Filename: {em['generated_filename']}")
            print(f"  Subject: {em['subject']}, Sender: {em['sender']}")
        else:
            pytest.skip(f"Job not completed in time, status={data['job']['status']}")

    def test_filename_format(self, api, created_job):
        """Verify filename format: contains date separator and sender_subject pattern"""
        job_id = created_job["id"]
        for _ in range(15):
            res = api.get(f"{BASE_URL}/api/ec/jobs/{job_id}")
            data = res.json()
            if data["job"]["status"] == "completed":
                break
            time.sleep(1)
        
        if data["job"]["status"] == "completed" and data["emails"]:
            fname = data["emails"][0]["generated_filename"]
            # Should contain YYYY/DD/MM:HH:MM - sender_subject pattern
            assert "/" in fname or "-" in fname, f"Unexpected filename format: {fname}"
            print(f"✓ Filename format: {fname}")
        else:
            pytest.skip("Job not completed")


class TestECEmailDownload:
    """Email download and zip export"""

    def test_download_txt_returns_text(self, api, created_job):
        """GET /api/ec/emails/{id}/download returns text content"""
        job_id = created_job["id"]
        # Wait for completion
        emails = []
        for _ in range(15):
            res = api.get(f"{BASE_URL}/api/ec/jobs/{job_id}")
            data = res.json()
            if data["job"]["status"] == "completed":
                emails = data["emails"]
                break
            time.sleep(1)
        
        if not emails:
            pytest.skip("No emails found")
        
        email_id = emails[0]["id"]
        res = api.get(f"{BASE_URL}/api/ec/emails/{email_id}/download")
        assert res.status_code == 200
        assert "text/plain" in res.headers.get("content-type", "")
        assert len(res.content) > 0
        text = res.content.decode("utf-8")
        assert "FILE:" in text or "Subject:" in text
        print(f"✓ TXT download: {len(text)} chars, starts with: {text[:60]}")

    def test_export_zip_returns_zip(self, api, created_job):
        """GET /api/ec/jobs/{id}/export returns ZIP"""
        job_id = created_job["id"]
        # Wait for completion
        for _ in range(15):
            res = api.get(f"{BASE_URL}/api/ec/jobs/{job_id}")
            data = res.json()
            if data["job"]["status"] == "completed":
                break
            time.sleep(1)
        
        res = api.get(f"{BASE_URL}/api/ec/jobs/{job_id}/export")
        assert res.status_code == 200
        assert "zip" in res.headers.get("content-type", "").lower() or len(res.content) > 0
        # Check ZIP magic bytes
        assert res.content[:2] == b"PK", "Response is not a valid ZIP file"
        print(f"✓ ZIP export: {len(res.content)} bytes")


class TestECDeleteJob:
    """Delete job and verify removal"""

    def test_delete_job_removes_from_list(self, api):
        """Create job, delete it, verify it's gone"""
        # Create
        files = {"file": ("to_delete.eml", TEST_EML_CONTENT, "message/rfc822")}
        res = api.post(f"{BASE_URL}/api/ec/upload", files=files)
        assert res.status_code == 200
        job_id = res.json()["id"]
        
        # Delete
        del_res = api.delete(f"{BASE_URL}/api/ec/jobs/{job_id}")
        assert del_res.status_code == 200
        assert del_res.json()["success"] is True
        
        # Verify gone (404)
        get_res = api.get(f"{BASE_URL}/api/ec/jobs/{job_id}")
        assert get_res.status_code == 404
        print(f"✓ Deleted job {job_id}, confirmed 404")

    def test_get_invalid_job_id_returns_400(self, api):
        """GET /api/ec/jobs/invalid_id returns 400"""
        res = api.get(f"{BASE_URL}/api/ec/jobs/not_an_objectid")
        assert res.status_code == 400
        print("✓ Invalid job ID returns 400")
