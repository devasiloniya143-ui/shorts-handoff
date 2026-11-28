"""Build reel.json and vlog.json for the ₹500 food challenge."""
import json

ORIG = "/mnt/user-data/uploads/Videos/Raw Footage/Food Challange/{}.MOV"
PROX = "/home/claude/fc/proxy/{}.mp4"
SFX = "/home/claude/fc/sfx/"
MUS = "/home/claude/fc/music/"

# Clean Hindi captions (source-time) written from the rough ASR
CAP = {
 "IMG_4401": [(0, 3.0, "आज हम food court में आए हैं"), (3.68, 6.0, "और मैं प्रियंका को challenge कर रहा हूँ"),
              (6.0, 10.16, "30 मिनट में ₹500 का कुछ भी खा लेगी?"), (10.16, 13.48, "तो इसे 3 दिन की trip पर ले जाऊँगा!"),
              (13.6, 14.38, "कब लेके जाओगे?"), (14.38, 17.66, "जब तुम खा लोगी, फिर plan करेंगे"),
              (18.58, 20.2, "तो मैं अभी timer चालू करूँ?")],
 "IMG_4402": [(0, 5.0, "तो menu दिखा सकते हैं?"), (5.0, 9.5, "बहुत कुछ है खाने को...")],
 "IMG_4403": [(5.1, 6.4, "वाह, momos!"), (6.9, 9.0, "उसके अलावा Taco Bell है"), (9.0, 11.6, "और pizza भी है")],
 "IMG_4407": [(0, 4.3, "Momos, Domino's, Burger King, Haldiram...")],
 "IMG_4409": [(0, 3.0, "अभी हम Haldiram से शुरू करेंगे"), (3.7, 5.46, "Timer चालू करते हैं!")],
 "IMG_4413": [(0, 2.6, "Timer चालू है, 2 मिनट होने वाले हैं"), (2.6, 5.42, "एक dish order की है, वो बन रही है"),
              (10.1, 13.98, "₹234 का हमने order कर लिया है")],
 "IMG_4419": [(13.24, 16.08, "पाव भाजी खानी शुरू कर दी"), (16.08, 17.8, "जो कि ₹234 की है")],
 "IMG_4420": [(2.8, 4.5, "Timer भी चल रहा है"), (6.3, 7.8, "5 मिनट हो गए")],
 "IMG_4421": [(2.4, 5.0, "एक पाव खा लिया है")],
 "IMG_4422": [(1.1, 4.88, "अब timer 8 मिनट हो चुका है"), (4.88, 7.02, "और एक पाव इसने complete कर लिया"),
              (7.96, 10.26, "लेकिन सब्ज़ी सारी बची हुई है")],
 "IMG_4423": [(0, 1.8, "तो सारे पाव खा लिए"), (1.8, 4.5, "और अभी सब्ज़ी बची है"), (9.7, 11.1, "10 मिनट हो गए")],
 "IMG_4426": [(0, 3.14, "Last bite... पहली dish complete!"), (3.74, 5.52, "11 मिनट 40 सेकंड")],
 "IMG_4429": [(8.54, 10.84, "और ये दूसरी dish आ गई"), (10.84, 13.98, "अभी time हुआ है 13 मिनट"),
              (13.98, 17.86, "गरम है, ध्यान से खाना"), (34.87, 35.77, "थोड़ी तुम भी खा लो?"),
              (36.65, 37.61, "मैं क्यों खाऊँ?"), (37.81, 38.97, "Challenge तो तुम्हारा है ना"),
              (38.97, 40.17, "सिर्फ़ ₹500 का!"), (44.43, 47.93, "मेरी trip के लिए कुछ भी करूँगी!")],
 "IMG_4433": [(0, 2.38, "दूसरी dish भी ख़त्म होने वाली है"), (6.72, 8.7, "अब बस टिक्की ख़त्म होनी है"),
              (8.7, 10.84, "और time हुआ है 18 मिनट"), (10.84, 13.08, "Last bite... जल्दी से!"),
              (13.72, 15.14, "हो गया, COMPLETE!")],
 "IMG_4435": [(6.6, 8.8, "अब momos order करोगी?"), (9.6, 12.9, "अभी हमारे 10-12 मिनट बाकी हैं")],
 "IMG_4440": [(0, 2.7, "2 dishes खा ली हैं"), (2.7, 6.5, "और अब ये momos खाने हैं")],
 "IMG_4441": [(1.5, 5.7, "10 मिनट बाकी हैं... और खाना सामने है")],
 "IMG_4445": [(14.3, 18.5, "हमारा total bill ₹500 के ऊपर जा रहा है"), (19.4, 21.1, "Bill complete हो चुका है")],
 "IMG_4446": [(3.2, 6.7, "Timer भाग रहा है... 23 मिनट हो चुके!")],
 "IMG_4447": [(2.4, 4.5, "Momos... और 7 मिनट!"), (16.9, 19.1, "जल्दी, time भाग रहा है!")],
 "IMG_4448": [(41.5, 43.4, "25 मिनट हो चुके!")],
 "IMG_4449": [(6.1, 8.7, "बहुत ज़्यादा खाया जा रहा है...")],
 "IMG_4453": [(0, 1.7, "आख़िरकार challenge complete!"), (1.72, 4.28, "लेकिन cold drink छोड़ दी!")],
 "IMG_4454": [(2.56, 3.64, "अगली बार कितने का challenge?"), (3.64, 5.56, "₹2,000 का?"), (8.8, 10.96, "₹500 तो बहुत कम था!")],
}
TIMER = {"IMG_4410": "00:13", "IMG_4414": "02:31", "IMG_4415": "03:00", "IMG_4420": "05:49", "IMG_4422": "08:00",
         "IMG_4423": "10:13", "IMG_4426": "11:41", "IMG_4429": "13:00", "IMG_4433": "18:00", "IMG_4441": "20:00",
         "IMG_4446": "23:00", "IMG_4448": "25:00"}


