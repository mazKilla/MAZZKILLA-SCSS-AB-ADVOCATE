"""
SCSS AB ADVOCATE - Backend API Tests
Tests: health, sessions CRUD, chat, emails CRUD, policy-resources, web-search
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")


class TestHealth:
    def test_health(self):
        r = requests.get(f"{BASE_URL}/api/health")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "ok"
        print("Health check passed")


class TestModels:
    def test_get_models(self):
        r = requests.get(f"{BASE_URL}/api/models")
        assert r.status_code == 200
        data = r.json()
        assert "models" in data
        assert len(data["models"]) == 2
        ids = [m["id"] for m in data["models"]]
        assert "claude" in ids
        assert "grok" in ids
        print("Models endpoint passed")


class TestSessions:
    session_id = None

    def test_create_session(self):
        r = requests.post(f"{BASE_URL}/api/sessions", json={"title": "TEST_Session_1", "model": "claude"})
        assert r.status_code == 200
        data = r.json()
        assert "id" in data
        assert data["title"] == "TEST_Session_1"
        assert data["model"] == "claude"
        TestSessions.session_id = data["id"]
        print(f"Session created: {TestSessions.session_id}")

    def test_list_sessions(self):
        r = requests.get(f"{BASE_URL}/api/sessions")
        assert r.status_code == 200
        data = r.json()
        assert "sessions" in data
        assert isinstance(data["sessions"], list)
        print(f"Sessions listed: {len(data['sessions'])} sessions")

    def test_get_messages(self):
        assert TestSessions.session_id is not None, "Need session_id"
        r = requests.get(f"{BASE_URL}/api/sessions/{TestSessions.session_id}/messages")
        assert r.status_code == 200
        data = r.json()
        assert "messages" in data
        print("Get messages passed")

    def test_delete_session(self):
        assert TestSessions.session_id is not None
        r = requests.delete(f"{BASE_URL}/api/sessions/{TestSessions.session_id}")
        assert r.status_code == 200
        data = r.json()
        assert data["success"] is True
        # Verify messages deleted too
        r2 = requests.get(f"{BASE_URL}/api/sessions/{TestSessions.session_id}/messages")
        assert r2.status_code == 200
        msgs = r2.json().get("messages", [])
        assert len(msgs) == 0
        print("Session deleted and messages cleaned up")


class TestChat:
    """Test chat with Claude"""
    session_id = None

    def test_chat_claude(self):
        # Create session
        r = requests.post(f"{BASE_URL}/api/sessions", json={"title": "TEST_Chat", "model": "claude"})
        assert r.status_code == 200
        TestChat.session_id = r.json()["id"]

        # Send message
        r2 = requests.post(f"{BASE_URL}/api/chat", json={
            "session_id": TestChat.session_id,
            "message": "What is the ETW appeal deadline in Alberta?",
            "model": "claude",
            "search_enabled": False,
        }, timeout=60)
        assert r2.status_code == 200
        data = r2.json()
        assert "response" in data
        assert len(data["response"]) > 10
        assert data["model"] == "claude"
        print(f"Claude chat passed. Response length: {len(data['response'])}")

        # Cleanup
        requests.delete(f"{BASE_URL}/api/sessions/{TestChat.session_id}")

    def test_chat_invalid_session(self):
        r = requests.post(f"{BASE_URL}/api/chat", json={
            "session_id": "invalidid",
            "message": "test",
            "model": "claude",
        })
        assert r.status_code == 400
        print("Invalid session returns 400 - passed")


class TestEmails:
    email_id = None

    def test_create_email(self):
        r = requests.post(f"{BASE_URL}/api/emails", json={
            "subject": "TEST_Email_Appeal Notice",
            "sender": "test@example.com",
            "recipients": "caseworker@alberta.ca",
            "body": "This is a test email about my ETW appeal.",
            "case_id": "CASE-001",
        })
        assert r.status_code == 200
        data = r.json()
        assert "id" in data
        assert data["subject"] == "TEST_Email_Appeal Notice"
        TestEmails.email_id = data["id"]
        print(f"Email created: {TestEmails.email_id}")

    def test_list_emails(self):
        r = requests.get(f"{BASE_URL}/api/emails")
        assert r.status_code == 200
        data = r.json()
        assert "emails" in data
        assert "total" in data
        print(f"Emails listed: {data['total']}")

    def test_get_email(self):
        assert TestEmails.email_id is not None
        r = requests.get(f"{BASE_URL}/api/emails/{TestEmails.email_id}")
        assert r.status_code == 200
        data = r.json()
        assert data["subject"] == "TEST_Email_Appeal Notice"
        print("Get email by ID passed")

    def test_delete_email(self):
        assert TestEmails.email_id is not None
        r = requests.delete(f"{BASE_URL}/api/emails/{TestEmails.email_id}")
        assert r.status_code == 200
        r2 = requests.get(f"{BASE_URL}/api/emails/{TestEmails.email_id}")
        assert r2.status_code == 404
        print("Email deleted and verified")


class TestPolicyResources:
    def test_get_policy_resources(self):
        r = requests.get(f"{BASE_URL}/api/policy-resources")
        assert r.status_code == 200
        data = r.json()
        assert "resources" in data
        assert len(data["resources"]) >= 5
        categories = [res["category"] for res in data["resources"]]
        assert "Appeals" in categories
        print(f"Policy resources returned: {len(data['resources'])} items")


class TestWebSearch:
    def test_web_search(self):
        r = requests.post(f"{BASE_URL}/api/web-search", json={"query": "Alberta ETW income support appeal"}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert "results" in data
        print(f"Web search returned {len(data['results'])} results")

    def test_web_search_empty_query(self):
        r = requests.post(f"{BASE_URL}/api/web-search", json={"query": ""})
        assert r.status_code == 400
        print("Empty query returns 400 - passed")
