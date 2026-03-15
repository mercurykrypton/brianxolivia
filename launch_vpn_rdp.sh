#!/bin/bash
# Launches SonicWall Mobile Connect and Windows App (RDP),
# autopopulates credentials from macOS Keychain, and logs in.

# --- Read credentials from Keychain ---
SW_USER=$(security find-generic-password -s "SonicWall_VPN_Username" -w 2>/dev/null)
SW_PASS=$(security find-generic-password -s "SonicWall_VPN_Password" -w 2>/dev/null)
RDP_USER=$(security find-generic-password -s "WindowsApp_RDP_Username" -w 2>/dev/null)
RDP_PASS=$(security find-generic-password -s "WindowsApp_RDP_Password" -w 2>/dev/null)

if [[ -z "$SW_USER" || -z "$SW_PASS" ]]; then
  echo "SonicWall credentials not found in Keychain. Run setup_credentials.sh first."
  exit 1
fi

if [[ -z "$RDP_USER" || -z "$RDP_PASS" ]]; then
  echo "Windows App credentials not found in Keychain. Run setup_credentials.sh first."
  exit 1
fi

echo "Credentials loaded from Keychain."

# --- SonicWall AppleScript ---
cat > /tmp/sonicwall_connect.applescript << SWEOF
on run argv
    set swUser to item 1 of argv
    set swPass to item 2 of argv

    tell application "SonicWall Mobile Connect"
        activate
    end tell
    delay 2

    tell application "System Events"
        tell process "SonicWall Mobile Connect"
            repeat 10 times
                if exists window 1 then exit repeat
                delay 1
            end repeat

            -- Click Connect button inside the tab group
            click button "Connect" of tab group 1 of window 1
            delay 2

            -- Handle certificate warning (nested sheet inside sheet)
            repeat 5 times
                try
                    if exists sheet 1 of sheet 1 of window 1 then
                        click button "Continue" of group 2 of sheet 1 of sheet 1 of window 1
                        exit repeat
                    end if
                end try
                delay 1
            end repeat

            delay 3

            -- Fill login sheet: text field 1 = username, text field 2 = password
            repeat 10 times
                try
                    if exists sheet 1 of window 1 then
                        set value of text field 1 of sheet 1 of window 1 to swUser
                        set value of text field 2 of sheet 1 of window 1 to swPass
                        click button "Login" of sheet 1 of window 1
                        exit repeat
                    end if
                end try
                delay 1
            end repeat
        end tell
    end tell
end run
SWEOF

# --- Windows App AppleScript ---
# Uses coordinate-based clicking to avoid AppleScript reserved word conflicts
# (list, double click, description etc. all cause parse errors in this context)
cat > /tmp/windows_app_connect.applescript << WAEOF
on run argv
    set rdpUser to item 1 of argv
    set rdpPass to item 2 of argv

    tell application "Windows App"
        activate
    end tell
    delay 3

    tell application "System Events"
        tell process "Windows App"
            -- Wait for the Devices window by name (resilient to window ordering changes)
            set devWin to missing value
            repeat 10 times
                try
                    set devWin to window "Devices"
                    exit repeat
                end try
                delay 1
            end repeat
            if devWin is missing value then error "Devices window not found"

            -- Navigate to PC tile: scroll area > outer list > inner list > groups -> item 2 = WCRC02-VMSRV11
            set mainScroll to scroll area 1 of group 1 of splitter group 1 of devWin
            set outerList to UI element 1 of mainScroll
            set innerList to UI element 1 of outerList
            set grps to every group of innerList
            set pcTile to item 2 of grps

            -- Get center coordinates via position/size list properties
            set tPos to position of pcTile
            set tSz to size of pcTile
            set cx to (item 1 of tPos) + ((item 1 of tSz) / 2)
            set cy to (item 2 of tPos) + ((item 2 of tSz) / 2)

            -- Double-click by two rapid coordinate clicks (confirmed working)
            click at {cx as integer, cy as integer}
            delay 0.3
            click at {cx as integer, cy as integer}
        end tell
    end tell

    -- Poll for cert warning sheet on any window (appears briefly on first connect)
    -- Also handles credential prompt if one appears
    tell application "System Events"
        tell process "Windows App"
            repeat 20 times
                try
                    set wc to count of windows
                    repeat with i from 1 to wc
                        if (count of sheets of window i) > 0 then
                            set s to sheet 1 of window i
                            -- Cert warning: has Continue button in group 2
                            try
                                click button "Continue" of group 2 of s
                            end try
                            -- Credential prompt: has text fields
                            set allFields to every text field of s
                            if (count of allFields) >= 1 then
                                set value of item 1 of allFields to rdpUser
                            end if
                            if (count of allFields) >= 2 then
                                set value of item 2 of allFields to rdpPass
                            end if
                            try
                                click button "Continue" of s
                            end try
                            try
                                click button "Connect" of s
                            end try
                            try
                                click button "OK" of s
                            end try
                        end if
                    end repeat
                end try
                delay 0.5
            end repeat
        end tell
    end tell
end run
WAEOF

# --- Step 1: SonicWall ---
echo "Launching SonicWall Mobile Connect..."
osascript /tmp/sonicwall_connect.applescript "$SW_USER" "$SW_PASS"
echo "SonicWall connect initiated. Waiting for VPN to establish..."
sleep 10

# --- Step 2: Windows App ---
echo "Launching Windows App..."
osascript /tmp/windows_app_connect.applescript "$RDP_USER" "$RDP_PASS"

echo "Done. SonicWall and Windows App launched."
