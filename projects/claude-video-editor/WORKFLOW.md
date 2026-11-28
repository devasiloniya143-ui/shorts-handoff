# Workflow — "Drive फ़ोल्डर से वीडियो एडिट करो"

यूज़र फ़ोन से Google Drive पर एक फ़ोल्डर बनाकर उसमें raw वीडियो डालता है, फिर chat में फ़ोल्डर का नाम + requirement बताता है
(जैसे "3–4 viral reels निकालो", "एक reel", "8 मिनट की long video", "नीचे catchy captions", "zoom in/out, transitions")।
हर सेशन (फ़ोन से हो या scheduled, कंप्यूटर ऑन हो या बंद) यही steps follow करे।

## 0. Setup (हर नए क्लाउड सेशन में एक बार)
```bash
git clone --depth 1 https://github.com/devasiloniya143-ui/shorts-handoff   # अगर पहले से नहीं है
bash shorts-handoff/projects/claude-video-editor/setup.sh
E=shorts-handoff/projects/claude-video-editor/edit.py
```

## 1. Requirement समझो
user से (या task prompt से) ये निकालो; जो न बताया हो उसके लिए default लो और बताओ:

| चीज़ | default |
|---|---|
| आउटपुट | reels की संख्या / long video |
| लंबाई | reel 30–60 s; long video = बताए मिनट (वरना raw का साफ़ किया हुआ पूरा हिस्सा) |
| फ़ॉर्मेट | reel = `vertical` 9:16, long = `landscape` 16:9 (raw vertical हो तो long भी vertical) |
| captions | हाँ, word-by-word highlight, raw की भाषा में (हिंदी देवनागरी / Hinglish) |
| zoom + transitions | हाँ (`zoom: true`, `transition: "auto"`) |
| अपलोड | YouTube — **privacy user से पूछो**; टेस्ट/बिना बताए = `unlisted` |

## 2. Drive से वीडियो लाओ
1. Google Drive में फ़ोल्डर ढूंढो: `title contains '<नाम>' and mimeType = 'application/vnd.google-apps.folder'`
   (आम तौर पर *Claude Video Editing* के अंदर)। फिर `parentId = '<id>'` से वीडियो फ़ाइलें।
2. `download_file_content` से वीडियो लाओ — tool result में फ़ाइल का local path आता है; उसे `work/<folder>/raw.mp4` में कॉपी करो।
   बहुत बड़ी फ़ाइल न आए तो user को बताओ (फ़ोन से 1080p/कम लंबाई में डालने को कहो)।
3. फ़ोल्डर में कोई text/notes फ़ाइल हो तो वो भी पढ़ो — उसमें requirement हो सकती है।

## 3. Transcription (captions + clip चुनने के लिए)
```bash
python3 $E transcribe work/X/raw.mp4 work/X/words.json        # faster-whisper model चाहिए
python3 $E text work/X/words.json                              # timestamps के साथ पूरा transcript
```
**अगर model नहीं है** (huggingface.co ब्लॉक), इनमें से जो उपलब्ध हो:
- `~/claude-video-kit/models/faster-whisper-small/` में model फ़ाइलें Drive से लाओ (अगर user ने Drive पर रखी हैं: `Claude Video Editing/models/faster-whisper-small/`)।
- YouTube auto-captions: raw वीडियो को **private** अपलोड करो → कुछ मिनट बाद captions API (`captions.list` → `captions.download?tfmt=vtt`) से VTT लाओ →
  `python3 $E vtt2words captions.vtt words.json` → काम के बाद वो private वीडियो हटाओ (user से पूछकर)।

## 4. Clips चुनो (यह Claude की editorial सोच है)
- **Viral reel:** पहले 1–3 सेकंड में hook (सवाल, चौंकाने वाली बात, नतीजा), एक पूरा विचार, 30–60 s, अंत साफ़।
  ज़रूरत हो तो 2–3 हिस्से जोड़ो (`segments` में कई टुकड़े — बीच में transition अपने-आप)।
  हर reel के लिए 3–6 शब्दों का `hook` title लिखो (पहले 2.5 s ऊपर दिखेगा)।
- **Long video:** retakes, लंबे pauses, "अं…", गलत शुरुआत हटाओ — बचे हिस्से `segments` में; लंबाई requirement के आसपास।
- हर clip की शुरुआत/अंत शब्द की सीमा पर रखो (words.json के `s`/`e`), बीच में शब्द न कटे।

## 5. Render
हर आउटपुट के लिए `work/X/plan_<n>.json` (फ़ॉर्मेट `edit.py` के ऊपर लिखा है) और:
```bash
python3 $E render work/X/plan_1.json
```
खासियतें: हर वाक्य पर zoom बदलता है (normal → punch-in → slow push → pull), segments के बीच xfade transitions,
catchy captions (बोला जा रहा शब्द पीला + pop), -14 LUFS आवाज़। 2-core क्लाउड पर ~1.4× real-time।

## 6. Quality check (अपलोड से पहले ज़रूरी)
- 5–6 फ्रेम निकालकर देखो: `ffmpeg -ss T -i out.mp4 -frames:v 1 f.png` — चेहरा frame में, captions चेहरे पर नहीं, टेक्स्ट सही।
- duration, आवाज़ (silent तो नहीं), captions sync (एक-दो जगह transcript से मिलाओ)।
- कुछ गलत हो तो plan बदलकर दोबारा render।

## 7. Upload
1. वीडियो को इसी repo (`shorts-handoff`) के root में commit+push करो → raw URL:
   `https://raw.githubusercontent.com/devasiloniya143-ui/shorts-handoff/main/<file>.mp4` (100 MB से छोटी फ़ाइल)।
2. Zapier → YouTube → *Upload Video*: title, description (hashtags), tags, `privacy_status` (user ने जो कहा; वरना `unlisted`),
   Shorts के लिए title/description में `#shorts`।
3. अपलोड के बाद वीडियो फ़ाइल repo से हटाकर push करो; `_published.md` में तारीख + title + YouTube link जोड़ो।
4. user को हर वीडियो का link + एक लाइन (क्या बनाया) भेजो।

## नियम
- public अपलोड, raw वीडियो डिलीट, या कोई भी ऐसा कदम जो वापस न हो — user के साफ़ "हाँ" के बिना नहीं।
- Drive में user की raw फ़ाइलें कभी मत बदलो/हटाओ।