def seg(clip, s, e, src=PROX, **kw):
    d = {"src": src.format(clip), "s": s, "e": e, "subs": [list(c) for c in CAP.get(clip, [])], "_clip": clip}
    d.update(kw); return d


def finalize(plan):
    """add timer overlays + whoosh on scene changes; strip helper keys."""
    ov, sfx = plan.setdefault("overlays", []), plan.setdefault("sfx", [])
    for si, sc in enumerate(plan["scenes"]):
        if si:
            sfx.append({"seg": [si, 0], "off": -0.35, "file": SFX + "whoosh.ogg", "vol": 0.55})
        for gi, g in enumerate(sc["segs"]):
            c = g.pop("_clip")
            if c in TIMER and plan.get("timers", True):
                ov.append({"seg": [si, gi], "off": 0.0, "d": g["e"] - g["s"], "text": TIMER[c], "style": "timer"})
    plan.pop("timers", None)
    return plan


# ------------------------------------------------------------------ REEL (~60 s, 9:16, from originals)
O = ORIG
reel = {"out": "/home/claude/fc/out/FoodChallenge_Reel_1min.mp4", "format": "vertical", "fill": "crop", "scenes": [
  {"segs": [seg("IMG_4401", 3.6, 10.2, O, zoom="punch"), seg("IMG_4401", 10.16, 13.5, O, zoom="push")]},
  {"tr": "zoom", "segs": [seg("IMG_4409", 0, 2.6, O), seg("IMG_4413", 10.1, 13.4, O, label="ROUND 1 • पाव भाजी ₹234"),
                          seg("IMG_4419", 13.2, 16.1, O), seg("IMG_4422", 1.1, 7.0, O), seg("IMG_4426", 0, 5.5, O, zoom="push")]},
  {"tr": "slide", "segs": [seg("IMG_4429", 8.5, 11.0, O, label="ROUND 2 • टिक्की"), seg("IMG_4429", 36.6, 40.2, O),
                           seg("IMG_4429", 44.4, 48.0, O, zoom="punch"), seg("IMG_4433", 10.8, 15.2, O)]},
  {"tr": "zoom", "segs": [seg("IMG_4440", 2.7, 6.5, O, label="ROUND 3 • Momos"), seg("IMG_4446", 3.2, 6.7, O, zoom="push"),
                          seg("IMG_4449", 6.1, 8.8, O, zoom="punch")]},
  {"tr": "white", "segs": [seg("IMG_4453", 0, 4.5, O, zoom="push"), seg("IMG_4454", 2.5, 6.0, O), seg("IMG_4454", 8.7, 11.1, O, zoom="punch")]},
 ],
 "overlays": [
  {"seg": [0, 0], "off": 0.0, "d": 3.2, "text": "₹500 का खाना • 30 मिनट\\Nक्या कर पाएगी?", "style": "hook"},
  {"seg": [0, 1], "off": 0.6, "d": 1.8, "text": "3 दिन की TRIP!", "style": "big"},
  {"seg": [1, 0], "off": 1.6, "d": 1.0, "text": "START!", "style": "big"},
  {"seg": [1, 4], "off": 0.3, "d": 1.6, "text": "DISH 1 DONE!", "style": "big"},
  {"seg": [2, 3], "off": 2.9, "d": 1.5, "text": "DISH 2 DONE!", "style": "big"},
  {"seg": [4, 0], "off": 0.2, "d": 2.2, "text": "CHALLENGE\\NCOMPLETE!", "style": "big"},
 ],
 "sfx": [
  {"seg": [0, 0], "off": 0.0, "file": SFX + "boom.ogg", "vol": 0.7},
  {"seg": [0, 1], "off": 0.6, "file": SFX + "cc0-wow-voice.wav", "vol": 0.5},
  {"seg": [1, 0], "off": 1.5, "file": SFX + "tick.ogg", "vol": 0.8},
  {"seg": [1, 4], "off": 0.3, "file": SFX + "ding.ogg", "vol": 0.7},
  {"seg": [2, 3], "off": 2.9, "file": SFX + "ding.ogg", "vol": 0.7},
  {"seg": [3, 1], "off": 0.0, "file": SFX + "riser.ogg", "vol": 0.6},
  {"seg": [3, 2], "off": 0.2, "file": SFX + "cc0-oh-no-voice.wav", "vol": 0.45},
  {"seg": [4, 0], "off": 0.15, "file": SFX + "cc0-tada.wav", "vol": 0.6},
 ],
 "music": [
  {"from": [0, 0], "to": [1, 0], "file": MUS + "m134.mp3", "vol": 0.30, "start": 8},
  {"from": [1, 0], "to": [3, 1], "file": MUS + "m2.mp3", "vol": 0.22, "start": 0},
  {"from": [3, 1], "to": [4, 0], "file": MUS + "m134.mp3", "vol": 0.32, "start": 40},
  {"from": [4, 0], "to": None, "file": MUS + "m158.mp3", "vol": 0.26, "start": 0},
 ]}

