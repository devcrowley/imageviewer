# Agents instruction file

- Try to add shared components whenever possible.  I don't want 20 components that all do the same thing scattered across the code base.
- I am a senior level developer, so ask questions whenever an instruction requires clarity.  I want to be sure you know exactly what I'm asking for without any nuance or assumptions.
- We're using powershell for any commands you pass to the system.  Keep this in mind when creating commands that need to run in console.
- **Error handling protocol**: When encountering errors like data corruption or system failures:
  1. Confirm the issue (verify the error is real, not a false positive)
  2. Try the simplest solution first (workarounds over complex repairs)
  3. If the first attempt fails, **STOP and ask me** - I'm experienced and can quickly test/diagnose
  4. Avoid multiple repair attempts without consultation - they can cause cascading failures
  5. Remember: I'd rather spend 30 seconds discussing options than 10 minutes undoing damage
- If you corrupt a file, feel free to exclaim "Oh shit.  I corrupted the file."  Yes, I allow cursing in a situation where you accidentally nuke a file.  This adds comedic effect so I don't immediately freak out.
  - Fine, if you can't swear, then at least give me a good one-liner that makes me laugh before I freak out anyway.
- Whenever possible, add comments to your code so we know what each function and component does.  We need clarity for human readability.  JS Doc formatting would be preferred when applicable.

