#!/usr/bin/env bash
# Claude Video Editor kit — one-shot setup for a fresh cloud (or Linux/macOS) session.
# Installs the tools and Claude skills from the "Turn Claude into a Video Editor" list (repos.tsv).
#
#   bash setup.sh            # core: tools + all skill repos (fast, ~1-3 min)
#   FULL=1 bash setup.sh     # + heavy deps (openai-whisper/torch, ghost-editor & claude-shorts deps,
#                            #   all 19 iart-ai packs, MotionClone research repo)
#
# Env:
#   KIT_DIR     where repos are cloned        (default: ~/claude-video-kit)
#   SKILLS_DIR  where skills are linked       (default: ~/.claude/skills)
set -uo pipefail

KIT_DIR="${KIT_DIR:-$HOME/claude-video-kit}"
SKILLS_DIR="${SKILLS_DIR:-$HOME/.claude/skills}"
FULL="${FULL:-0}"
REPOS="$KIT_DIR/repos"
mkdir -p "$REPOS" "$SKILLS_DIR" "$KIT_DIR/reference"
LOG="$KIT_DIR/installed.txt"; : > "$LOG"

say() { printf '\n\033[1;33m==> %s\033[0m\n' "$*"; }

clone() {  # clone <owner/repo> [dest]
  local repo="$1" dest="${2:-$REPOS/${1//\//__}}"
  if [ -d "$dest/.git" ]; then
    git -C "$dest" pull -q --ff-only 2>/dev/null || true
  else
    timeout 600 git clone -q --depth 1 "https://github.com/$repo" "$dest" 2>/dev/null || { echo "  !! clone failed: $repo"; return 1; }
  fi
  echo "$dest"
}

declare -A USED=() LINKED=()
# link_skill <skill_dir> <link_name>: link a folder containing SKILL.md into SKILLS_DIR.
# If the skill's frontmatter name is already taken by an earlier skill, rename it to <link_name>.
link_skill() {
  local dir="$1" link="$2" name
  [ -f "$dir/SKILL.md" ] || return 0
  [ -n "${LINKED[$link]:-}" ] && return 0   # same skill already provided by an earlier pack
  LINKED[$link]=1
  name=$(sed -n 's/^name:[[:space:]]*//p' "$dir/SKILL.md" | head -1 | tr -d "\"'\r")
  [ -n "$name" ] || name="$link"
  if [ -n "${USED[$name]:-}" ]; then
    sed -i.bak "0,/^name:.*/s//name: $link/" "$dir/SKILL.md" && rm -f "$dir/SKILL.md.bak"
    name="$link"
  fi
  USED[$name]=1
  ln -sfn "$dir" "$SKILLS_DIR/$link"
  printf '%-40s %s\n' "$name" "$dir" >> "$LOG"
}

link_skills_subdir() {  # link_skills_subdir <repo_dir> <prefix>: link every <repo>/skills/*/SKILL.md
  local repo="$1" prefix="$2" d
  for d in "$repo"/skills/*/; do
    d="${d%/}"; [ -f "$d/SKILL.md" ] && link_skill "$d" "$prefix$(basename "$d")"
  done
}

# ---------------------------------------------------------------- 1. tools
say "Tools: ffmpeg, yt-dlp (#01), Whisper (#02)"
if ! command -v ffmpeg >/dev/null; then
  (sudo apt-get update -qq && sudo apt-get install -y -qq ffmpeg) 2>/dev/null \
    || apt-get install -y -qq ffmpeg 2>/dev/null || brew install ffmpeg 2>/dev/null \
    || echo "  !! install ffmpeg manually"
fi
PIP="python3 -m pip install -q --upgrade"
$PIP yt-dlp faster-whisper 2>/dev/null || $PIP --break-system-packages yt-dlp faster-whisper
if [ "$FULL" = 1 ]; then
  $PIP openai-whisper 2>/dev/null || $PIP --break-system-packages openai-whisper
fi

# ---------------------------------------------------------------- 2. skills
say "#03 kajisho5/ffmpeg-skill";        r=$(clone kajisho5/ffmpeg-skill)        && link_skill "$r" ffmpeg-skill
say "#04 ychoi-kr/claude-ffmpeg-skill"; r=$(clone ychoi-kr/claude-ffmpeg-skill) && link_skill "$r" ffmpeg-usage
say "#05 kurbaitaev/ghost-editor";      r=$(clone kurbaitaev/ghost-editor)      && link_skill "$r" ghost-editor
GHOST="$r"
say "#06 AgriciDaniel/claude-shorts";   r=$(clone AgriciDaniel/claude-shorts)   && link_skill "$r" claude-shorts
SHORTS="$r"
say "#07 CloudAI-X/threejs-skills";     r=$(clone CloudAI-X/threejs-skills)     && link_skills_subdir "$r" ""
say "#08 cesartevisual/threejs-skills"; r=$(clone cesartevisual/threejs-skills) && link_skills_subdir "$r" "pro-"
say "#10 Barty-Bart/motion-graphics";   r=$(clone Barty-Bart/motion-graphics)   && link_skills_subdir "$r" "mg-"
say "#14 heygen-com/hyperframes";       r=$(clone heygen-com/hyperframes)       && link_skills_subdir "$r" "hf-"

# #09 iart-ai/motion-skills is an index of 19 packs; #11 javascript-animation-skills is one of them.
say "#09 + #11 iart-ai motion packs"
clone iart-ai/motion-skills "$KIT_DIR/reference/iart-ai__motion-skills" >/dev/null
PACKS="javascript-animation-skills tiktok-video-skills youtube-video-skills explainer-video-skills
       kinetic-typography-skills b-roll-skills motion-design-skills lower-thirds-skills data-animation-skills"
[ "$FULL" = 1 ] && PACKS="$PACKS text-message-video-skills ecommerce-video-skills ad-video-skills
       map-animation-skills web-animation-skills freelance-motion-skills webgl-animation-skills
       manim-skills generative-illustration-skills talking-head-skills"
for p in $PACKS; do r=$(clone "iart-ai/$p") && link_skills_subdir "$r" "iart-"; done

# #15 reference list only (800+ skills — browse, don't bulk-install)
say "#15 ComposioHQ/awesome-claude-skills (reference)"
clone ComposioHQ/awesome-claude-skills "$KIT_DIR/reference/awesome-claude-skills" >/dev/null

# ---------------------------------------------------------------- 3. heavy extras
if [ "$FULL" = 1 ]; then
  say "FULL: claude-shorts python deps"
  $PIP -r "$SHORTS/requirements.txt" 2>/dev/null || $PIP --break-system-packages -r "$SHORTS/requirements.txt"
  say "FULL: ghost-editor — follow $GHOST/docs/INSTALL.md (≈4 GB: Node, Python, Whisper, OpenCV, Mixkit sounds)"
  say "FULL: #12/#13 LPengYang/MotionClone (needs NVIDIA GPU + model weights; reference only)"
  clone LPengYang/MotionClone "$KIT_DIR/reference/MotionClone" >/dev/null
fi

say "Done. $(wc -l < "$LOG") skills linked into $SKILLS_DIR (list: $LOG)"
echo "Tools: $(command -v ffmpeg >/dev/null && echo ffmpeg) $(command -v yt-dlp >/dev/null && echo yt-dlp) faster-whisper"
