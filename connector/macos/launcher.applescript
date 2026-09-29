on run
    set appDirectory to POSIX path of (path to me)
    set starter to appDirectory & "Contents/Resources/start.zsh"
    set terminalApp to "com.apple.Terminal"
    tell application id terminalApp
        activate
        «event coredosc» ("/bin/zsh " & quoted form of starter)
    end tell
end run
