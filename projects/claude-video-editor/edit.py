#!/usr/bin/env python3
"""Claude Video Editor — render engine.

Turns one source video + a transcript (word timings) + an edit plan into a finished video:
  * 9:16 reel or 16:9 long video (center-crop, or blurred-fill)
  * zoom styles that alternate every sentence: punch-in, slow push-in, slow pull-out, normal
  * transitions between segments (xfade: fade, zoomin, slide, wipe, circle...)
  * catchy word-by-word captions (active word highlighted + pop), Hindi/Devanagari + English
  * loudness normalised to -14 LUFS (YouTube / Reels)

Usage
  python3 edit.py transcribe SRC words.json            # needs a faster-whisper model (see WORKFLOW.md)
  python3 edit.py vtt2words captions.vtt words.json    # YouTube/other timed captions -> words.json
  python3 edit.py text words.json [--from S --to E]    # print transcript with timestamps (for picking clips)
  python3 edit.py render plan.json                     # render one output

plan.json
{
  "src": "raw.mp4",            "words": "words.json",      "out": "reel1.mp4",
  "format": "vertical",        # vertical (1080x1920) | landscape (1920x1080) | square
  "fill": "crop",              # crop | blur   (how to fit a different aspect)
  "segments": [[12.4, 31.0], [55.2, 70.8]],   # seconds in the source, joined in order
  "transition": "auto",        # auto | none | fade | zoomin | slideleft | circleopen ...
  "zoom": true,                "captions": true,
  "caption_style": {"words_per_line": 3, "highlight": "&H0000F0FF", "position": "lower"},
  "hook": "optional big title for the first 2.5 s"
}
"""
import json, math, os, re, subprocess, sys, tempfile, shutil

FPS = 30
SIZES = {"vertical": (1080, 1920), "landscape": (1920, 1080), "square": (1080, 1080)}
XFADES = ["fade", "zoomin", "slideleft", "circleopen", "smoothleft", "fadeblack", "wipeup", "radial"]
TR = 0.45  # transition length (s)


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        sys.stderr.write(" ".join(cmd) + "\n" + r.stderr[-3000:])
        raise SystemExit(r.returncode)
    return r.stdout


def probe(src):
    out = json.loads(run(["ffprobe", "-v", "error", "-print_format", "json", "-show_streams", "-show_format", src]))
    v = next(s for s in out["streams"] if s["codec_type"] == "video")
    w, h = int(v["width"]), int(v["height"])
    rot = 0
    for sd in v.get("side_data_list", []) or []:
        rot = int(sd.get("rotation", 0) or 0)
    rot = int(v.get("tags", {}).get("rotate", rot) or rot)
    if abs(rot) in (90, 270):
        w, h = h, w
    has_audio = any(s["codec_type"] == "audio" for s in out["streams"])
    return w, h, float(out["format"]["duration"]), has_audio


