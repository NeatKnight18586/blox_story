"""npm run v2:test (python part) — Amendment A2 finishing: filter-graph builder, CRF stepping with the bitrate
floor, proxy cap, and the QC metrics and thresholds (scripts/v2/assemble.py, scripts/v2/qc.py)."""
import os, sys, unittest
import numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'scripts', 'v2'))
import assemble as A  # noqa: E402
import qc as Q  # noqa: E402


class Graph(unittest.TestCase):
    def test_bloom_is_highlight_only_and_scaled(self):
        g = A.grade_graph(2560)
        self.assertIn("lut=c0='if(gt(val,215)", g)                      # only highlights feed the blur
        self.assertLess(g.index('lut='), g.index('gblur='))
        self.assertIn('gblur=sigma=6.0', g); self.assertIn('format=gbrp', g)
        self.assertEqual(A.bloom_sigma(2560), 6); self.assertEqual(A.bloom_sigma(1920), 4.5)
        self.assertNotIn('sigma=24', g)

    def test_vignette_only_for_tint_check(self):
        self.assertIn('vignette=PI/9', A.grade_graph(2560))
        self.assertNotIn('vignette', A.grade_graph(2560, vignette=False))
        self.assertNotIn('vignette', A.final_graph((1440, 2560), outputs=('graded',), vignette=False)[0])

    def test_cas_cap(self):
        self.assertIn('cas=strength=0.35', A.grade_graph(2560))
        A.grade_graph(2560, cas=.5)
        with self.assertRaises(ValueError): A.grade_graph(2560, cas=.6)

    def test_order_upscale_grade_captions(self):
        g, labels = A.final_graph((1080, 1920), 'c.ass', outputs=('master', 'proxy'))
        self.assertEqual(labels, ['master', 'proxy'])
        self.assertLess(g.index('scale=1440:2560:flags=lanczos'), g.index('format=gbrp'))   # fallback: upscale BEFORE the grade
        m = g.split(';[s0]')[1]; p = g.split(';[s1]')[1]
        self.assertTrue(m.startswith('ass=c.ass'))                                         # captions after the grade, at 1440
        self.assertLess(p.index('scale=1080:1920'), p.index('ass='))                       # proxy: downscale, then captions at 1080
        self.assertIn('out_color_matrix=bt709', m)
        g2, _ = A.final_graph((1440, 2560), 'c.ass')
        self.assertNotIn('scale=1440:2560', g2)                                           # native: no upscale
        with self.assertRaises(ValueError): A.final_graph((720, 1280))

    def test_qc_reference_offset_and_graded_branch(self):
        g, labels = A.final_graph((1440, 2560), 'c.ass', offset_frames=600, outputs=('master', 'graded'), fmt='yuv444p')
        self.assertTrue(g.startswith('[0:v]setpts=PTS+600/(30*TB),'))
        self.assertNotIn('ass=', g.split(';[s1]')[1])                                     # graded branch has no captions

    def test_crf_floor_steps(self):
        self.assertIsNone(A.next_crf(14, 17000))
        self.assertEqual(A.next_crf(14, 12000), 12)
        self.assertEqual(A.next_crf(12, 15999), 10)
        self.assertIsNone(A.next_crf(10, 9000))                                           # floor not met but no step left: stop at 10
        self.assertIsNone(A.next_proxy_crf(18, 44.9)); self.assertEqual(A.next_proxy_crf(18, 50), 20); self.assertIsNone(A.next_proxy_crf(22, 60))

    def test_master_args(self):
        a = ' '.join(A.master_encode_args(14))
        for s in ('-preset slow', '-tune animation', '-crf 14', '-colorspace bt709', '-color_trc bt709', '-g 15', '-keyint_min 15', '-sc_threshold 0', '-bf 2', '-b:a 320k', '-ar 48000', '+faststart'):
            self.assertIn(s, a)
        self.assertEqual(A.TARGET_TP, -1.5)


