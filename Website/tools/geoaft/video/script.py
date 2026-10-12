"""Single source for the GeoAFT explainer narration, timing and captions.

Run `python Website/tools/geoaft/video/script.py` to write the SRT/VTT captions and timing.json.
Timing is derived from a natural speaking pace (WORDS_PER_SECOND), so editing a line re-times
every later scene, its captions and the animatic together.
"""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT_SITE = HERE.parents[2] / 'v1' / 'assets' / 'geoaft' / 'video'
WORDS_PER_SECOND = 2.6   # about 155 words per minute
PAUSE = 0.35             # breath between lines
SCENE_GAP = 0.6          # extra beat at each scene change

# (scene, beat, narration). Beats drive specific on-screen events in the animatic.
LINES = [
    ('puzzle', 'title', 'A pretrained Transformer learns two things: representations, and a rule for comparing them.'),
    ('puzzle', 'reps', 'When we fine-tune, we usually change the representations.'),
    ('puzzle', 'rule', 'The rule that decides which tokens attend to which is simply inherited.'),
    ('intuition', 'setup', 'Take one query and seven keys, and hold them fixed.'),
    ('intuition', 'dot', 'Under the dot product, attention goes to B, furthest along the query’s direction.'),
    ('intuition', 'l2', 'With Euclidean distance, the nearest key, A, wins.'),
    ('intuition', 'lp', 'Taxicab distance picks D.'),
    ('intuition', 'maha', 'An anisotropic metric picks F.'),
    ('intuition', 'still', 'Nothing moved. Only the geometry changed.'),
    ('method', 'trainable', 'GeoAFT makes that geometry trainable.'),
    ('method', 'term', 'It keeps the pretrained score and adds a small structured term, like a learned L-p distance or a Mahalanobis metric.'),
    ('method', 'gate', 'Its gate starts at zero, so training begins exactly at the pretrained model.'),
    ('evidence', 'setup', 'We first tested it on synthetic targets with a known relation.'),
    ('evidence', 'recovery', 'GeoAFT recovered over ninety-nine point nine percent of the oracle gap on both targets.'),
    ('evidence', 'margins', 'That is about forty points ahead of Q/K LoRA, and six to twelve points ahead of tested generic scorers.'),
    ('evidence', 'caveat', 'Not every registered comparison passed: a fixed L-p bank came almost as close.'),
    ('evidence', 'params', 'On a nonlinear target, 46 trainable parameters fit about as well as the tested 8,705-parameter MLP: an economy, not a clear win.'),
    ('evidence', 'twist', 'But theory adds a twist.'),
    ('evidence', 'equivalence', 'A Mahalanobis geometry is exactly a bilinear score plus a key-dependent bias: a known score family, not new capacity.'),
    ('meaning', 'notuniform', 'So geometry adaptation is not uniformly better.'),
    ('meaning', 'regimes', 'Some updates are exact reparameterizations, some are more economical, and some may add new capacity.'),
    ('meaning', 'question', 'Telling these apart is the real question. So far, the evidence is controlled and synthetic.'),
    ('close', 'question', 'When should adaptation change representations, and when should it change how they relate?'),
    ('close', 'url', 'More on the QRS website.'),
]

# Shorter 45–60 second cut, same visuals (see STORYBOARD.md for the scene mapping).
CUTDOWN = [
    'Fine-tuning usually changes a model’s representations. But attention also depends on a rule for comparing them, and that rule is usually inherited.',
    'Hold a query and its keys fixed, change the geometry, and attention moves to a different key.',
    'GeoAFT makes that geometry trainable: a small, structured term on the attention score, gated from zero so it starts exactly at the pretrained model.',
    'On synthetic targets with a known relation, it recovered more than ninety-nine point nine percent of the oracle gap, about forty points ahead of Q/K LoRA, though a fixed geometry bank came close too. And 46 parameters fit a nonlinear target about as well as the tested 8,705-parameter MLP: an economy, not a clear win.',
    'But a Mahalanobis geometry turns out to be a bilinear score plus a key-dependent bias, a known score family. So far the results are controlled and synthetic; the real question is when geometry adaptation adds something new.',
]


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


def stamp(seconds, sep):
    h, rem = divmod(seconds, 3600)
    m, s = divmod(rem, 60)
    return f'{int(h):02d}:{int(m):02d}:{int(s):02d}{sep}{int(round((s - int(s)) * 1000)):03d}'


def main():
    lines, total = timeline()
    OUT_SITE.mkdir(parents=True, exist_ok=True)
    srt = '\n'.join(f'{i}\n{stamp(l["start"], ",")} --> {stamp(l["end"], ",")}\n{l["text"]}\n' for i, l in enumerate(lines, 1))
    vtt = 'WEBVTT\n\n' + '\n'.join(f'{stamp(l["start"], ".")} --> {stamp(l["end"], ".")}\n{l["text"]}\n' for l in lines)
    (HERE / 'geoaft-explainer-draft.en.srt').write_text(srt, encoding='utf-8', newline='\n')
    (OUT_SITE / 'geoaft-explainer-draft.en.vtt').write_text(vtt, encoding='utf-8', newline='\n')
    scenes = {}
    for l in lines:
        s = scenes.setdefault(l['scene'], {'start': l['start'], 'end': l['end']})
        s['end'] = l['end']
    names = list(scenes)
    for a, b in zip(names, names[1:]):
        scenes[a]['end'] = scenes[b]['start']
    scenes[names[-1]]['end'] = total
    data = {'total': total, 'lines': lines, 'scenes': scenes,
            'words': sum(len(l['text'].split()) for l in lines),
            'cutdown_words': sum(len(t.split()) for t in CUTDOWN)}
    (HERE / 'timing.json').write_text(json.dumps(data, indent=1) + '\n', encoding='utf-8', newline='\n')
    print(f'Explainer: {data["words"]} words, {total:.1f} s; cutdown {data["cutdown_words"]} words '
          f'(~{data["cutdown_words"] / WORDS_PER_SECOND:.0f} s).')
    for k, v in scenes.items():
        print(f'  {k:10s} {v["start"]:6.1f} – {v["end"]:6.1f}')


if __name__ == '__main__':
    main()