# ------------------------------------------------------------------ VLOG (~7 min, 16:9 blur, proxies)
V = []  # (scene list)
V.append({"segs": [seg("IMG_4449", 6.1, 8.8, zoom="punch"), seg("IMG_4443", 5.9, 8.3), seg("IMG_4447", 16.9, 19.2, zoom="punch"),
                   seg("IMG_4402", 0, 3.2, zoom="push")]})                                                     # 0 teaser + title
V.append({"tr": "black", "segs": [seg("IMG_4401", 0, 20.3, zoom="auto")]})                                       # 1 intro
V.append({"tr": "slide", "segs": [seg("IMG_4402", 3.2, 9.5), seg("IMG_4403", 0, 11.7), seg("IMG_4404", 1.4, 4.7),
                                  seg("IMG_4405", 0, 3.0), seg("IMG_4406", 4.5, 7.3), seg("IMG_4407", 0, 8.4)]})   # 2 menu
V.append({"tr": "zoom", "segs": [seg("IMG_4408", 0, 3.0), seg("IMG_4409", 0, 5.6), seg("IMG_4410", 0, 6.4), seg("IMG_4412", 13.2, 21.0),
                                 seg("IMG_4413", 0, 14.2), seg("IMG_4414", 0, 3.5), seg("IMG_4415", 0, 3.0), seg("IMG_4416", 4.9, 12.0),
                                 seg("IMG_4417", 0, 3.0)]})                                                    # 3 start + order
V.append({"tr": "slide", "segs": [seg("IMG_4419", 3.5, 17.9), seg("IMG_4420", 2.4, 10.0), seg("IMG_4421", 2.0, 8.4),
                                  seg("IMG_4422", 0.7, 13.2), seg("IMG_4423", 0, 12.9), seg("IMG_4425", 0, 2.4), seg("IMG_4426", 0, 6.0)]})  # 4 round 1
V.append({"tr": "zoom", "segs": [seg("IMG_4427", 0, 3.0), seg("IMG_4428", 0, 3.0), seg("IMG_4429", 8.4, 18.0), seg("IMG_4429", 26.0, 48.2),
                                 seg("IMG_4432", 0.9, 3.3), seg("IMG_4433", 0, 17.3)]})                         # 5 round 2
V.append({"tr": "slide", "segs": [seg("IMG_4434", 0, 3.0), seg("IMG_4435", 6.2, 16.8), seg("IMG_4437", 1.4, 6.6), seg("IMG_4438", 0, 3.5),
                                  seg("IMG_4440", 0, 15.3), seg("IMG_4441", 1.1, 8.3), seg("IMG_4442", 0, 3.0), seg("IMG_4443", 0.3, 11.3),
                                  seg("IMG_4445", 0.3, 8.4), seg("IMG_4445", 14.3, 21.2), seg("IMG_4446", 2.9, 10.2)]})  # 6 round 3 + bill
