# Encryption Key Rotation Guide

This document describes the procedure for rotating `WRITERDOST_ENCRYPTION_KEY` in production without service interruption or data loss.

## Rotation Procedure

1. **Generate a new key:**
   ```bash
   openssl rand -base64 32
   ```

2. **Stage the environment:**
   In your production deployment secret store:
   - Set `WRITERDOST_ENCRYPTION_KEY_PREVIOUS` to the old key.
   - Set `WRITERDOST_ENCRYPTION_KEY` to the new key.

3. **Deploy or restart the containers:**
   The application will now encrypt all new secrets using the new key, while gracefully falling back to decrypting existing stored credentials with the previous key.

4. **Run dry-run re-encryption:**
   ```bash
   node scripts/reencrypt-secrets.mjs
   ```
   Verify that all destination and automation secrets decrypt without errors.

5. **Apply re-encryption:**
   ```bash
   node scripts/reencrypt-secrets.mjs --apply
   ```
   This will rewrite all existing ciphertexts with the new key.

6. **Cleanup:**
   Remove `WRITERDOST_ENCRYPTION_KEY_PREVIOUS` from your production environment configuration.
