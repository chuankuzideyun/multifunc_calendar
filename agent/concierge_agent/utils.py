import os
import psycopg2
from psycopg2.extras import RealDictCursor
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

def decrypt_refresh_token(encrypted_token: str) -> str:
    """
    Decrypts a token formatted as 'ivHex:authTagHex:ciphertextHex' using AES-256-GCM.
    """
    encryption_key_hex = os.getenv("ENCRYPTION_KEY")
    if not encryption_key_hex:
        raise ValueError("ENCRYPTION_KEY environment variable not set")
    
    key = bytes.fromhex(encryption_key_hex)
    parts = encrypted_token.split(":")
    if len(parts) != 3:
        raise ValueError("Invalid encrypted token format. Expected 'iv:authTag:ciphertext'")
        
    iv_hex, auth_tag_hex, ciphertext_hex = parts
    iv = bytes.fromhex(iv_hex)
    auth_tag = bytes.fromhex(auth_tag_hex)
    ciphertext = bytes.fromhex(ciphertext_hex)
    
    # In cryptography's AESGCM, the ciphertext and tag are concatenated: ciphertext + tag
    data = ciphertext + auth_tag
    
    aesgcm = AESGCM(key)
    decrypted_bytes = aesgcm.decrypt(iv, data, None)
    return decrypted_bytes.decode("utf-8")

def get_db_connection():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise ValueError("DATABASE_URL environment variable not set")
    return psycopg2.connect(db_url)

def get_user_google_credentials(user_id: str) -> dict:
    """
    Retrieves and decrypts the Google refresh token for a user.
    """
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                'SELECT "googleRefreshTokenEncrypted", "location" FROM "User" WHERE id = %s',
                (user_id,)
            )
            row = cur.fetchone()
            if not row:
                raise ValueError(f"User with ID {user_id} not found")
            
            encrypted_token = row.get("googleRefreshTokenEncrypted")
            if not encrypted_token:
                raise ValueError(f"Google refresh token missing for user {user_id}")
                
            decrypted_token = decrypt_refresh_token(encrypted_token)
            return {
                "refresh_token": decrypted_token,
                "location": row.get("location")
            }
    finally:
        conn.close()

def get_google_service(service_name: str, version: str, refresh_token: str):
    """
    Builds a Google API service client using the provided refresh token.
    """
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    
    if not client_id or not client_secret:
        raise ValueError("GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET environment variable not set")
        
    credentials = Credentials(
        token=None,  # will be auto-refreshed using refresh_token
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=client_id,
        client_secret=client_secret
    )
    
    return build(service_name, version, credentials=credentials)
