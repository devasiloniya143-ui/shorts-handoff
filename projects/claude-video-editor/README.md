# Claude Video Editor — क्लाउड-रेडी स्किल किट

"Turn Claude into a Video Editor — 15 free GitHub repos" वाली फोटो (`source-image.jpg`, Google Drive: *Claude Video Editing / Skills and repo*) के सारे repos यहाँ एक जगह हैं।
यह फ़ोल्डर GitHub पर है, इसलिए **कंप्यूटर बंद होने पर भी** कोई scheduled task (क्लाउड सेशन) इसे clone करके एक कमांड में सारे टूल्स और स्किल्स इंस्टॉल कर सकता है।

## एक कमांड में सेटअप

```bash
git clone --depth 1 https://github.com/devasiloniya143-ui/shorts-handoff
bash shorts-handoff/projects/claude-video-editor/setup.sh          # core (~1–3 मिनट)
FULL=1 bash shorts-handoff/projects/claude-video-editor/setup.sh   # + भारी dependencies
```

- रिपॉज़िटरी `~/claude-video-kit/repos/` में clone होती हैं, स्किल्स `~/.claude/skills/` में link होती हैं।
- इंस्टॉल हुई स्किल्स की लिस्ट: `~/claude-video-kit/installed.txt` (core में 83 स्किल्स)।
- Three.js की दो repos के नाम टकराते थे, इसलिए cesartevisual वाली स्किल्स `pro-threejs-*` नाम से हैं; Barty-Bart = `mg-*`, HyperFrames = `hf-*`, iart-ai = `iart-*`।

## 15 repos (फोटो → GitHub)

| # | फोटो में | GitHub | प्रकार | सेटअप |
|---|---|---|---|---|
| 01 | yt-dlp | [yt-dlp/yt-dlp](https://github.com/yt-dlp/yt-dlp) | टूल (pip) | core |
| 02 | Whisper | [openai/whisper](https://github.com/openai/whisper) | टूल — core में `faster-whisper` (वही Whisper मॉडल, CPU पर तेज़); `openai-whisper` FULL में | core / full |
| 03 | FFmpeg Skill (9.5k) | [kajisho5/ffmpeg-skill](https://github.com/kajisho5/ffmpeg-skill) | स्किल `ffmpeg-skill` | core |
| 04 | FFmpeg Skill (N/A) | [ychoi-kr/claude-ffmpeg-skill](https://github.com/ychoi-kr/claude-ffmpeg-skill) | स्किल `ffmpeg-usage` (अनुमानित मैच) | core |
| 05 | Ghost Editor | [kurbaitaev/ghost-editor](https://github.com/kurbaitaev/ghost-editor) | स्किल — talking-head → reel, 19 styles | core (पूरे deps: FULL) |
| 06 | Claude Shorts | [AgriciDaniel/claude-shorts](https://github.com/AgriciDaniel/claude-shorts) | स्किल `shorts` — लंबी वीडियो → Shorts | core (python deps: FULL) |
| 07 | Three.js Skills (4.3k) | [CloudAI-X/threejs-skills](https://github.com/CloudAI-X/threejs-skills) | 13 स्किल्स | core |
| 08 | Three.js Skills (31) | [cesartevisual/threejs-skills](https://github.com/cesartevisual/threejs-skills) | 24 स्किल्स (`pro-threejs-*`) | core |
| 09 | Motion Skills (2.0k) | [iart-ai/motion-skills](https://github.com/iart-ai/motion-skills) | 19 packs की index — वीडियो वाले 9 packs core में, सारे 19 FULL में | core / full |
| 10 | Motion Skills (1.4k) | [Barty-Bart/motion-graphics](https://github.com/Barty-Bart/motion-graphics) | 6 स्किल्स (`mg-*`) | core |
| 11 | Motion Skills (99) | [iart-ai/javascript-animation-skills](https://github.com/iart-ai/javascript-animation-skills) | 2 स्किल्स | core |
| 12 | MotionClone (545) | [LPengYang/MotionClone](https://github.com/LPengYang/MotionClone) | AI रिसर्च मॉडल — NVIDIA GPU चाहिए | full (reference) |
| 13 | MotionClone (525) | फोटो में दोबारा वही MotionClone लगता है — अलग repo नहीं मिली | — | — |
| 14 | HyperFrames | [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes) | 9 स्किल्स (`hf-*`) + `npx hyperframes` CLI; claude.ai connector भी है | core |
| 15 | Awesome Skills | [ComposioHQ/awesome-claude-skills](https://github.com/ComposioHQ/awesome-claude-skills) | सिर्फ़ लिस्ट (800+), `reference/` में | ref |

## Scheduled task में इस्तेमाल (कंप्यूटर बंद हो तब भी)

Scheduled task के prompt की शुरुआत में यह लिखें:

> पहले `git clone --depth 1 https://github.com/devasiloniya143-ui/shorts-handoff` करो और `bash shorts-handoff/projects/claude-video-editor/setup.sh` चलाओ।
> फिर जो स्किल चाहिए उसका `SKILL.md` पढ़कर उसके steps follow करो (लिस्ट: `~/claude-video-kit/installed.txt`)।
> उदाहरण: Shorts काटने के लिए `~/.claude/skills/claude-shorts/SKILL.md`, talking-head reel के लिए `~/.claude/skills/ghost-editor/SKILL.md`।

नोट: सेशन के बीच में इंस्टॉल हुई स्किल्स अपने-आप लिस्ट में न दिखें, इसलिए prompt में `SKILL.md` का पाथ सीधे पढ़ने को कहना सबसे भरोसेमंद है।
तैयार वीडियो के लिए यही repo (`shorts-handoff`) और YouTube अपलोड के लिए Zapier पहले से इस्तेमाल हो रहे हैं।
