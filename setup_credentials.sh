#!/bin/bash
# Run this ONCE to store credentials securely in macOS Keychain.
# After this, the main script reads from Keychain - no plaintext passwords.

echo "=== Credential Setup for SonicWall + Windows App ==="
echo ""

# --- SonicWall ---
read -p "SonicWall username: " SW_USER
read -s -p "SonicWall password: " SW_PASS
echo ""

security add-generic-password \
  -a "$SW_USER" \
  -s "SonicWall_VPN_Username" \
  -w "$SW_USER" \
  -U

security add-generic-password \
  -a "$SW_USER" \
  -s "SonicWall_VPN_Password" \
  -w "$SW_PASS" \
  -U

echo "SonicWall credentials saved."
echo ""

# --- Windows App (RDP) ---
read -p "Windows/RDP username: " RDP_USER
read -s -p "Windows/RDP password: " RDP_PASS
echo ""

security add-generic-password \
  -a "$RDP_USER" \
  -s "WindowsApp_RDP_Username" \
  -w "$RDP_USER" \
  -U

security add-generic-password \
  -a "$RDP_USER" \
  -s "WindowsApp_RDP_Password" \
  -w "$RDP_PASS" \
  -U

echo "Windows App credentials saved."
echo ""
echo "Setup complete. You can now run launch_vpn_rdp.sh"
