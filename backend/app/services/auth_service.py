"""Database and authentication service for SecureX.
Uses SQLite (securex.db) to manage real user accounts with salted password hashing and JWT issuance.
"""

import os
import sqlite3
import hashlib
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any

import jwt

from app.core.config import settings

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "securex.db")


class AuthService:
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        """Create users table if not exists and seed default demo accounts."""
        with self._get_connection() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    salt TEXT NOT NULL,
                    key_fingerprint TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
            """)
            conn.commit()

        # Seed initial demo account if empty
        if not self.get_user_by_email("sender@securex.internal"):
            self.register_user(
                name="Dev Sender",
                email="sender@securex.internal",
                password="securePass2026"
            )
        if not self.get_user_by_email("analyst@securex.internal"):
            self.register_user(
                name="Security Analyst",
                email="analyst@securex.internal",
                password="securePass2026"
            )

    @staticmethod
    def _hash_password(password: str, salt: str) -> str:
        """Derive salted SHA-256 hash."""
        return hashlib.sha256(f"{salt}:{password}".encode("utf-8")).hexdigest()

    @staticmethod
    def _generate_fingerprint(email: str) -> str:
        """Generate a 6-block cryptographic identity fingerprint."""
        raw_hash = hashlib.sha256(f"{email}:{secrets.token_hex(8)}".encode("utf-8")).hexdigest().upper()
        blocks = [raw_hash[i:i+4] for i in range(0, 24, 4)]
        return " : ".join(blocks)

    def create_jwt_token(self, user_id: str, email: str, name: str) -> str:
        """Create signed JWT token with expiration."""
        now = datetime.now(timezone.utc)
        exp = now + timedelta(hours=settings.JWT_EXPIRATION_HOURS)
        payload = {
            "sub": user_id,
            "email": email,
            "name": name,
            "iat": int(now.timestamp()),
            "exp": int(exp.timestamp()),
        }
        return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

    def verify_jwt_token(self, token: str) -> Dict[str, Any]:
        """Decode and verify JWT signature and expiration."""
        try:
            payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            raise PermissionError("Session token has expired. Please sign in again.")
        except jwt.InvalidTokenError:
            raise PermissionError("Invalid session token.")

    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        clean_email = email.strip().lower()
        with self._get_connection() as conn:
            row = conn.execute("SELECT * FROM users WHERE email = ?", (clean_email,)).fetchone()
            if row:
                return dict(row)
        return None

    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        with self._get_connection() as conn:
            row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
            if row:
                return dict(row)
        return None

    def register_user(self, name: str, email: str, password: str) -> Dict[str, Any]:
        clean_email = email.strip().lower()
        clean_name = name.strip()

        if self.get_user_by_email(clean_email):
            raise ValueError(f"An account with email '{clean_email}' already exists. Please sign in.")

        salt = secrets.token_hex(16)
        password_hash = self._hash_password(password, salt)
        user_id = f"user-{clean_email.replace('@', '-at-').replace('.', '-')}"
        key_fingerprint = self._generate_fingerprint(clean_email)
        created_at = datetime.now(timezone.utc).isoformat()

        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT INTO users (id, name, email, password_hash, salt, key_fingerprint, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (user_id, clean_name, clean_email, password_hash, salt, key_fingerprint, created_at)
            )
            conn.commit()

        token = self.create_jwt_token(user_id, clean_email, clean_name)
        return {
            "id": user_id,
            "name": clean_name,
            "email": clean_email,
            "key_fingerprint": key_fingerprint,
            "token": token,
            "created_at": created_at,
        }

    def authenticate_user(self, email: str, password: str) -> Dict[str, Any]:
        clean_email = email.strip().lower()
        user = self.get_user_by_email(clean_email)

        if not user:
            raise LookupError(f"Account not found for '{clean_email}'. Please register an account first.")

        computed_hash = self._hash_password(password, user["salt"])
        if computed_hash != user["password_hash"]:
            raise PermissionError("Invalid password. Please check your credentials.")

        token = self.create_jwt_token(user["id"], user["email"], user["name"])
        return {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "key_fingerprint": user["key_fingerprint"],
            "token": token,
            "created_at": user["created_at"],
        }


# Singleton provider
_auth_service: Optional[AuthService] = None

def get_auth_service() -> AuthService:
    global _auth_service
    if _auth_service is None:
        _auth_service = AuthService()
    return _auth_service
