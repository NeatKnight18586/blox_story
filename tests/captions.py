import copy, importlib.util, json, sys, tempfile, unittest
from pathlib import Path
sys.dont_write_bytecode = True
root=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('captions',root/'scripts/caption-previews.py');mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
class Captions(unittest.TestCase):
    def setUp(self):
        self.data=json.loads((root/'stories/names100/captions/s3c.json').read_text());self.style=json.loads((root/self.data['style']).read_text())
    def test_verbatim_and_safe_style(self):mod.validate(self.data,self.style)
    def test_misspelled_name_rejected(self):
        self.data['cues'][9]['text']="And Ely's number"
        with self.assertRaises(AssertionError):mod.validate(self.data,self.style)
    def test_zero_spoiler_rejected(self):
        self.data['cues'][9]['end']=50.85;self.data['cues'][10]['start']=50.9
        with self.assertRaises(AssertionError):mod.validate(self.data,self.style)
    def test_caption_too_wide_rejected(self):
        self.style['fontSize']=96
        with self.assertRaises(AssertionError):mod.validate(self.data,self.style)
    def test_no_early_frame_and_real_pauses(self):
        for clip in self.data['clips']:
            events=mod.events(self.data,clip)
            for e in events:
                first=clip['startFrame']/30+e['firstFrame']/15
                self.assertGreaterEqual(first+1e-9,e['start']);self.assertLess(first-e['start'],1/15+1e-8)
                self.assertLess(e['firstFrame'],e['endFrame'])
            if clip['id']=='A':self.assertLess(events[0]['endFrame'],events[1]['firstFrame'])
            if clip['id']=='C':self.assertEqual(clip['startFrame']+2*next(e['firstFrame'] for e in events if e['id']=='C2'),1530)
    def test_ass_srt_repeatability(self):
        with tempfile.TemporaryDirectory() as a,tempfile.TemporaryDirectory() as b:
            mod.generate(self.data,self.style,Path(a));mod.generate(self.data,self.style,Path(b))
            for f in Path(a).iterdir():self.assertEqual(f.read_bytes(),(Path(b)/f.name).read_bytes())
if __name__=='__main__':unittest.main()