V.append({"tr": "zoom", "segs": [seg("IMG_4447", 2.0, 19.2), seg("IMG_4447", 24.9, 33.7), seg("IMG_4448", 31.0, 44.9),
                                 seg("IMG_4449", 0, 18.2), seg("IMG_4450", 0, 8.9), seg("IMG_4451", 83.0, 89.6)]})  # 7 final minutes
V.append({"tr": "white", "segs": [seg("IMG_4452", 0, 3.5), seg("IMG_4453", 0, 6.5, zoom="push"), seg("IMG_4454", 0, 17.4)]})  # 8 result + outro

vlog = {"out": "/home/claude/fc/out/FoodChallenge_Vlog.mp4", "format": "landscape", "fill": "blur", "scenes": V,
 "overlays": [
  {"seg": [0, 3], "off": 0.1, "d": 3.0, "text": "₹500 FOOD CHALLENGE\\N30 मिनट • 1 शर्त", "style": "hook"},
  {"seg": [1, 0], "off": 11.0, "d": 2.0, "text": "3 दिन की TRIP!", "style": "big"},
  {"seg": [3, 1], "off": 3.8, "d": 1.2, "text": "START!", "style": "big"},
  {"seg": [4, 0], "off": 0.2, "d": 3.0, "text": "ROUND 1 • पाव भाजी ₹234", "style": "label"},
  {"seg": [4, 6], "off": 0.3, "d": 1.8, "text": "DISH 1 DONE!", "style": "big"},
  {"seg": [5, 2], "off": 0.2, "d": 3.0, "text": "ROUND 2 • टिक्की", "style": "label"},
  {"seg": [5, 5], "off": 13.7, "d": 1.6, "text": "DISH 2 DONE!", "style": "big"},
  {"seg": [6, 1], "off": 0.2, "d": 3.0, "text": "ROUND 3 • Momos", "style": "label"},
  {"seg": [6, 9], "off": 0.2, "d": 3.0, "text": "BILL ₹500+", "style": "label"},
  {"seg": [7, 0], "off": 0.2, "d": 3.0, "text": "आख़िरी 7 मिनट...", "style": "label"},
  {"seg": [8, 1], "off": 0.2, "d": 2.4, "text": "CHALLENGE\\NCOMPLETE!", "style": "big"},
 ],
 "sfx": [
  {"seg": [0, 0], "off": 0.0, "file": SFX + "boom.ogg", "vol": 0.7},
  {"seg": [0, 3], "off": 0.1, "file": SFX + "cc0-deep-boom.wav", "vol": 0.6},
  {"seg": [1, 0], "off": 11.0, "file": SFX + "cc0-wow-voice.wav", "vol": 0.45},
  {"seg": [3, 1], "off": 3.7, "file": SFX + "tick.ogg", "vol": 0.8},
  {"seg": [4, 6], "off": 0.3, "file": SFX + "ding.ogg", "vol": 0.7},
  {"seg": [5, 5], "off": 13.7, "file": SFX + "ding.ogg", "vol": 0.7},
  {"seg": [6, 9], "off": 0.2, "file": SFX + "cc0-huh-voice.wav", "vol": 0.4},
  {"seg": [6, 10], "off": 0.0, "file": SFX + "riser.ogg", "vol": 0.55},
  {"seg": [7, 3], "off": 6.1, "file": SFX + "cc0-oh-no-voice.wav", "vol": 0.4},
  {"seg": [8, 1], "off": 0.15, "file": SFX + "cc0-tada.wav", "vol": 0.6},
  {"seg": [8, 2], "off": 8.8, "file": SFX + "cc0-group-ooh.wav", "vol": 0.35},
 ],
 "music": [
  {"from": [0, 0], "to": [3, 0], "file": MUS + "m134.mp3", "vol": 0.24, "start": 0},
  {"from": [3, 0], "to": [6, 0], "file": MUS + "m2.mp3", "vol": 0.18, "start": 0},
  {"from": [6, 0], "to": [7, 0], "file": MUS + "m82.mp3", "vol": 0.17, "start": 0},
  {"from": [7, 0], "to": [8, 0], "file": MUS + "m134.mp3", "vol": 0.26, "start": 30},
  {"from": [8, 0], "to": None, "file": MUS + "m158.mp3", "vol": 0.22, "start": 0},
 ]}

for p, n in ((reel, "reel"), (vlog, "vlog")):
    json.dump(finalize(p), open(f"/home/claude/fc/{n}.json", "w"), ensure_ascii=False, indent=1)
tot = sum(g["e"] - g["s"] for sc in vlog["scenes"] for g in sc["segs"])
print("vlog raw", round(tot), "s; reel raw", round(sum(g["e"] - g["s"] for sc in reel["scenes"] for g in sc["segs"])), "s")
