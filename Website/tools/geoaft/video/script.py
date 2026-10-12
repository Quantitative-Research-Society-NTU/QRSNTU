"""Single source for the GeoAFT explainer narration and timing.

Run `python Website/tools/geoaft/video/script.py` to write timing.json (read by build_animatic.py)
and NARRATION.md (the voice-over script, kept as its own file). The video carries no subtitles or
caption track. Timing is derived from a natural speaking pace (WORDS_PER_SECOND), so editing a line
re-times every later scene and the animatic together.
"""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
WORDS_PER_SECOND = 2.6   # about 155 words per minute
PAUSE = 0.35             # breath between lines
SCENE_GAP = 0.6          # extra beat at each scene change

SCENES = {'puzzle': 'The puzzle', 'intuition': 'The intuition', 'method': 'The method', 'tested': 'Tested so far',
          'regimes': 'What the results mean', 'next': 'In progress and next', 'close': 'Close'}

# (scene, beat, narration). Beats drive specific on-screen events in the animatic.
LINES = [
    ('puzzle', 'title', 'GeoAFT: geometric attention fine-tuning.'),
    ('puzzle', 'two', 'A pretrained Transformer learns two things: representations, and a rule for comparing them.'),
    ('puzzle', 'reps', 'Fine-tuning usually changes the representations.'),
    ('puzzle', 'rule', 'The rule that decides which tokens attend to which is simply inherited.'),
    ('intuition', 'setup', 'Take one query and seven keys, and hold them still.'),
    ('intuition', 'euclid', 'Measure with Euclidean distance, and the nearest key wins.'),
    ('intuition', 'lp', 'Bend the ruler into an L-p distance, and a different key takes the lead.'),
    ('intuition', 'maha', 'Stretch and turn a learned metric, and the ranking shifts again.'),
    ('intuition', 'cos', 'Cosine looks only at direction.'),
    ('intuition', 'dot', 'The dot product, the pretrained default, rewards whatever lies furthest along the query.'),
    ('intuition', 'still', 'Nothing moved. Only the geometry changed.'),
    ('method', 'trainable', 'GeoAFT makes that geometry trainable.'),
    ('method', 'term', 'It keeps the pretrained score and adds a small, structured term on top.'),
    ('method', 'gate', 'A gate starts at zero, so training begins from exactly the pretrained model.'),
    ('tested', 'setup', 'So far we have tested it where the right answer is known: three synthetic targets.'),
    ('tested', 'three', 'On each, GeoAFT recovers more than ninety-nine point nine percent of the gap to the oracle.'),
    ('tested', 'field', 'Here is every method we ran, by trainable parameters and recovery.'),
    ('tested', 'qk', 'Low-rank Q/K adaptation stays about forty points behind.'),
    ('tested', 'scorers', 'Generic learned scorers trail by six to twelve points, or need thousands of parameters to come close.'),
    ('tested', 'caveat', 'One caution: on the L-p target a fixed geometry bank comes almost as close, so not every comparison is a clear win.'),
    ('regimes', 'intro', 'So a geometry update can be one of three things.'),
    ('regimes', 'list', 'An exact rewrite of something weights already do, a cheaper way to say the same thing, or something new.'),
    ('regimes', 'status', 'The first is proven, the second is supported, and the third is still open.'),
    ('next', 'progress', 'Real benchmarks are in progress.'),
    ('next', 'rq1', 'Next, we ask when geometry adaptation is actually different, across richer families such as spherical and hyperbolic geometry.'),
    ('next', 'rq2', 'Whether geometry can become conditional on the input, layer or head.'),
    ('next', 'rq3', 'And whether the idea survives beyond attention, and under compression.'),
    ('close', 'question', 'When should adaptation change representations, and when should it change how they relate?'),
    ('close', 'url', 'More on the QRS website.'),
]

ACCURACY_NOTES = """“More than ninety-nine point nine percent” covers 99.983% (L_p), 99.991% (Mahalanobis) and 99.934% (structured
nonlinear). “About forty points” covers 39.9–41.7 percentage points of R on the L_p and Mahalanobis targets. “Six to
twelve” covers 6.4–12.2 against the tested pair-MLPs on those targets; “thousands of parameters” is the 8,705-parameter
PairMLP on the nonlinear target. “Almost as close” is the fixed geometry bank on the L_p target. Do not upgrade any of
these to “beats”, “best” or “state of the art”, and do not describe real-benchmark results: they are in progress."""


def timeline():
    t, out, scene = 0.6, [], None
    for scene_name, beat, text in LINES:
        if scene is not None and scene_name != scene:
            t += SCENE_GAP
        scene = scene_name
        dur = max(1.6, len(text.split()) / WORDS_PER_SECOND)
        out.append({'scene': scene_name, 'beat': beat, 'start': round(t, 2), 'end': round(t + dur, 2), 'text': text})
        t += dur + PAUSE
    return out, round(t + 1.6, 2)


def clock(seconds):
    return f'{int(seconds // 60)}:{int(seconds % 60):02d}'


def main():
    lines, total = timeline()
    scenes = {}
    for l in lines:
        s = scenes.setdefault(l['scene'], {'start': l['start'], 'end': l['end']})
        s['end'] = l['end']
    names = list(scenes)
    for a, b in zip(names, names[1:]):
        scenes[a]['end'] = scenes[b]['start']
    scenes[names[-1]]['end'] = total
    words = sum(len(l['text'].split()) for l in lines)
    data = {'total': total, 'lines': lines, 'scenes': scenes, 'words': words}
    (HERE / 'timing.json').write_text(json.dumps(data, indent=1) + '\n', encoding='utf-8', newline='\n')

    md = ['# GeoAFT explainer: narration script', '',
          f'Generated by `script.py`; edit the lines there, not here. {words} words, {clock(total)} at about '
          f'{round(WORDS_PER_SECOND * 60)} words per minute. The video has no subtitles or caption track; this file is the only copy of the script.', '']
    for name in names:
        md += [f'## {SCENES[name]} ({clock(scenes[name]["start"])}–{clock(scenes[name]["end"])})', '']
        md += [' '.join(l['text'] for l in lines if l['scene'] == name), '']
    md += ['## Accuracy notes for the voice-over', '', ACCURACY_NOTES, '']
    (HERE / 'NARRATION.md').write_text('\n'.join(md), encoding='utf-8', newline='\n')

    print(f'Explainer: {words} words, {total:.1f} s.')
    for k, v in scenes.items():
        print(f'  {k:10s} {v["start"]:6.1f} – {v["end"]:6.1f}')


if __name__ == '__main__':
    main()