# ------------------------------------------------------------------ transcript
def transcribe(src, out, model=None, lang=None):
    from faster_whisper import WhisperModel
    model = model or os.environ.get("WHISPER_MODEL", os.path.expanduser("~/claude-video-kit/models/faster-whisper-small"))
    m = WhisperModel(model, device="cpu", compute_type="int8")
    segs, info = m.transcribe(src, word_timestamps=True, vad_filter=True, language=lang)
    words = [{"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3)}
             for s in segs for w in (s.words or []) if w.word.strip()]
    json.dump({"language": info.language, "words": words}, open(out, "w"), ensure_ascii=False, indent=0)
    print(f"{len(words)} words, language={info.language}")


def vtt2words(vtt, out):
    """Timed captions (VTT/SRT, incl. YouTube word-level <00:00:01.000><c>word</c>) -> words.json."""
    ts = lambda x: sum(float(p) * 60 ** i for i, p in enumerate(reversed(x.replace(",", ".").split(":"))))
    words, txt = [], open(vtt, encoding="utf-8").read()
    for block in re.split(r"\n\s*\n", txt):
        m = re.search(r"([\d:.,]+)\s*-->\s*([\d:.,]+)", block)
        if not m:
            continue
        s, e = ts(m.group(1)), ts(m.group(2))
        body = block[m.end():].strip()
        if "<c>" in body or re.search(r"<\d\d:", body):  # word-level timing
            parts = re.split(r"<(\d[\d:.]+)>", re.sub(r"</?c[^>]*>", "", body.splitlines()[-1]))
            t = s
            for i in range(0, len(parts), 2):
                w = parts[i].strip()
                nt = ts(parts[i + 1]) if i + 1 < len(parts) else e
                for tok in w.split():
                    words.append({"w": tok, "s": t, "e": nt})
                t = nt
        else:
            toks = re.sub(r"<[^>]+>", "", body).split()
            for i, tok in enumerate(toks):
                d = (e - s) / max(len(toks), 1)
                words.append({"w": tok, "s": s + i * d, "e": s + (i + 1) * d})
    # YouTube rolling captions repeat lines: drop duplicates that overlap in time
    clean = []
    for w in sorted(words, key=lambda x: x["s"]):
        if clean and w["w"] == clean[-1]["w"] and w["s"] - clean[-1]["s"] < 1.0:
            continue
        clean.append(w)
    json.dump({"words": clean}, open(out, "w"), ensure_ascii=False, indent=0)
    print(f"{len(clean)} words")


def load_words(path):
    d = json.load(open(path, encoding="utf-8"))
    return d["words"] if isinstance(d, dict) else d


def print_text(path, a=0, b=1e9):
    line, start = [], None
    for w in load_words(path):
        if not (a <= w["s"] <= b):
            continue
        if start is None:
            start = w["s"]
        line.append(w["w"])
        if re.search(r"[.?!।]$", w["w"]) or len(line) >= 16:
            print(f"[{start:7.2f}-{w['e']:7.2f}] {' '.join(line)}")
            line, start = [], None
    if line:
        print(f"[{start:7.2f}] {' '.join(line)}")


# ------------------------------------------------------------------ chunks & zoom
def split_chunks(seg, words, min_len=2.2, max_len=5.0):
    """Split a segment at sentence ends / pauses so the zoom style can change on each beat."""
    s0, s1 = seg
    cuts, last = [s0], s0
    ws = [w for w in words if s0 <= w["s"] < s1]
    for i, w in enumerate(ws):
        gap = (ws[i + 1]["s"] - w["e"]) if i + 1 < len(ws) else 0
        boundary = re.search(r"[.?!,।]$", w["w"]) or gap > 0.35
        t = (w["e"] + ws[i + 1]["s"]) / 2 if i + 1 < len(ws) else w["e"]
        if (boundary and t - last >= min_len) or t - last >= max_len:
            if s1 - t >= min_len * 0.6:
                cuts.append(t); last = t
    cuts.append(s1)
    return list(zip(cuts[:-1], cuts[1:]))


def fit_filter(sw, sh, W, H, fill):
    if fill == "blur" and abs(sw / sh - W / H) > 0.05:
        return (f"split[a][b];[a]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},boxblur=30:3,eq=brightness=-0.08[bg];"
                f"[b]scale={W}:{H}:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2")
    return f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H}"


def zoom_filter(style, dur, W, H):
    n = max(int(dur * FPS), 1)
    if style == "punch":     # instant 1.15x (jump-cut punch-in)
        return f"scale={int(W*1.15)//2*2}:{int(H*1.15)//2*2},crop={W}:{H}"
    if style in ("push", "pull"):  # smooth 1.0->1.12 (push) or 1.12->1.0 (pull), eased, per-frame scale (fast)
        p = f"(0.5-0.5*cos(PI*min(t/{dur:.3f},1)))"
        z = f"(1+0.12*{p})" if style == "push" else f"(1.12-0.12*{p})"
        return (f"scale=w='trunc({W}*{z}/2)*2':h='trunc({H}*{z}/2)*2':eval=frame,crop={W}:{H}")
    return "null"


# ------------------------------------------------------------------ captions (ASS)
def ass_time(t):
    t = max(t, 0); h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60
    return f"{h}:{m:02d}:{s:05.2f}"


