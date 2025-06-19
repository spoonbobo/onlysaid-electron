!include "MUI2.nsh"
!include "nsDialogs.nsh"
!include "LogicLib.nsh"

; Variables
Var Dialog
Var PythonStatus
Var PythonVersion
Var PythonPath
Var StatusLabel
Var DownloadButton
Var ContinueButton
Var SkipButton
Var ProgressLabel

; Custom page for Python check
Page custom PythonCheckPage PythonCheckPageLeave

Function PythonCheckPage
  ; Only show this page if Python is not available
  Call CheckPythonQuiet
  ${If} $PythonStatus == "found"
    ; Python is available, skip this page
    Abort
  ${EndIf}
  
  ; Create custom dialog
  nsDialogs::Create 1018
  Pop $Dialog
  ${If} $Dialog == error
    Abort
  ${EndIf}
  
  ; Title
  ${NSD_CreateLabel} 0 0 100% 12u "Python Installation Required"
  Pop $0
  CreateFont $1 "$(^Font)" "12" "700"
  SendMessage $0 ${WM_SETFONT} $1 0
  
  ; Status text
  ${NSD_CreateLabel} 0 25u 100% 30u "Python was not detected on your system. Python is required for some advanced features of Onlysaid, including AI-powered tools and data processing capabilities."
  Pop $StatusLabel
  
  ; Current status
  ${NSD_CreateGroupBox} 0 65u 100% 40u "Detection Results"
  Pop $0
  
  ${NSD_CreateLabel} 10u 80u 90% 20u "• Python command: Not found in PATH$\r$\n• Common installation paths: Not found$\r$\n• Python Launcher (py): Not found"
  Pop $ProgressLabel
  
  ; Options
  ${NSD_CreateGroupBox} 0 115u 100% 60u "Options"
  Pop $0
  
  ${NSD_CreateButton} 10u 135u 80u 15u "Download Python"
  Pop $DownloadButton
  ${NSD_OnClick} $DownloadButton DownloadPython
  
  ${NSD_CreateButton} 100u 135u 80u 15u "Continue Without Python"
  Pop $ContinueButton
  ${NSD_OnClick} $ContinueButton ContinueWithoutPython
  
  ${NSD_CreateButton} 190u 135u 80u 15u "Re-scan for Python"
  Pop $SkipButton
  ${NSD_OnClick} $SkipButton RescanPython
  
  ; Recommendation
  ${NSD_CreateLabel} 0 185u 100% 20u "Recommendation: Install Python to unlock all features. Make sure to check 'Add Python to PATH' during installation."
  Pop $0
  CreateFont $2 "$(^Font)" "8" "400"
  SendMessage $0 ${WM_SETFONT} $2 0
  
  nsDialogs::Show
FunctionEnd

Function PythonCheckPageLeave
  ; This function is called when leaving the page
FunctionEnd

Function DownloadPython
  DetailPrint "Opening Python download page..."
  ExecShell "open" "https://www.python.org/downloads/"
  MessageBox MB_OK "Python download page opened in your browser.$\n$\nPlease:$\n1. Download Python for Windows$\n2. Run the installer$\n3. Check 'Add Python to PATH'$\n4. Complete the installation$\n5. Click 'Re-scan for Python' when done"
FunctionEnd

Function ContinueWithoutPython
  MessageBox MB_YESNO "Are you sure you want to continue without Python?$\n$\nSome features will not be available." IDYES closepage
  Return
  closepage:
    SendMessage $HWNDPARENT ${WM_COMMAND} 1 0 ; Click Next button
FunctionEnd

Function RescanPython
  ${NSD_SetText} $ProgressLabel "Scanning for Python..."
  Call CheckPythonVerbose
  
  ${If} $PythonStatus == "found"
    ${NSD_SetText} $StatusLabel "Great! Python has been detected on your system.$\r$\nVersion: $PythonVersion$\r$\nPath: $PythonPath"
    ${NSD_SetText} $ProgressLabel "✓ Python found and ready to use!"
    ${NSD_SetText} $ContinueButton "Continue with Python"
    EnableWindow $DownloadButton 0 ; Disable download button
  ${Else}
    ${NSD_SetText} $ProgressLabel "• Python command: Still not found$\r$\n• Common paths: Still not found$\r$\n• Try installing Python and adding it to PATH"
    MessageBox MB_OK "Python still not detected. Please ensure:$\n$\n1. Python is installed$\n2. 'Add Python to PATH' was checked during installation$\n3. You may need to restart your computer after installation"
  ${EndIf}
