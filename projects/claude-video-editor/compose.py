#!/usr/bin/env python3
"""Claude Video Editor — multi-clip composer (vlogs & reels from many phone clips).

python3 compose.py plan.json

plan.json
{
  "out": "vlog.mp4", "format": "landscape" | "vertical", "fill": "blur" | "crop",
  "fps": 30, "fast": false,                       # fast=true -> ultrafast preview encode
  "scenes": [                                     # scenes are joined with a transition (xfade + whoosh)
    {"tr": "fade",                                # transition INTO this scene (ignored for first)
     "segs": [                                    # segments inside a scene are hard cuts (jump cuts)
       {"src": "clip.mp4", "s": 1.2, "e": 6.0,    # seconds in src
        "zoom": "auto|normal|punch|push|pull", "speed": 1.0, "vol": 1.0,
        "subs": [[1.4, 3.0, "हिंदी caption line"], ...],   # src-time captions (word-highlight animated)
        "label": "optional small top label"}
     ]}
  ],
  "overlays": [{"seg": [scene, seg], "off": 0.0, "d": 2.5, "text": "…", "style": "hook|timer|big|label"}],
  "sfx":      [{"seg": [scene, seg], "off": 0.0, "file": "boom.ogg", "vol": 0.8}],
  "music":    [{"from": [scene, seg], "to": [scene, seg] | null, "file": "m.mp3", "vol": 0.22, "start": 0}],
  "duck": true
}
Times in overlays/sfx/music are anchored to a segment's start on the output timeline (+ off seconds).
"""
import json, os, re, shutil, subprocess, sys, tempfile

SIZES = {"vertical": (1080, 1920), "landscape": (1920, 1080), "square": (1080, 1080)}
TR = 0.4
XF = {"fade": "fade", "zoom": "zoomin", "slide": "slideleft", "wipe": "wipeleft", "circle": "circleopen",
      "black": "fadeblack", "white": "fadewhite", "smooth": "smoothleft", "radial": "radial"}
ZOOMS = ["normal", "punch", "push", "punch", "pull", "normal", "push"]


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        sys.stderr.write(" ".join(map(str, cmd))[:2000] + "\n" + r.stderr[-3000:])
        raise SystemExit(1)
    return r.stdout


def dur(f):
    return float(run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]))


def vsize(f):
    o = json.loads(run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                        "stream=width,height:stream_side_data=rotation", "-of", "json", f]))["streams"][0]
    w, h = o["width"], o["height"]
    rot = next((abs(int(sd.get("rotation", 0))) for sd in o.get("side_data_list", []) if "rotation" in sd), 0)
    return (h, w) if rot in (90, 270) else (w, h)


def fit(sw, sh, W, H, fill):
    if fill == "blur" and abs(sw / sh - W / H) > 0.05:
        return (f"split[a][b];[a]scale=320:-2,boxblur=12:2,scale={W}:{H}:force_original_aspect_ratio=increase,"
                f"crop={W}:{H},eq=brightness=-0.10:saturation=1.2[bg];[b]scale=-2:{H}[fg];[bg][fg]overlay=(W-w)/2:0")
    return f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H}"


def zoomf(style, d, W, H):
    if style == "punch":
        return f",scale={int(W*1.14)//2*2}:{int(H*1.14)//2*2},crop={W}:{H}"
    if style in ("push", "pull"):
        p = f"(0.5-0.5*cos(PI*min(t/{d:.3f},1)))"
        z = f"(1+0.10*{p})" if style == "push" else f"(1.10-0.10*{p})"
        return f",scale=w='trunc({W}*{z}/2)*2':h='trunc({H}*{z}/2)*2':eval=frame,crop={W}:{H}"
    return ""


# ---------------------------------------------------------------- ASS
def at(t):
    t = max(t, 0); return f"{int(t//3600)}:{int(t%3600//60):02d}:{t%60:05.2f}"


