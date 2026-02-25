#!/usr/bin/env python3.11
"""
gTTS helper: يقرأ النص من stdin ويكتب MP3 إلى stdout
الاستخدام: echo "نص" | python3.11 gtts_helper.py [lang] [slow]
"""
import sys
import io

def main():
    lang = sys.argv[1] if len(sys.argv) > 1 else "ar"
    slow = sys.argv[2].lower() == "true" if len(sys.argv) > 2 else False
    
    # قراءة النص من stdin
    text = sys.stdin.buffer.read().decode("utf-8").strip()
    if not text:
        sys.stderr.write("ERROR: No text provided\n")
        sys.exit(1)
    
    try:
        from gtts import gTTS
        tts = gTTS(text=text, lang=lang, slow=slow)
        buf = io.BytesIO()
        tts.write_to_fp(buf)
        buf.seek(0)
        # كتابة MP3 إلى stdout
        sys.stdout.buffer.write(buf.read())
    except Exception as e:
        sys.stderr.write(f"ERROR: {str(e)}\n")
        sys.exit(1)

if __name__ == "__main__":
    main()