FunctionEnd

Function CheckPythonQuiet
  ; Quick check without output
  StrCpy $PythonStatus "notfound"
  StrCpy $PythonVersion ""
  StrCpy $PythonPath ""
  
  ; Try python command
  nsExec::ExecToStack 'python --version'
  Pop $R0
  Pop $R1
  ${If} $R0 == 0
    StrCpy $PythonStatus "found"
    StrCpy $PythonVersion $R1
    nsExec::ExecToStack 'where python'
    Pop $R0
    Pop $R1
    ${If} $R0 == 0
      StrCpy $PythonPath $R1
    ${EndIf}
    Return
  ${EndIf}
  
  ; Try py command
  nsExec::ExecToStack 'py --version'
  Pop $R0
  Pop $R1
  ${If} $R0 == 0
    StrCpy $PythonStatus "found"
    StrCpy $PythonVersion $R1
    nsExec::ExecToStack 'where py'
    Pop $R0
    Pop $R1
    ${If} $R0 == 0
      StrCpy $PythonPath $R1
    ${EndIf}
    Return
  ${EndIf}
  
  ; Check common paths
  ${If} ${FileExists} "C:\Python311\python.exe"
    StrCpy $PythonStatus "found"
    StrCpy $PythonPath "C:\Python311\python.exe"
    StrCpy $PythonVersion "Python 3.11 (detected from path)"
    Return
  ${EndIf}
  
  ${If} ${FileExists} "C:\Python310\python.exe"
    StrCpy $PythonStatus "found"
    StrCpy $PythonPath "C:\Python310\python.exe"
    StrCpy $PythonVersion "Python 3.10 (detected from path)"
    Return
  ${EndIf}
  
  ${If} ${FileExists} "C:\Python312\python.exe"
    StrCpy $PythonStatus "found"
    StrCpy $PythonPath "C:\Python312\python.exe"
    StrCpy $PythonVersion "Python 3.12 (detected from path)"
    Return
  ${EndIf}
  
  ${If} ${FileExists} "$LOCALAPPDATA\Programs\Python\Python311\python.exe"
    StrCpy $PythonStatus "found"
    StrCpy $PythonPath "$LOCALAPPDATA\Programs\Python\Python311\python.exe"
    StrCpy $PythonVersion "Python 3.11 (user installation)"
    Return
  ${EndIf}
  
  ${If} ${FileExists} "$LOCALAPPDATA\Programs\Python\Python310\python.exe"
    StrCpy $PythonStatus "found"
    StrCpy $PythonPath "$LOCALAPPDATA\Programs\Python\Python310\python.exe"
    StrCpy $PythonVersion "Python 3.10 (user installation)"
    Return
  ${EndIf}
  
  ${If} ${FileExists} "$LOCALAPPDATA\Programs\Python\Python312\python.exe"
    StrCpy $PythonStatus "found"
    StrCpy $PythonPath "$LOCALAPPDATA\Programs\Python\Python312\python.exe"
    StrCpy $PythonVersion "Python 3.12 (user installation)"
  ${EndIf}
FunctionEnd

Function CheckPythonVerbose
  ; Detailed check with progress updates
  Call CheckPythonQuiet
FunctionEnd

; Custom install macro for logging
!macro customInstall
  DetailPrint "Performing final Python verification..."
  Call CheckPythonQuiet
  
  ${If} $PythonStatus == "found"
    DetailPrint "Python confirmed: $PythonVersion at $PythonPath"
    WriteRegStr HKCU "Software\Onlysaid" "PythonPath" "$PythonPath"
    WriteRegStr HKCU "Software\Onlysaid" "PythonVersion" "$PythonVersion"
  ${Else}
    DetailPrint "Python not detected - some features may be limited"
    WriteRegStr HKCU "Software\Onlysaid" "PythonPath" ""
    WriteRegStr HKCU "Software\Onlysaid" "PythonVersion" ""
  ${EndIf}
!macroend

!macro customUnInstall
  DetailPrint "Cleaning up Onlysaid installation..."
  DeleteRegKey HKCU "Software\Onlysaid"
!macroend 