def build_ass(words_tl, W, H, style, hook=None, hook_dur=2.5):
    wpl = style.get("words_per_line", 3 if H > W else 5)
    hi = style.get("highlight", "&H0000F0FF")      # yellow (ASS is BGR)
    size = style.get("size", int(H * (0.052 if H > W else 0.06)))
    mv = int(H * (0.30 if style.get("position", "lower") == "lower" else 0.5)) if H > W else int(H * 0.12)
    font = style.get("font", "Baloo 2")
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,{font},{size},&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,1,0,0,0,100,100,0,0,1,{max(size//11,4)},{max(size//22,2)},2,60,60,{mv},1
Style: Hook,{font},{int(size*1.25)},&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,1,0,0,0,100,100,0,0,3,{max(size//5,10)},0,8,80,80,{int(H*0.14)},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    ev = []
    if hook:
        ev.append(f"Dialogue: 1,{ass_time(0)},{ass_time(hook_dur)},Hook,,0,0,0,,{{\\fad(150,200)\\c&H000000&\\3c&H0000F0FF&}}{hook}")
    # group into lines: break on punctuation, long pauses, or wpl words
    lines, cur = [], []
    for i, w in enumerate(words_tl):
        cur.append(w)
        nxt = words_tl[i + 1] if i + 1 < len(words_tl) else None
        if len(cur) >= wpl or not nxt or nxt["s"] - w["e"] > 0.6 or re.search(r"[.?!,।]$", w["w"]):
            lines.append(cur); cur = []
    for li, line in enumerate(lines):
        end_line = lines[li + 1][0]["s"] if li + 1 < len(lines) else line[-1]["e"] + 0.4
        end_line = min(end_line, line[-1]["e"] + 0.8)
        for k, w in enumerate(line):
            s = w["s"]; e = line[k + 1]["s"] if k + 1 < len(line) else end_line
            if e <= s:
                continue
            txt = []
            for j, x in enumerate(line):
                t = x["w"].upper() if re.match(r"[A-Za-z]", x["w"]) else x["w"]
                t = t.replace("{", "(").replace("}", ")")
                if j == k:
                    txt.append(f"{{\\c{hi}\\fscx112\\fscy112\\t(0,90,\\fscx100\\fscy100)}}{t}{{\\c&H00FFFFFF&}}")
                else:
                    txt.append(t)
            pop = "{\\fscx80\\fscy80\\t(0,80,\\fscx100\\fscy100)}" if k == 0 else ""
            ev.append(f"Dialogue: 0,{ass_time(s)},{ass_time(e)},Cap,,0,0,0,,{pop}{' '.join(txt)}")
    return head + "\n".join(ev) + "\n"


# ------------------------------------------------------------------ render
def render(plan_path):
    P = json.load(open(plan_path, encoding="utf-8"))
    base = os.path.dirname(os.path.abspath(plan_path))
    path = lambda p: p if os.path.isabs(p) else os.path.join(base, p)
    src, out = path(P["src"]), path(P["out"])
    W, H = SIZES[P.get("format", "vertical")]
    sw, sh, sdur, has_audio = probe(src)
    words = load_words(path(P["words"])) if P.get("words") and os.path.exists(path(P["words"])) else []
    segs = P.get("segments") or [[0, sdur]]
    use_zoom, fill = P.get("zoom", True), P.get("fill", "crop")
    tmp = tempfile.mkdtemp(prefix="cve_")
    styles = ["normal", "punch", "push", "punch", "pull", "normal", "push"]
    si = 0
    seg_files, seg_durs, tl_words, tl = [], [], [], 0.0
    enc = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-r", str(FPS),
           "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2"]
    for gi, seg in enumerate(segs):
        chunks = split_chunks(seg, words) if (use_zoom and words) else (
            [(t, min(t + 4.0, seg[1])) for t in frange(seg[0], seg[1], 4.0)] if use_zoom else [tuple(seg)])
        parts = []
        for (a, b) in chunks:
            st = styles[si % len(styles)] if use_zoom else "normal"; si += 1
            f = os.path.join(tmp, f"c{gi:03d}_{len(parts):03d}.mp4")
            vf = f"{fit_filter(sw, sh, W, H, fill)},{zoom_filter(st, b - a, W, H)},fps={FPS},setsar=1,format=yuv420p"
            cmd = ["ffmpeg", "-y", "-v", "error", "-ss", f"{a:.3f}", "-to", f"{b:.3f}", "-i", src]
            cmd_t = ["-t", f"{b - a:.3f}"]
            if not has_audio:
                cmd += ["-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-shortest"]
            run(cmd + ["-filter_complex", f"[0:v]{vf}[v]", "-map", "[v]", "-map", "0:a" if has_audio else "1:a"] + cmd_t + enc + [f])
            parts.append(f)
        lst = os.path.join(tmp, f"s{gi:03d}.txt")
        open(lst, "w").write("".join(f"file '{p}'\n" for p in parts))
        sf = os.path.join(tmp, f"seg{gi:03d}.mp4")
        run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", sf])
        d = probe(sf)[2]
        offset = tl - (TR if gi and use_tr(P) else 0)
        for w in words:
            if seg[0] <= w["s"] < seg[1]:
                tl_words.append({"w": w["w"], "s": w["s"] - seg[0] + offset, "e": min(w["e"], seg[1]) - seg[0] + offset})
        tl = offset + d
        seg_files.append(sf); seg_durs.append(d)

    joined = os.path.join(tmp, "joined.mp4")
    if len(seg_files) == 1:
        shutil.copy(seg_files[0], joined)
    elif not use_tr(P):
        lst = os.path.join(tmp, "all.txt"); open(lst, "w").write("".join(f"file '{p}'\n" for p in seg_files))
        run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", joined])
    else:
        ins, fc, acc, lv, la = [], [], 0.0, "[0:v]", "[0:a]"
        for i, f in enumerate(seg_files):
            ins += ["-i", f]
        for i in range(1, len(seg_files)):
            acc += seg_durs[i - 1] - TR
            tr = P.get("transition", "auto")
            tr = XFADES[(i - 1) % len(XFADES)] if tr == "auto" else tr
            fc.append(f"{lv}[{i}:v]xfade=transition={tr}:duration={TR}:offset={acc:.3f}[v{i}]")
            fc.append(f"{la}[{i}:a]acrossfade=d={TR}[a{i}]")
            lv, la = f"[v{i}]", f"[a{i}]"
        run(["ffmpeg", "-y", "-v", "error"] + ins + ["-filter_complex", ";".join(fc), "-map", lv, "-map", la] + enc + [joined])

    vf = "null"
    if P.get("captions", True) and (tl_words or P.get("hook")):
        ass = os.path.join(tmp, "cap.ass")
        open(ass, "w", encoding="utf-8").write(build_ass(tl_words, W, H, P.get("caption_style", {}), P.get("hook")))
        vf = f"ass={ass}:fontsdir={os.path.expanduser('~/.fonts')}"
    run(["ffmpeg", "-y", "-v", "error", "-i", joined, "-vf", vf, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11"]
        + enc + ["-movflags", "+faststart", out])
    shutil.rmtree(tmp, ignore_errors=True)
    print(f"OK {out}  {probe(out)[2]:.1f}s  {W}x{H}")


def use_tr(P):
    return P.get("transition", "auto") != "none"


def frange(a, b, step):
    while a < b - 0.5:
        yield a; a += step


if __name__ == "__main__":
    c, *a = sys.argv[1:] or ["-h"]
    if c == "transcribe": transcribe(a[0], a[1], *(a[2:] or []))
    elif c == "vtt2words": vtt2words(a[0], a[1])
    elif c == "text":
        f = float(a[a.index("--from") + 1]) if "--from" in a else 0
        t = float(a[a.index("--to") + 1]) if "--to" in a else 1e9
        print_text(a[0], f, t)
    elif c == "render": render(a[0])
    else: print(__doc__)
