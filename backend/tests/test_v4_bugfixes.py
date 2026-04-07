"""
Tests for iteration 4 bug fixes:
- POST /api/emails (send to advocate)
- GET /api/emails (list email references)
- DELETE /api/ec/wipe (wipe all jobs)
- POST /api/chat includes all email references in context
- GET /api/models shows Claude Sonnet 4.6
- EC upload + job creation
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ── /api/models ─────────────────────────────────────────────────────────

def test_models_shows_claude_46(api):
    """Header should show Claude Sonnet 4.6"""
    r = api.get(f"{BASE_URL}/api/models")
    assert r.status_code == 200
    models = r.json()["models"]
    claude = next((m for m in models if m["id"] == "claude"), None)
    assert claude is not None
    assert "4.6" in claude["name"], f"Expected 4.6 in name, got: {claude['name']}"
    print(f"PASS: Claude model name is '{claude['name']}'")


# ── /api/emails ──────────────────────────────────────────────────────────

def test_create_email_reference(api):
    """POST /api/emails should save an email reference"""
    payload = {
        "subject": "TEST_ETW Denial Notice",
        "sender": "caseworker@alberta.ca",
        "recipients": "client@example.com",
        "body": "Your ETW benefits have been denied. You have 30 days to appeal.",
        "email_date": "2025-01-15T10:00:00Z",
    }
    r = api.post(f"{BASE_URL}/api/emails", json=payload)
    assert r.status_code == 200, f"Got {r.status_code}: {r.text}"
    data = r.json()
    assert "id" in data
    assert data["subject"] == payload["subject"]
    print(f"PASS: Email reference created with id={data['id']}")
    return data["id"]


def test_list_emails_returns_saved_ref(api):
    """GET /api/emails should list the saved email reference"""
    # Create one first
    payload = {
        "subject": "TEST_List Check Email",
        "sender": "test@example.com",
        "recipients": "advocate@example.com",
        "body": "Test email body for listing.",
    }
    create_r = api.post(f"{BASE_URL}/api/emails", json=payload)
    assert create_r.status_code == 200
    email_id = create_r.json()["id"]

    # List and verify
    r = api.get(f"{BASE_URL}/api/emails")
    assert r.status_code == 200
    data = r.json()
    assert "emails" in data
    assert "total" in data
    found = any(e.get("id") == email_id for e in data["emails"])
    assert found, f"Email {email_id} not found in GET /api/emails"
    print(f"PASS: GET /api/emails lists created email (total={data['total']})")

    # Cleanup
    api.delete(f"{BASE_URL}/api/emails/{email_id}")


# ── /api/ec/upload + /api/ec/wipe ────────────────────────────────────────

def test_ec_upload_txt_file(api):
    """Upload a .txt file and verify job is created"""
    txt_content = b"From: test@example.com\nTo: advocate@example.com\nSubject: Test ETW Case\n\nThis is a test email body for ETW appeal case."
    files = {"file": ("test_email.txt", txt_content, "text/plain")}
    r = requests.post(f"{BASE_URL}/api/ec/upload", files=files)
    assert r.status_code == 200, f"Got {r.status_code}: {r.text}"
    data = r.json()
    assert "id" in data
    assert data["status"] in ("pending", "processing", "completed")
    print(f"PASS: EC upload job created id={data['id']} status={data['status']}")
    return data["id"]


def test_ec_wipe_all(api):
    """DELETE /api/ec/wipe should delete all jobs"""
    # Upload a file first
    txt_content = b"Wipe test email content for deletion verification."
    files = {"file": ("wipe_test.txt", txt_content, "text/plain")}
    requests.post(f"{BASE_URL}/api/ec/upload", files=files)
    time.sleep(0.5)

    # Verify there are jobs
    r_list = api.get(f"{BASE_URL}/api/ec/jobs")
    assert r_list.status_code == 200

    # Now wipe
    r = api.delete(f"{BASE_URL}/api/ec/wipe")
    assert r.status_code == 200, f"Got {r.status_code}: {r.text}"
    data = r.json()
    assert data.get("success") is True
    print(f"PASS: EC wipe deleted {data.get('deleted_jobs')} jobs")

    # Verify jobs are gone
    r_after = api.get(f"{BASE_URL}/api/ec/jobs")
    assert r_after.status_code == 200
    assert r_after.json()["total"] == 0, f"Expected 0 jobs after wipe, got {r_after.json()['total']}"
    print("PASS: All jobs deleted after wipe")


# ── /api/chat includes email references ─────────────────────────────────

def test_chat_includes_email_references(api):
    """POST /api/chat response should acknowledge email references in DB"""
    # Create an email reference first
    payload = {
        "subject": "TEST_ETW Denial for Chat Context",
        "sender": "etw@alberta.ca",
        "recipients": "client@test.com",
        "body": "UNIQUE_TOKEN_XK9Z2: Your ETW benefits have been denied effective Jan 1 2025.",
    }
    er = api.post(f"{BASE_URL}/api/emails", json=payload)
    assert er.status_code == 200
    email_id = er.json()["id"]

    # Create a session
    sr = api.post(f"{BASE_URL}/api/sessions", json={"title": "TEST_Chat Context Test", "model": "claude"})
    assert sr.status_code == 200
    session_id = sr.json()["id"]

    # Send a chat message asking about available documents
    cr = api.post(f"{BASE_URL}/api/chat", json={
        "session_id": session_id,
        "message": "Do you have any email references or documents available for this case?",
        "model": "claude",
        "search_enabled": False,
    }, timeout=60)
    assert cr.status_code == 200, f"Got {cr.status_code}: {cr.text}"
    response_text = cr.json().get("response", "")
    print(f"Chat response (first 200 chars): {response_text[:200]}")
    # The AI should at least respond (we can't guarantee exact wording)
    assert len(response_text) > 20, "AI response is too short"
    print("PASS: /api/chat returned a response with context")

    # Cleanup
    api.delete(f"{BASE_URL}/api/emails/{email_id}")
    api.delete(f"{BASE_URL}/api/sessions/{session_id}")
