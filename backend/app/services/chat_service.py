"""Chat and Messaging service for SecureX.
Manages persistent conversations, participants, messages, and user search in SQLite (securex.db).
Enforces strict authorization: users can only view conversations/messages they participate in.
"""

import os
import sqlite3
import secrets
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "securex.db")


class ChatService:
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        return conn

    def _init_db(self):
        """Create conversations, participants, and messages tables with indexes."""
        with self._get_connection() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS conversations (
                    id TEXT PRIMARY KEY,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            """)

            conn.execute("""
                CREATE TABLE IF NOT EXISTS conversation_participants (
                    conversation_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    joined_at TEXT NOT NULL,
                    PRIMARY KEY (conversation_id, user_id),
                    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """)

            conn.execute("""
                CREATE TABLE IF NOT EXISTS messages (
                    id TEXT PRIMARY KEY,
                    conversation_id TEXT NOT NULL,
                    sender_id TEXT NOT NULL,
                    receiver_id TEXT NOT NULL,
                    text TEXT,
                    attachment_json TEXT,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
                    FOREIGN KEY (sender_id) REFERENCES users(id),
                    FOREIGN KEY (receiver_id) REFERENCES users(id)
                )
            """)

            # Indexes for high performance and ordering
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_messages_conv_created 
                ON messages (conversation_id, created_at)
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_messages_sender 
                ON messages (sender_id)
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_messages_receiver 
                ON messages (receiver_id)
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_participants_user 
                ON conversation_participants (user_id)
            """)
            conn.commit()

    def search_users(self, query: str, exclude_user_id: str) -> List[Dict[str, Any]]:
        """Search registered users by name or email, excluding the current user."""
        clean_q = f"%{query.strip().lower()}%"
        with self._get_connection() as conn:
            rows = conn.execute(
                """
                SELECT id, name, email, key_fingerprint, created_at
                FROM users
                WHERE id != ? AND (LOWER(name) LIKE ? OR LOWER(email) LIKE ?)
                ORDER BY name ASC
                LIMIT 20
                """,
                (exclude_user_id, clean_q, clean_q)
            ).fetchall()
            return [dict(r) for r in rows]

    def list_peers(self, exclude_user_id: str) -> List[Dict[str, Any]]:
        """List registered peers available to communicate with."""
        with self._get_connection() as conn:
            rows = conn.execute(
                """
                SELECT id, name, email, key_fingerprint, created_at
                FROM users
                WHERE id != ?
                ORDER BY name ASC
                LIMIT 50
                """,
                (exclude_user_id,)
            ).fetchall()
            return [dict(r) for r in rows]

    def get_or_create_conversation(self, user_a_id: str, user_b_id: str) -> Dict[str, Any]:
        """Find or create a canonical shared conversation between two users."""
        if user_a_id == user_b_id:
            raise ValueError("Cannot start a conversation with yourself.")

        # Ensure both users exist
        with self._get_connection() as conn:
            user_a = conn.execute("SELECT id, name, email, key_fingerprint FROM users WHERE id = ?", (user_a_id,)).fetchone()
            user_b = conn.execute("SELECT id, name, email, key_fingerprint FROM users WHERE id = ?", (user_b_id,)).fetchone()

            if not user_a:
                raise LookupError(f"User '{user_a_id}' does not exist.")
            if not user_b:
                raise LookupError(f"Recipient user '{user_b_id}' does not exist.")

            # Look for existing shared conversation
            existing = conn.execute(
                """
                SELECT cp1.conversation_id
                FROM conversation_participants cp1
                JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
                WHERE cp1.user_id = ? AND cp2.user_id = ?
                """,
                (user_a_id, user_b_id)
            ).fetchone()

            if existing:
                conv_id = existing["conversation_id"]
                conv = conn.execute("SELECT * FROM conversations WHERE id = ?", (conv_id,)).fetchone()
                return {
                    "id": conv_id,
                    "created_at": conv["created_at"],
                    "updated_at": conv["updated_at"],
                    "peer": dict(user_b),
                }

            # Create new canonical conversation
            # Deterministic ID based on sorted user IDs prevents race conditions
            sorted_users = sorted([user_a_id, user_b_id])
            conv_id = f"conv-{sorted_users[0]}--{sorted_users[1]}"
            now = datetime.now(timezone.utc).isoformat()

            conn.execute(
                "INSERT INTO conversations (id, created_at, updated_at) VALUES (?, ?, ?)",
                (conv_id, now, now)
            )
            conn.execute(
                "INSERT INTO conversation_participants (conversation_id, user_id, joined_at) VALUES (?, ?, ?)",
                (conv_id, user_a_id, now)
            )
            conn.execute(
                "INSERT INTO conversation_participants (conversation_id, user_id, joined_at) VALUES (?, ?, ?)",
                (conv_id, user_b_id, now)
            )
            conn.commit()

            return {
                "id": conv_id,
                "created_at": now,
                "updated_at": now,
                "peer": dict(user_b),
            }

    def get_user_conversations(self, user_id: str) -> List[Dict[str, Any]]:
        """Return all conversations the user participates in with peer details and last message."""
        with self._get_connection() as conn:
            rows = conn.execute(
                """
                SELECT c.id, c.created_at, c.updated_at
                FROM conversations c
                JOIN conversation_participants cp ON c.id = cp.conversation_id
                WHERE cp.user_id = ?
                ORDER BY c.updated_at DESC
                """,
                (user_id,)
            ).fetchall()

            result = []
            for row in rows:
                conv_id = row["id"]
                # Fetch peer participant details
                peer_row = conn.execute(
                    """
                    SELECT u.id, u.name, u.email, u.key_fingerprint
                    FROM users u
                    JOIN conversation_participants cp ON u.id = cp.user_id
                    WHERE cp.conversation_id = ? AND cp.user_id != ?
                    """,
                    (conv_id, user_id)
                ).fetchone()

                # Fetch last message
                last_msg = conn.execute(
                    """
                    SELECT id, sender_id, receiver_id, text, attachment_json, created_at
                    FROM messages
                    WHERE conversation_id = ?
                    ORDER BY created_at DESC
                    LIMIT 1
                    """,
                    (conv_id,)
                ).fetchone()

                result.append({
                    "id": conv_id,
                    "created_at": row["created_at"],
                    "updated_at": row["updated_at"],
                    "peer": dict(peer_row) if peer_row else None,
                    "last_message": dict(last_msg) if last_msg else None,
                })
            return result

    def get_conversation_messages(self, conversation_id: str, user_id: str) -> List[Dict[str, Any]]:
        """Retrieve all messages in a conversation. STRICTLY verifies user is participant."""
        with self._get_connection() as conn:
            # Authorization Check
            is_participant = conn.execute(
                "SELECT 1 FROM conversation_participants WHERE conversation_id = ? AND user_id = ?",
                (conversation_id, user_id)
            ).fetchone()

            if not is_participant:
                raise PermissionError("Access denied: You are not authorized to view this conversation.")

            rows = conn.execute(
                """
                SELECT id, conversation_id, sender_id, receiver_id, text, attachment_json, created_at
                FROM messages
                WHERE conversation_id = ?
                ORDER BY created_at ASC
                """,
                (conversation_id,)
            ).fetchall()

            return [dict(r) for r in rows]

    def create_message(
        self,
        conversation_id: str,
        sender_id: str,
        text: Optional[str] = None,
        attachment_json: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create and persist a message in a conversation. STRICTLY verifies participant authorization."""
        if not text and not attachment_json:
            raise ValueError("Message must contain either text content or an attachment.")

        with self._get_connection() as conn:
            # Authorization Check
            is_participant = conn.execute(
                "SELECT 1 FROM conversation_participants WHERE conversation_id = ? AND user_id = ?",
                (conversation_id, sender_id)
            ).fetchone()

            if not is_participant:
                raise PermissionError("Access denied: Sender is not a participant in this conversation.")

            # Identify the recipient
            recipient_row = conn.execute(
                "SELECT user_id FROM conversation_participants WHERE conversation_id = ? AND user_id != ?",
                (conversation_id, sender_id)
            ).fetchone()

            if not recipient_row:
                raise ValueError("Recipient participant not found in conversation.")

            receiver_id = recipient_row["user_id"]
            message_id = f"msg-{secrets.token_hex(8)}"
            now = datetime.now(timezone.utc).isoformat()

            # Atomic transaction: Insert message + update conversation timestamp
            conn.execute(
                """
                INSERT INTO messages (id, conversation_id, sender_id, receiver_id, text, attachment_json, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (message_id, conversation_id, sender_id, receiver_id, text, attachment_json, now)
            )
            conn.execute(
                "UPDATE conversations SET updated_at = ? WHERE id = ?",
                (now, conversation_id)
            )
            conn.commit()

            return {
                "id": message_id,
                "conversation_id": conversation_id,
                "sender_id": sender_id,
                "receiver_id": receiver_id,
                "text": text,
                "attachment_json": attachment_json,
                "created_at": now,
            }

    def update_message_attachment(
        self,
        conversation_id: str,
        message_id: str,
        user_id: str,
        attachment_json: str
    ) -> Dict[str, Any]:
        """Update attachment_json for a message in a conversation. Verifies user authorization."""
        with self._get_connection() as conn:
            # Verify participant authorization
            is_participant = conn.execute(
                "SELECT 1 FROM conversation_participants WHERE conversation_id = ? AND user_id = ?",
                (conversation_id, user_id)
            ).fetchone()

            if not is_participant:
                raise PermissionError("Access denied: You are not authorized for this conversation.")

            # Verify message exists in conversation
            msg = conn.execute(
                "SELECT * FROM messages WHERE id = ? AND conversation_id = ?",
                (message_id, conversation_id)
            ).fetchone()

            if not msg:
                raise LookupError(f"Message '{message_id}' not found in conversation '{conversation_id}'.")

            now = datetime.now(timezone.utc).isoformat()
            conn.execute(
                "UPDATE messages SET attachment_json = ? WHERE id = ?",
                (attachment_json, message_id)
            )
            conn.execute(
                "UPDATE conversations SET updated_at = ? WHERE id = ?",
                (now, conversation_id)
            )
            conn.commit()

            updated = conn.execute("SELECT * FROM messages WHERE id = ?", (message_id,)).fetchone()
            return dict(updated)


# Singleton provider
_chat_service: Optional[ChatService] = None

def get_chat_service() -> ChatService:
    global _chat_service
    if _chat_service is None:
        _chat_service = ChatService()
    return _chat_service