class Metrics(unittest.TestCase):
    def setUp(self):
        r = np.random.default_rng(1); self.img = (r.random((120, 90)) * 255).astype(np.uint8)

    def test_ssim_psnr(self):
        self.assertAlmostEqual(Q.ssim(self.img, self.img), 1.0, places=6)
        self.assertEqual(Q.psnr(self.img, self.img), float('inf'))
        noisy = np.clip(self.img.astype(int) + 8, 0, 255).astype(np.uint8)
        self.assertLess(Q.psnr(self.img, noisy), 40); self.assertLess(Q.ssim(self.img, noisy), 1)

    def test_laplacian_drops_with_blur(self):
        blurred = Q.box(self.img.astype(float), 3)
        self.assertLess(Q.laplacian_mean(blurred), Q.laplacian_mean(self.img[1:-1, 1:-1]) * .5)

    def test_colour(self):
        grey = np.full((40, 40, 3), [140, 145, 160], np.uint8)
        self.assertTrue(Q.stone_mask(grey, centre=1).all())
        self.assertFalse(Q.stone_mask(np.full((40, 40, 3), [200, 60, 60], np.uint8), centre=1).any())
        self.assertAlmostEqual(Q.delta_e(np.tile(grey, (20, 20, 1)), np.tile(grey, (20, 20, 1)), np.ones((800, 800), bool)), 0)
        tinted = np.tile(np.full((40, 40, 3), [130, 160, 150], np.uint8), (20, 20, 1))
        self.assertGreater(Q.delta_e(np.tile(grey, (20, 20, 1)), tinted, np.ones((800, 800), bool)), 4)
        y = np.full((4, 4), 235, np.uint8); u = v = np.full((4, 4), 128, np.uint8)
        self.assertTrue((Q.yuv444_to_rgb(y, u, v) == 255).all())

    def test_pick_frames(self):
        shots = [{'id': f'S{i}', 't': i * 2.0, 'dur': 2.0, 'speed': i % 7} for i in range(50)]
        p = Q.pick_frames(shots, 3000)
        self.assertEqual(len(p), 12); self.assertEqual(len({f for f, _ in p}), 12)
        self.assertEqual(sum(1 for _, w in p if w.startswith('fast')), 6)

    def test_evaluate(self):
        good = {'width': 1440, 'height': 2560, 'fps': '30/1', 'pix_fmt': 'yuv420p', 'color': ['bt709', 'bt709', 'bt709', 'tv'], 'audio_codec': 'aac',
                'video_kbps': 20000, 'lufs': -14.1, 'true_peak': -1.3, 'frames': [{'frame': i, 'ssim': .99, 'psnr': 44, 'sharp_ratio': 1.02, 'delta_e': 2.0} for i in range(4)]}
        self.assertEqual(Q.evaluate(good), [])
        bad = {**good, 'video_kbps': 3600, 'true_peak': -.7, 'width': 1080, 'height': 1920,
               'frames': good['frames'][:3] + [{'frame': 5, 'ssim': .97, 'psnr': 38, 'sharp_ratio': .8, 'delta_e': 6}]}
        f = Q.evaluate(bad)
        self.assertEqual(len(f), 7)
        self.assertEqual(Q.evaluate({**good, 'width': 1080, 'height': 1920}, fallback=True), [])

    def test_tint_check_needs_real_stone(self):
        px = 1440 * 2560
        fr = lambda i, de, n: {'frame': i, 'ssim': .99, 'psnr': 45, 'sharp_ratio': 1.2, 'delta_e': de, 'stone_px': n}
        base = {'width': 1440, 'height': 2560, 'fps': '30/1', 'pix_fmt': 'yuv420p', 'color': ['bt709', 'bt709', 'bt709', 'tv'], 'audio_codec': 'aac',
                'video_kbps': 20000, 'lufs': -14, 'true_peak': -1.5}
        big = [fr(i, 2.0, px // 10) for i in range(4)]
        self.assertEqual(Q.evaluate({**base, 'frames': big + [fr(9, 6.0, 1500)]}), [])           # stray pixels in a dark frame: not a stone
        self.assertEqual(len(Q.evaluate({**base, 'frames': big + [fr(9, 6.0, px // 50)]})), 1)  # a real stone area that shifted: fail
        self.assertEqual(len(Q.evaluate({**base, 'frames': big[:3]})), 1)                       # too few stone frames: cannot pass vacuously


if __name__ == '__main__':
    unittest.main()