def ass_header(W, H):
    v = H > W
    cs = int(H * (0.050 if v else 0.058)); mv = int(H * (0.24 if v else 0.07))
    f = "Baloo 2"
    return f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,{f},{cs},&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,{max(cs//10,4)},{max(cs//20,2)},2,60,60,{mv},1
Style: Hook,{f},{int(cs*1.35)},&H00FFFFFF,&H00FFFFFF,&H001A1AE6,&H00000000,1,0,0,0,100,100,0,0,3,{int(cs*0.28)},0,8,70,70,{int(H*0.11)},1
Style: Big,{f},{int(cs*2.1)},&H0000F0FF,&H00FFFFFF,&H00000000,&H64000000,1,0,0,0,100,100,0,0,1,{max(cs//7,6)},{max(cs//14,3)},5,60,60,0,1
Style: Timer,{f},{int(cs*0.95)},&H00FFFFFF,&H00FFFFFF,&H00000000,&HB4000000,1,0,0,0,100,100,0,0,3,{int(cs*0.22)},0,9,40,40,{int(H*0.035)},1
Style: Label,{f},{int(cs*0.78)},&H00000000,&H00FFFFFF,&H0000F0FF,&H00000000,1,0,0,0,100,100,0,0,3,{int(cs*0.22)},0,7,40,40,{int(H*0.035)},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""


def sub_events(lines, hi="&H0000F0FF&"):
    """lines: [(t0, t1, text)] on output timeline -> word-highlight karaoke events."""
    ev = []
    for t0, t1, text in lines:
        words = text.split()
        if not words or t1 <= t0:
            continue
        w8 = [max(len(w), 2) for w in words]; tot = sum(w8); t = t0
        times = []
        for w in w8:
            d = (t1 - t0) * w / tot; times.append((t, t + d)); t += d
        for k, (a, b) in enumerate(times):
            parts = []
            for j, w in enumerate(words):
                w = w.replace("{", "(").replace("}", ")")
                parts.append(f"{{\\c{hi}\\fscx110\\fscy110}}{w}{{\\c&HFFFFFF&\\fscx100\\fscy100}}" if j == k else w)
            pop = "{\\fscx85\\fscy85\\t(0,90,\\fscx100\\fscy100)}" if k == 0 else ""
            ev.append(f"Dialogue: 0,{at(a)},{at(b)},Cap,,0,0,0,,{pop}{' '.join(parts)}")
    return ev


def overlay_event(t, d, text, style):
    text = text.replace("\n", "\\N")
    if style == "big":
        fx = "{\\fad(80,200)\\fscx40\\fscy40\\t(0,180,\\fscx112\\fscy112)\\t(180,300,\\fscx100\\fscy100)}"
        return f"Dialogue: 3,{at(t)},{at(t+d)},Big,,0,0,0,,{fx}{text}"
    if style == "hook":
        return f"Dialogue: 2,{at(t)},{at(t+d)},Hook,,0,0,0,,{{\\fad(120,200)\\fscx90\\fscy90\\t(0,150,\\fscx100\\fscy100)}}{text}"
    if style == "timer":
        return f"Dialogue: 2,{at(t)},{at(t+d)},Timer,,0,0,0,,{{\\fad(100,100)}}TIMER  {text}"
    return f"Dialogue: 2,{at(t)},{at(t+d)},Label,,0,0,0,,{{\\fad(150,150)}}{text}"


# ---------------------------------------------------------------- main
def main(plan_path):
    P = json.load(open(plan_path, encoding="utf-8"))
    base = os.path.dirname(os.path.abspath(plan_path))
    pth = lambda p: p if os.path.isabs(p) else os.path.join(base, p)
    W, H = SIZES[P.get("format", "landscape")]
    fps, fill = P.get("fps", 30), P.get("fill", "blur")
    preset = "ultrafast" if P.get("fast") else "veryfast"
    enc = ["-c:v", "libx264", "-preset", preset, "-crf", "20", "-pix_fmt", "yuv420p", "-r", str(fps),
           "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2"]
    tmp = tempfile.mkdtemp(prefix="cmp_")
    sizes, zi = {}, 0
    starts = {}            # (scene, seg) -> output start time
    subs_out = []
    scene_files, scene_durs, t_out = [], [], 0.0
    for si, sc in enumerate(P["scenes"]):
        t_scene = t_out - (TR if si else 0)
        parts, t_local = [], 0.0
        for gi, g in enumerate(sc["segs"]):
            src = pth(g["src"]); sizes.setdefault(src, vsize(src))
            sp = g.get("speed", 1.0); d = (g["e"] - g["s"]) / sp
            z = g.get("zoom", "auto")
            if z == "auto":
                z = ZOOMS[zi % len(ZOOMS)]; zi += 1
            vf = fit(*sizes[src], W, H, fill) + zoomf(z, d, W, H) + (f",setpts=PTS/{sp}" if sp != 1 else "") + f",fps={fps},setsar=1,format=yuv420p"
            af = f"volume={g.get('vol',1.0)}" + (f",atempo={sp}" if sp != 1 else "") + ",aresample=48000"
            f = os.path.join(tmp, f"s{si:02d}_{gi:03d}.mp4")
            run(["ffmpeg", "-y", "-v", "error", "-ss", f"{g['s']:.3f}", "-t", f"{g['e']-g['s']:.3f}", "-i", src,
                 "-filter_complex", f"[0:v]{vf}[v];[0:a]{af}[a]", "-map", "[v]", "-map", "[a]", "-t", f"{d:.3f}"] + enc + [f])
            starts[(si, gi)] = t_scene + t_local
            for (a, b, txt) in g.get("subs", []):
                a2 = max(a, g["s"]); b2 = min(b, g["e"])
                if b2 > a2:
                    subs_out.append((starts[(si, gi)] + (a2 - g["s"]) / sp, starts[(si, gi)] + (b2 - g["s"]) / sp, txt))
            if g.get("label"):
                P.setdefault("overlays", []).append({"seg": [si, gi], "off": 0.1, "d": min(d - 0.2, 3.0), "text": g["label"], "style": "label"})
            t_local += dur(f); parts.append(f)
        lst = os.path.join(tmp, f"sc{si:02d}.txt"); open(lst, "w").write("".join(f"file '{p}'\n" for p in parts))
        sf = os.path.join(tmp, f"scene{si:02d}.mp4")
        run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", sf])
        scene_files.append(sf); scene_durs.append(dur(sf)); t_out = t_scene + scene_durs[-1]
        print(f"scene {si}: {scene_durs[-1]:.1f}s  (total {t_out:.1f}s)", flush=True)

    # join scenes with xfade
    joined = os.path.join(tmp, "joined.mp4")
    if len(scene_files) == 1:
        shutil.copy(scene_files[0], joined)
    else:
        ins, fc, lv, la, acc = [], [], "[0:v]", "[0:a]", 0.0
        for f in scene_files:
            ins += ["-i", f]
        for i in range(1, len(scene_files)):
            acc += scene_durs[i - 1] - TR
            tr = XF.get(P["scenes"][i].get("tr", "fade"), "fade")
            fc.append(f"{lv}[{i}:v]xfade=transition={tr}:duration={TR}:offset={acc:.3f}[v{i}]")
            fc.append(f"{la}[{i}:a]acrossfade=d={TR}[a{i}]")
            lv, la = f"[v{i}]", f"[a{i}]"
        run(["ffmpeg", "-y", "-v", "error"] + ins + ["-filter_complex", ";".join(fc), "-map", lv, "-map", la] + enc + [joined])
    total = dur(joined)

    # captions + overlays
    ev = sub_events(subs_out)
    for o in P.get("overlays", []):
        t = starts[tuple(o["seg"])] + o.get("off", 0); ev.append(overlay_event(t, o.get("d", 2.5), o["text"], o.get("style", "label")))
    ass = os.path.join(tmp, "o.ass"); open(ass, "w", encoding="utf-8").write(ass_header(W, H) + "\n".join(ev) + "\n")

    # audio mix: voice + ducked music + sfx
    ins = ["-i", joined]; fa = ["[0:a]dynaudnorm=f=200:g=11,volume=1.0,asplit=2[voice][vkey]"]; mix = ["[voice]"]
    k = 1; mus = []
    for m in P.get("music", []):
        t0 = starts[tuple(m["from"])] + m.get("off", 0)
        t1 = starts[tuple(m["to"])] + m.get("to_off", 0) if m.get("to") else total
        d = max(t1 - t0, 0.5)
        ins += ["-stream_loop", "-1", "-i", pth(m["file"])]
        fa.append(f"[{k}:a]atrim={m.get('start',0)}:{m.get('start',0)+d},asetpts=PTS-STARTPTS,aresample=48000,"
                  f"aformat=channel_layouts=stereo,volume={m.get('vol',0.22)},afade=t=in:d=0.8,afade=t=out:st={max(d-1.2,0)}:d=1.2,"
                  f"adelay={int(t0*1000)}|{int(t0*1000)}[m{k}]")
        mus.append(f"[m{k}]"); k += 1
    if mus:
        fa.append(f"{''.join(mus)}amix=inputs={len(mus)}:normalize=0[mus]")
        if P.get("duck", True):
            fa.append("[mus][vkey]sidechaincompress=threshold=0.035:ratio=8:attack=20:release=400:makeup=1[musd]")
        else:
            fa.append("[mus]anull[musd]"); fa.append("[vkey]anullsink")
        mix.append("[musd]")
    else:
        fa.append("[vkey]anullsink")
    for s in P.get("sfx", []):
        t0 = max(0.0, starts[tuple(s["seg"])] + s.get("off", 0))
        ins += ["-i", pth(s["file"])]
        fa.append(f"[{k}:a]aresample=48000,aformat=channel_layouts=stereo,volume={s.get('vol',0.7)},adelay={int(t0*1000)}|{int(t0*1000)}[x{k}]")
        mix.append(f"[x{k}]"); k += 1
    fa.append(f"{''.join(mix)}amix=inputs={len(mix)}:normalize=0:duration=first,loudnorm=I=-14:TP=-1.5:LRA=11[aout]")
    out = pth(P["out"])
    run(["ffmpeg", "-y", "-v", "error"] + ins + ["-filter_complex",
         f"[0:v]ass={ass}:fontsdir={os.path.expanduser('~/.fonts')}[vout];" + ";".join(fa),
         "-map", "[vout]", "-map", "[aout]", "-t", f"{total:.3f}"] + enc + ["-movflags", "+faststart", out])
    json.dump({f"{a}-{b}": round(v, 2) for (a, b), v in starts.items()}, open(out + ".timeline.json", "w"))
    shutil.rmtree(tmp, ignore_errors=True)
    print(f"OK {out} {dur(out):.1f}s {W}x{H}")


if __name__ == "__main__":
    main(sys.argv[1])
